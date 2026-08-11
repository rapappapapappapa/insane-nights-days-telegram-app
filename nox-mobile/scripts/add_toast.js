/**
 * Script pour ajouter Toast à un fichier
 * Usage: node scripts/add_toast.js <fichier>
 * 
 * Ce script ajoute automatiquement:
 * 1. Les imports Toast et useToast
 * 2. L'initialisation du hook useToast
 * 3. Remplace les Alert.alert par showError/showSuccess
 * 4. Ajoute le composant Toast dans le JSX
 * 5. Supprime l'import Alert si plus utilisé
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/add_toast.js <fichier>');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter les imports Toast et useToast si pas déjà présents
if (!content.includes("import Toast from")) {
  // Trouver la ligne d'import des contexts
  const contextImportMatch = content.match(/import.*from ['"]\.\.\/contexts\/[^'"]+['"];?\n/);
  if (contextImportMatch) {
    const insertPos = content.indexOf(contextImportMatch[0]) + contextImportMatch[0].length;
    content = content.slice(0, insertPos) + 
      "import Toast from '../components/Toast';\n" +
      "import { useToast } from '../hooks/useToast';\n" +
      content.slice(insertPos);
  }
}

// 2. Ajouter l'initialisation du hook useToast
if (!content.includes("useToast()")) {
  const functionMatch = content.match(/export default function \w+\(\) \{[\s\S]*?const \{ language/);
  if (functionMatch) {
    const hookInit = "  const { toast, showError, showSuccess, hideToast } = useToast();\n";
    const insertPos = content.indexOf(functionMatch[0]) + functionMatch[0].indexOf('const { language');
    content = content.slice(0, insertPos) + hookInit + content.slice(insertPos);
  }
}

// 3. Remplacer Alert.alert par showError/showSuccess
// Pattern pour Alert.alert avec titre et message
content = content.replace(
  /Alert\.alert\(\s*language === 'fr' \? '[^']+' : '[^']+',\s*language === 'fr' \? '([^']+)' : '([^']+)',\s*\)/g,
  (match, frMsg, enMsg) => {
    // Déterminer si c'est une erreur ou un succès basé sur le contexte
    const isError = match.toLowerCase().includes('erreur') || match.toLowerCase().includes('error');
    return isError 
      ? `showError(language === 'fr' ? '${frMsg}' : '${enMsg}')`
      : `showSuccess(language === 'fr' ? '${frMsg}' : '${enMsg}')`;
  }
);

// Pattern pour Alert.alert avec callback
content = content.replace(
  /Alert\.alert\([^,]+,\s*[^,]+,\s*\[[^\]]+\]\)/gs,
  (match) => {
    // Extraire le message
    const msgMatch = match.match(/language === 'fr' \? '([^']+)' : '([^']+)'/);
    if (msgMatch) {
      const isSuccess = match.toLowerCase().includes('succès') || match.toLowerCase().includes('success');
      return isSuccess 
        ? `showSuccess(language === 'fr' ? '${msgMatch[1]}' : '${msgMatch[2]}'); setTimeout(() => { const { screen, params } = resolvePostAuthNavigation(result.user, nextScreen); navigate(screen, params); }, 1500)`
        : `showError(language === 'fr' ? '${msgMatch[1]}' : '${msgMatch[2]}')`;
    }
    return match;
  }
);

// 4. Ajouter le composant Toast dans le JSX (avant la fermeture du composant principal)
if (!content.includes('<Toast')) {
  const closingTagMatch = content.match(/(\s*<\/\w+>\s*<\/\w+>\s*\);\s*}\s*)$/);
  if (closingTagMatch) {
    const toastComponent = `\n      {/* Toast pour les notifications */}\n      <Toast\n        message={toast.message}\n        type={toast.type}\n        visible={toast.visible}\n        onHide={hideToast}\n      />`;
    const insertPos = content.length - closingTagMatch[0].length;
    content = content.slice(0, insertPos) + toastComponent + content.slice(insertPos);
  }
}

// 5. Supprimer l'import Alert si plus utilisé
if (!content.includes('Alert.alert') && content.includes("import {") && content.includes('Alert,')) {
  content = content.replace(/,\s*Alert\s*,/g, ',');
  content = content.replace(/Alert\s*,/g, '');
  content = content.replace(/,\s*Alert/g, '');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`✅ Toast ajouté à ${filePath}`);
