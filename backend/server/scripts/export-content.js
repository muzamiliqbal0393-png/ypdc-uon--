'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CANDIDATES = [
  path.join(__dirname, '..', '..', '..', 'frontend', 'js', 'site-content.js'),
  path.join(__dirname, '..', '..', '..', 'js', 'site-content.js'),
  path.join(__dirname, '..', '..', 'js', 'site-content.js')
];
const FILE = CANDIDATES.filter(function (p) { return fs.existsSync(p); })[0];
if (!FILE) {
  console.error('✗ js/site-content.js not found. Keep the frontend folder next to the backend.');
  process.exit(1);
}
const sandbox = { window: {}, globalThis: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(FILE, 'utf8'), sandbox, { filename: 'js/site-content.js' });

const content = sandbox.window.YPDC_CONTENT();
const OUT = path.join(__dirname, '..', 'data', 'site-content.json');
fs.writeFileSync(OUT, JSON.stringify(content, null, 2) + '\n');
console.log('site-content.json likh diya —', Object.keys(content).length, 'keys');
