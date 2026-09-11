const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createGasEnvironment } = require('../../test/gas-mock.js');

const env = createGasEnvironment();
env.install(global);

const deployDir = path.resolve(__dirname, '../../apps-script-deploy');
const files = [
  '00_Config.js',
  '01_Hashing.js',
  '02_ControlSheet.js',
  '03_StressTest.js',
  '04_TableTemplate.js',
  '05_InteractiveOps.js',
  '06_UiMenu.js'
];

console.log('--- Loading apps-script-deploy modular files ---');
files.forEach(f => {
  const content = fs.readFileSync(path.join(deployDir, f), 'utf8');
  vm.runInThisContext(content);
  console.log('Loaded: ' + f);
});

console.log('\n--- Verifying mathematical formulas & constants ---');
assert.strictEqual(typeof KNUTH_A, 'number', 'KNUTH_A defined');
const expectedA = (Math.sqrt(5) - 1) / 2;
assert(Math.abs(KNUTH_A - expectedA) < 1e-12, 'KNUTH_A matches golden ratio constant');

const testM = 60;
for (let i = 0; i < 1000; i++) {
  const h = knuthMultiplicativeHash(i * 12345, testM);
  assert(Number.isInteger(h), 'Hash is integer');
  assert(h >= 0 && h < testM, 'Hash in [0, M-1]');
}
console.log('knuthMultiplicativeHash: PASS (1000 trials in range [0, 59])');

// Verify Pearson chi^2 formula
const freqs = [5, 5, 5, 5, 5]; // N=25, M=5, mean=5 -> chi^2 = 0
const statsUniform = computeUniformityStatistics(freqs, 25, 5);
assert.strictEqual(statsUniform.chiSquare, 0, 'Uniform chi^2 is 0');

// freqs = [10, 0, 5, 5, 5], mean=5 -> ((10-5)^2 + (0-5)^2)/5 = (25+25)/5 = 10
const statsNonUniform = computeUniformityStatistics([10, 0, 5, 5, 5], 25, 5);
assert.strictEqual(statsNonUniform.chiSquare, 10, 'Chi-square calculation matches Pearson formula exactly');
console.log('computeUniformityStatistics: PASS (Pearson chi^2 exact formula)');

// Verify dynamic code execution via new Function
const dynamicCodeArrow = 'val => parseInt(String(val).replace(/\\D/g, ""), 10)';
const rArrow = evaluateNumKey('23-456-78', dynamicCodeArrow);
assert.strictEqual(rArrow, 2345678, 'Arrow function executed dynamically');

const dynamicCodeCustom = 'val => 99999';
const rCustom = evaluateNumKey('anything', dynamicCodeCustom);
assert.strictEqual(rCustom, 99999, 'Custom dynamic function executed');

const dynamicCodeBroken = 'broken syntax ???';
const rBroken = evaluateNumKey('12-345-67', dynamicCodeBroken);
assert.strictEqual(rBroken, 1234567, 'Fallback safely extracts digits');
console.log('evaluateNumKey: PASS (Dynamic execution via new Function + safe fallback)');

console.log('\n--- Verifying setupControlSheet() ---');
setupControlSheet();
const ss = SpreadsheetApp.getActiveSpreadsheet();
const controlSheet = ss.getSheetByName('Панель_Управления');
assert.ok(controlSheet, 'Панель_Управления exists');
assert.strictEqual(controlSheet.getRange('J3').getValue(), 60, 'M = 60');
assert.strictEqual(controlSheet.getRange('J4').getValue(), 1, 'step = 1');
assert.strictEqual(controlSheet.getRange('J5').getValue(), 60, 'fallback = 60');
assert.strictEqual(controlSheet.getRange('J6').getValue(), 'Открытая адресация', 'method default');
assert.strictEqual(controlSheet.getRange('J7').getValue(), 30, 'N = 30');
console.log('setupControlSheet: PASS');

console.log('\n--- Verifying runStressTest() ---');
runStressTest();
assert.strictEqual(controlSheet.getCharts().length, 1, 'EmbeddedChart created');
assert.strictEqual(controlSheet.getCharts()[0].getChartType(), 'COLUMN', 'Chart is COLUMN type');
console.log('runStressTest: PASS');

console.log('\n--- Verifying buildHashTableFromTemplate() ---');
const hashSheet = buildHashTableFromTemplate();
assert.ok(hashSheet, 'Hash table sheet created');
assert.strictEqual(hashSheet.getName(), 'Хеш_Таблица_Линейное_M60');
assert.ok(hashSheet.getFilter() !== null, 'Native filter active');
console.log('buildHashTableFromTemplate: PASS');

console.log('\n--- Verifying insertRecordInteractive & deleteRecordInteractive ---');
const ui = SpreadsheetApp.getUi();
ui.queuePromptResponse({ button: ui.Button.OK, text: '77-888-99' });
ui.queuePromptResponse({ button: ui.Button.OK, text: 'Тестовый Пользователь' });
insertRecordInteractive();
console.log('insertRecordInteractive: PASS');

ui.queuePromptResponse({ button: ui.Button.OK, text: '77-888-99' });
deleteRecordInteractive();
console.log('deleteRecordInteractive (tombstone): PASS');

console.log('\n=============================================');
console.log('ALL MODULAR APPS-SCRIPT-DEPLOY VERIFICATIONS PASSED!');
console.log('=============================================');
