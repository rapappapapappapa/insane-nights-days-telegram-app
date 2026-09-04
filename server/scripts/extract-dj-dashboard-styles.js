const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..', '..', 'nox-mobile');
const pagePath = path.join(mobileRoot, 'screens', 'dashboard', 'DjDashboardPage.js');
const lines = fs.readFileSync(pagePath, 'utf8').split('\n');

const stylesBody = lines
  .slice(3392, 4750)
  .join('\n')
  .replace('const styles = StyleSheet.create(', 'export const styles = StyleSheet.create(');

const stylesHeader = `import { StyleSheet, Dimensions, Platform } from 'react-native';
import Colors from '../../constants/colors';

const { width } = Dimensions.get('window');
export const SIDEBAR_WIDTH = 280;

`;

fs.writeFileSync(
  path.join(mobileRoot, 'screens', 'dashboard', 'DjDashboardPage.styles.js'),
  stylesHeader + stylesBody + '\n',
);

fs.writeFileSync(
  path.join(mobileRoot, 'utils', 'djDashboardUtils.js'),
  `export function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\\s+/g, ' ').trim();
}
`,
);

let main = lines.slice(0, 3391).join('\n') + '\n';
main = main.replace(
  "function cleanText(s) {\n  if (!s) return '';\n  return String(s).replace(/\\s+/g, ' ').trim();\n}\n\nconst { width } = Dimensions.get('window');\nconst SIDEBAR_WIDTH = 280;\n",
  "import { cleanText } from '../../utils/djDashboardUtils';\nimport { styles, SIDEBAR_WIDTH } from './DjDashboardPage.styles';\n\n",
);

fs.writeFileSync(pagePath, main);
console.log('DjDashboardPage.js:', main.split('\n').length, 'lines');
