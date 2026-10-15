const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../screens/dashboard/BookerDashboardPage.js');
const dest = path.join(__dirname, '../screens/dashboard/BookerDashboardPage.styles.js');

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const styleBody = lines.slice(3125).join('\n').replace(/^const styles = /, 'export const styles = ');
const out =
  "import { StyleSheet } from 'react-native';\n" +
  "import Colors from '../../constants/colors';\n\n" +
  styleBody;

fs.writeFileSync(dest, out);
console.log('Wrote', dest, 'lines:', lines.slice(3125).length);
