const fs = require('fs');
const path = require('path');

const files = [
  'screens/dashboard/DjDashboardPage.js',
  'screens/dashboard/BookerDashboardPage.js',
  'screens/dashboard/VenueDashboardPage.js',
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Alert.alert('title', 'message') -> showError('message')
  content = content.replace(
    /Alert\.alert\(\s*['"](?:Erreur|Error|Permission requise|Permission required|Accès limité détecté|Limited Access Detected)['"],\s*([^)]+)\s*\)/g,
    (match, message) => {
      modified = true;
      return `showError(${message})`;
    }
  );

  // Pattern 2: Alert.alert('title', 'message', [{...}]) -> showSuccess('message') ou showError('message')
  content = content.replace(
    /Alert\.alert\(\s*['"](?:Succès|Success|Invitation acceptée|Invitation accepted|Invitation refusée|Invitation rejected|Note enregistrée|Rating saved|Titre mis à jour|Title updated|Média supprimé|Media deleted)['"],\s*([^,]+)(?:,\s*\[[^\]]+\])?\s*\)/g,
    (match, message) => {
      modified = true;
      return `showSuccess(${message})`;
    }
  );

  // Pattern 3: Alert.alert avec confirmation (garder pour les actions destructives)
  // On garde les Alert.alert avec des callbacks onPress pour les confirmations

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} modifié`);
  } else {
    console.log(`ℹ️  ${file} - aucun changement`);
  }
});

console.log('\n✅ Remplacement terminé!');
