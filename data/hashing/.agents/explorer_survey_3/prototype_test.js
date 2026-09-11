const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createGasEnvironment } = require('./gas_mock_prototype.js');

describe('Code.gs GAS Mock Prototype Verification', () => {
  it('loads Code.gs and executes loadDataset and hashing functions', () => {
    const env = createGasEnvironment();
    global.SpreadsheetApp = env.SpreadsheetApp;
    global.PropertiesService = env.PropertiesService;

    const codePath = path.resolve(__dirname, '../../Code.gs');
    const code = fs.readFileSync(codePath, 'utf-8');
    vm.runInThisContext(code);

    assert.strictEqual(typeof global.loadDataset, 'function');
    assert.strictEqual(typeof global.extractNumericKey, 'function');
    assert.strictEqual(typeof global.knuthMultiplicativeHash, 'function');
    assert.strictEqual(typeof global.buildOpenAddressingTable, 'function');

    // Run loadDataset
    global.loadDataset();
    const dsSheet = env._ss.getSheetByName('Датасет');
    assert.ok(dsSheet, 'Dataset sheet must exist');
    assert.strictEqual(dsSheet.getLastRow(), 31, 'Dataset has header + 30 rows');
    assert.strictEqual(dsSheet.getLastColumn(), 7, 'Dataset has 7 columns');

    // Test phone number numeric key extraction
    const phoneKey = global.extractNumericKey('23-456-78', 2);
    assert.strictEqual(phoneKey, 2345678, 'Phone 23-456-78 converted to integer');

    // Test Knuth multiplicative hash
    const h = global.knuthMultiplicativeHash(phoneKey, 60);
    assert.ok(h >= 0 && h < 60, `Hash ${h} must be within [0, 59]`);

    // Test Open Addressing table construction (Variant 3 = Phone linear probing)
    global.buildOpenAddressingTable(3);
    const openSheet = env._ss.getSheetByName('Открытая_Адресация_M60');
    assert.ok(openSheet, 'Open addressing sheet must exist');
    assert.strictEqual(openSheet.getLastRow(), 64, 'Header + 60 slots');

    // Check saved properties
    const activeVar = env.PropertiesService.getDocumentProperties().getProperty('ACTIVE_VARIANT');
    assert.strictEqual(activeVar, '3', 'DocumentProperties must record variant 3');
  });
});
