const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = require(path.join(root, 'nox-mobile', 'app.json'));
const eas = require(path.join(root, 'nox-mobile', 'eas.json'));
const legal = path.join(root, 'server', 'public', 'legal');
const pages = ['privacy.html', 'cgu.html', 'cgv.html', 'mentions.html', 'index.html'];
let err = 0;
const ok = (m) => console.log('OK', m);
const warn = (m) => console.log('WARN', m);
const fail = (m) => {
  console.log('FAIL', m);
  err = 1;
};
ok('Bundle iOS: ' + app.expo.ios.bundleIdentifier);
if (app.expo.ios.bundleIdentifier === 'com.insanenightsdays.mobile') {
  warn('Bundle TestFlight — passer a com.nox.mobile avant store public');
}
ok('Package Android: ' + app.expo.android.package);
ok('Version ' + app.expo.version + ' build ' + app.expo.ios.buildNumber);
['assets/icon.png', 'assets/splash-icon.png', 'assets/adaptive-icon.png'].forEach((f) => {
  const p = path.join(root, 'nox-mobile', f);
  fs.existsSync(p) ? ok(f) : warn('manquant ' + f);
});
eas.build?.production?.distribution === 'store'
  ? ok('EAS production=store')
  : fail('EAS production distribution');
eas.submit ? ok('eas submit configure') : fail('submit manquant');
pages.forEach((p) =>
  fs.existsSync(path.join(legal, p)) ? ok('/legal/' + p) : fail('manquant ' + p),
);
const idx = fs.readFileSync(path.join(root, 'server', 'index.js'), 'utf8');
idx.includes("app.use('/legal'") ? ok('route /legal') : fail('route /legal');
console.log(err ? 'RESULT FAIL' : 'RESULT OK');
process.exit(err);
