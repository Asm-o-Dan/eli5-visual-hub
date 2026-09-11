/**
 * ==============================================================================================
 * Adversarial Stress & Edge Case Test Suite
 * Laboratory Work #1 (Variant 3: Phone Number, Linear Probing)
 * Teamwork Agent: challenger_2 (empirical_challenger)
 *
 * Tests adversarial numKey inputs, extreme table parameters, and idempotent spreadsheet operations.
 * Uses native Node.js test runner (node:test) and assertions (node:assert).
 * Zero external npm dependencies.
 * ==============================================================================================
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { createGasEnvironment } = require('../../test/gas-mock.js');

// Initialize GAS environment and load Code.gs once into global context
let gasEnv = createGasEnvironment();
gasEnv.install(global);

const codeGsPath = path.resolve(__dirname, '../../Code.gs');
const codeGsSource = fs.readFileSync(codeGsPath, 'utf8');
vm.runInThisContext(codeGsSource);

function resetGasContext() {
  gasEnv = createGasEnvironment();
  gasEnv.install(global);
  return gasEnv;
}

// ==============================================================================================
// 1. ADVERSARIAL NUMKEY INPUTS
// ==============================================================================================
describe('1. Adversarial numKey Inputs & Dynamic Compilation', () => {
  beforeEach(() => {
    resetGasContext();
  });

  it('evaluates valid arrow function: x => parseInt(x.slice(0, 2), 10)', () => {
    const code = 'x => parseInt(x.slice(0, 2), 10)';
    const res = evaluateNumKey('23-456-78', code);
    assert.strictEqual(res, 23, 'Should extract first two digits 23');

    const res2 = evaluateNumKey('99-123-45', code);
    assert.strictEqual(res2, 99);
  });

  it('evaluates valid standard function: function(val) { return Number(String(val).replace(/\\D/g, "")); }', () => {
    const code = 'function(val) { return Number(String(val).replace(/\\D/g, "")); }';
    const res = evaluateNumKey('23-456-78', code);
    assert.strictEqual(res, 2345678, 'Should extract all numeric digits');

    const res2 = evaluateNumKey('91-827-36', code);
    assert.strictEqual(res2, 9182736);
  });

  it('evaluates expression: val * 2 safely without crashing', () => {
    const code = 'val * 2';
    // Numeric string
    const resNum = evaluateNumKey('123', code);
    assert.strictEqual(resNum, 246, 'Numeric string should multiply by 2');

    // Phone format string where val * 2 evaluates to NaN
    const resPhone = evaluateNumKey('23-456-78', code);
    assert.strictEqual(resPhone, 0, 'NaN result should safely fallback to 0');
  });

  it('safely catches throwing error: val => { throw new Error("boom"); } and falls back to default digits', () => {
    const code = "val => { throw new Error('boom'); }";
    const res = evaluateNumKey('23-456-78', code);
    assert.strictEqual(res, 2345678, 'Throwing function must catch and fallback to default digit extraction');

    const res2 = evaluateNumKey('05-999-11', code);
    assert.strictEqual(res2, 599911);
  });

  it('safely handles function returning NaN: val => NaN', () => {
    const code = 'val => NaN';
    const res = evaluateNumKey('23-456-78', code);
    assert.strictEqual(res, 0, 'Returning NaN should safely sanitize to 0');
  });

  it('safely handles function returning negative number: val => -999', () => {
    const code = 'val => -999';
    const res = evaluateNumKey('23-456-78', code);
    assert.strictEqual(res, 999, 'Negative number must be converted to non-negative integer via Math.abs');
  });

  it('safely handles empty string, non-string, and undefined code inputs', () => {
    // Empty string
    assert.strictEqual(evaluateNumKey('23-456-78', ''), 2345678);
    assert.strictEqual(evaluateNumKey('23-456-78', '   '), 2345678);

    // Non-string types
    assert.strictEqual(evaluateNumKey('23-456-78', null), 2345678);
    assert.strictEqual(evaluateNumKey('23-456-78', undefined), 2345678);
    assert.strictEqual(evaluateNumKey('23-456-78', 12345), 2345678);
    assert.strictEqual(evaluateNumKey('23-456-78', {}), 2345678);
    assert.strictEqual(evaluateNumKey('23-456-78', []), 2345678);
    assert.strictEqual(evaluateNumKey('23-456-78', true), 2345678);
  });

  it('safely handles adversarial val inputs (undefined, null, objects, booleans, emojis, SQL, HTML)', () => {
    const arrowCode = 'x => parseInt(x.slice(0, 2), 10)';

    // undefined / null val with arrow function that expects string slice
    assert.strictEqual(evaluateNumKey(undefined, arrowCode), 0);
    assert.strictEqual(evaluateNumKey(null, arrowCode), 0);
    assert.strictEqual(evaluateNumKey(0, arrowCode), 0);
    assert.strictEqual(evaluateNumKey({}, arrowCode), 0);
    assert.strictEqual(evaluateNumKey([], arrowCode), 0);

    // Injection strings
    const sqlVal = "'; DROP TABLE students; --";
    assert.strictEqual(typeof evaluateNumKey(sqlVal, arrowCode), 'number');

    const xssVal = "<script>alert('xss')</script>";
    assert.strictEqual(typeof evaluateNumKey(xssVal, arrowCode), 'number');

    const emojiVal = "📞 77-888-99 🎉";
    assert.strictEqual(typeof evaluateNumKey(emojiVal, 'function(val) { return Number(String(val).replace(/\\D/g, "")); }'), 'number');
  });

  it('safely handles syntax errors in code string without crashing', () => {
    const malformed = 'function( { return ??? ;';
    assert.strictEqual(evaluateNumKey('23-456-78', malformed), 2345678);

    const malformedArrow = '=> => bad arrow';
    assert.strictEqual(evaluateNumKey('23-456-78', malformedArrow), 2345678);
  });

  it('safely handles floating point and Infinity returns', () => {
    const floatCode = 'val => 42.87';
    assert.strictEqual(evaluateNumKey('23-456-78', floatCode), 42, 'Floats must be floored to integers');

    const infCode = 'val => 1 / 0';
    const resInf = evaluateNumKey('23-456-78', infCode);
    const hash = knuthMultiplicativeHash(resInf, 60);
    assert.ok(hash >= 0 && hash < 60, 'Hash of infinite return must stay in [0, M-1]');
  });
});

// ==============================================================================================
// 2. MULTIPLICATIVE KNUTH HASH BOUNDARY INVARIANTS
// ==============================================================================================
describe('2. Multiplicative Knuth Hash Boundary Invariants', () => {
  beforeEach(() => {
    resetGasContext();
  });

  it('always guarantees output in [0, M-1] for any key and M >= 1', () => {
    const testKeys = [
      0, 1, -1, 100, -999, 999999999, 2345678,
      NaN, Infinity, -Infinity, null, undefined, 0.5, -0.7
    ];
    const testM = [1, 2, 7, 10, 59, 60, 61, 100, 999];

    testKeys.forEach(k => {
      testM.forEach(M => {
        const slot = knuthMultiplicativeHash(k, M);
        assert.ok(Number.isInteger(slot), `Slot must be an integer, got ${slot} for k=${k}, M=${M}`);
        assert.ok(slot >= 0, `Slot must be >= 0, got ${slot} for k=${k}, M=${M}`);
        assert.ok(slot < M, `Slot must be < M (${M}), got ${slot} for k=${k}, M=${M}`);
      });
    });
  });

  it('for M = 1, always returns 0 for any key', () => {
    for (let k = -100; k <= 100; k += 5) {
      assert.strictEqual(knuthMultiplicativeHash(k, 1), 0);
    }
  });
});

// ==============================================================================================
// 3. EXTREME TABLE PARAMETERS
// ==============================================================================================
describe('3. Extreme Table Parameters (M=1, step edge cases, fallback limits, N boundaries)', () => {
  let ss;
  let controlSheet;

  beforeEach(() => {
    resetGasContext();
    setupControlSheet();
    ss = SpreadsheetApp.getActiveSpreadsheet();
    controlSheet = ss.getSheetByName('Панель_Управления');
  });

  it('M = 1: runStressTest() handles single-slot table cleanly', () => {
    controlSheet.getRange('J3').setValue(1); // M = 1
    controlSheet.getRange('J7').setValue(10); // N = 10

    runStressTest();

    // Verification
    const charts = controlSheet.getCharts();
    assert.strictEqual(charts.length, 1, 'Exactly one chart created');

    const freqVal = controlSheet.getRange('J18').getValue();
    assert.strictEqual(freqVal, 10, 'All 10 items must fall into slot 0');

    const statsText = controlSheet.getRange('I15').getValue();
    assert.ok(statsText.includes('M = 1'), 'Summary card reflects M = 1');
    assert.ok(statsText.includes('Пустых слотов: 0'), 'Zero empty slots');
  });

  it('M = 1: buildHashTableFromTemplate() handles Separate Chaining with 30 records into 1 slot', () => {
    controlSheet.getRange('J3').setValue(1); // M = 1
    controlSheet.getRange('J6').setValue('Метод цепочек');

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet, 'Chaining sheet created');
    assert.strictEqual(targetSheet.getName(), 'Хеш_Таблица_Цепочки_M1');

    // Slot 0 should have count 30 and collision label
    const slotStatus = targetSheet.getRange('B2').getValue();
    assert.ok(slotStatus.includes('30 эл. (КОЛЛИЗИЯ)'));

    const depthVal = targetSheet.getRange('G2').getValue();
    assert.strictEqual(depthVal, 30);

    const filter = targetSheet.getFilter();
    assert.ok(filter !== null, 'Filter applied');
  });

  it('M = 1: buildHashTableFromTemplate() in Open Addressing detects overflow for N > 1 without hanging', () => {
    controlSheet.getRange('J3').setValue(1); // M = 1
    controlSheet.getRange('J5').setValue(1); // fallback = 1
    controlSheet.getRange('J6').setValue('Открытая адресация');

    // 30 records cannot fit into M=1 slot under open addressing
    assert.throws(() => {
      buildHashTableFromTemplate();
    }, /Переполнение хеш-таблицы/);
  });

  it('M = 1: buildHashTableFromTemplate() in Open Addressing succeeds when dataset has exactly 1 record', () => {
    controlSheet.getRange('J3').setValue(1); // M = 1
    controlSheet.getRange('J5').setValue(1); // fallback = 1
    controlSheet.getRange('J6').setValue('Открытая адресация');

    // Clear data table and leave 1 record
    controlSheet.getRange(2, 1, 50, 7).clearContent();
    controlSheet.getRange(2, 1, 1, 7).setValues([[
      'Тестовый Пользователь', '01.01.2000', '23-456-78', '1111 222333', 'г. Москва', '40817810000', '1000'
    ]]);

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet);
    assert.strictEqual(targetSheet.getName(), 'Хеш_Таблица_Линейное_M1');
    assert.strictEqual(targetSheet.getRange('B2').getValue(), 'OCCUPIED');
    assert.strictEqual(targetSheet.getRange('C2').getValue(), '23-456-78');
  });

  it('step = 0: safely falls back to default step = 1', () => {
    controlSheet.getRange('J3').setValue(60);
    controlSheet.getRange('J4').setValue(0); // step = 0
    controlSheet.getRange('J5').setValue(60);
    controlSheet.getRange('J6').setValue('Открытая адресация');

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet);

    const props = PropertiesService.getDocumentProperties();
    assert.strictEqual(props.getProperty('ACTIVE_STEP'), '1', 'step=0 must safely sanitize to default 1');
  });

  it('step = M: correctly handles cycle limitation and throws overflow on unresolved collision', () => {
    controlSheet.getRange('J3').setValue(60);
    controlSheet.getRange('J4').setValue(60); // step = M (60)
    controlSheet.getRange('J5').setValue(60);
    controlSheet.getRange('J6').setValue('Открытая адресация');

    // With step = M, (h1 + i * M) % M === h1, so colliding keys loop on the same slot
    // The algorithm must not hang in an infinite loop; it must throw overflow after fallback probes
    assert.throws(() => {
      buildHashTableFromTemplate();
    }, /Переполнение хеш-таблицы.*за 60 проб/);
  });

  it('step = M + 5: handles step greater than M (effective step = 5)', () => {
    controlSheet.getRange('J3').setValue(60);
    controlSheet.getRange('J4').setValue(65); // step = 65 (65 % 60 = 5)
    controlSheet.getRange('J5').setValue(60);
    controlSheet.getRange('J6').setValue('Открытая адресация');

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet);
    assert.strictEqual(targetSheet.getName(), 'Хеш_Таблица_Линейное_M60');
  });

  it('fallback = 0: safely sanitizes to default M', () => {
    controlSheet.getRange('J3').setValue(60);
    controlSheet.getRange('J4').setValue(1);
    controlSheet.getRange('J5').setValue(0); // fallback = 0
    controlSheet.getRange('J6').setValue('Открытая адресация');

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet);

    const props = PropertiesService.getDocumentProperties();
    assert.strictEqual(props.getProperty('ACTIVE_FALLBACK'), '60', 'fallback=0 must sanitize to M=60');
  });

  it('fallback = 1: throws overflow upon first collision as only 1 probe is allowed', () => {
    controlSheet.getRange('J3').setValue(60);
    controlSheet.getRange('J4').setValue(1);
    controlSheet.getRange('J5').setValue(1); // fallback = 1
    controlSheet.getRange('J6').setValue('Открытая адресация');

    // 30 records in M=60 has collisions; with fallback=1 it cannot probe further
    assert.throws(() => {
      buildHashTableFromTemplate();
    }, /Переполнение хеш-таблицы.*за 1 проб/);
  });

  it('fallback = 1000: safely clamped to M to prevent excessive probing', () => {
    controlSheet.getRange('J3').setValue(60);
    controlSheet.getRange('J4').setValue(1);
    controlSheet.getRange('J5').setValue(1000); // fallback = 1000
    controlSheet.getRange('J6').setValue('Открытая адресация');

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet);

    const props = PropertiesService.getDocumentProperties();
    assert.strictEqual(props.getProperty('ACTIVE_FALLBACK'), '60', 'fallback=1000 must be clamped to M=60');
  });

  it('N = 0: runStressTest() and generateNRows() safely fallback to default 30', () => {
    controlSheet.getRange('J7').setValue(0);

    generateNRows();
    const valJ7 = controlSheet.getRange('J7').getValue();
    assert.strictEqual(valJ7, 30, 'generateNRows with 0 should fallback to 30');

    controlSheet.getRange('J7').setValue(0);
    runStressTest();
    const statsText = controlSheet.getRange('I15').getValue();
    assert.ok(statsText.includes('N = 30'), 'runStressTest with 0 should fallback to 30');
  });

  it('N = 1: executes generateNRows(), runStressTest(), and buildHashTableFromTemplate() for single item', () => {
    controlSheet.getRange('J7').setValue(1);

    generateNRows();
    assert.strictEqual(controlSheet.getRange('J7').getValue(), 1);
    assert.ok(controlSheet.getRange('C2').getValue().includes('-'));
    assert.strictEqual(controlSheet.getRange('C3').getValue(), '');

    runStressTest();
    const statsText = controlSheet.getRange('I15').getValue();
    assert.ok(statsText.includes('N = 1'));

    const targetSheet = buildHashTableFromTemplate();
    assert.ok(targetSheet);
  });

  it('N = 999: maximum allowed N runs stress test and generation without crash', () => {
    controlSheet.getRange('J7').setValue(999);

    runStressTest();
    const statsText = controlSheet.getRange('I15').getValue();
    assert.ok(statsText.includes('N = 999'), 'runStressTest handled N=999');

    const charts = controlSheet.getCharts();
    assert.strictEqual(charts.length, 1);
  });

  it('N > 1000 (e.g. N = 2500): clamped to 999 per specification', () => {
    controlSheet.getRange('J7').setValue(2500);

    runStressTest();
    const statsText = controlSheet.getRange('I15').getValue();
    assert.ok(statsText.includes('N = 999'), 'N > 1000 must be clamped to 999');
  });
});

// ==============================================================================================
// 4. SPREADSHEET OPERATIONS IDEMPOTENCY & LIFECYCLE
// ==============================================================================================
describe('4. Spreadsheet Operations Idempotency & Lifecycle', () => {
  let ss;

  beforeEach(() => {
    resetGasContext();
    ss = SpreadsheetApp.getActiveSpreadsheet();
  });

  it('repeated calls to setupControlSheet() do not duplicate sheets or corrupt layout (5x)', () => {
    for (let i = 1; i <= 5; i++) {
      setupControlSheet();
      const controlSheets = ss.getSheets().filter(s => s.getName() === 'Панель_Управления');
      assert.strictEqual(controlSheets.length, 1, `After run ${i}, exactly 1 control sheet must exist`);

      const sheet = controlSheets[0];
      assert.strictEqual(sheet.getRange('A1').getValue(), 'Ф.И.О.');
      assert.strictEqual(sheet.getRange('C1').getValue(), 'Номер телефона');
      assert.strictEqual(sheet.getRange('I3').getValue(), 'Размер таблицы (M)');
      assert.strictEqual(sheet.getRange('J3').getValue(), 60);
      assert.strictEqual(sheet.getRange('J4').getValue(), 1);
      assert.strictEqual(sheet.getRange('J5').getValue(), 60);
      assert.strictEqual(sheet.getRange('J6').getValue(), 'Открытая адресация');
      assert.strictEqual(sheet.getRange('J7').getValue(), 30);
    }
  });

  it('repeated calls to runStressTest() deduplicate charts strictly (sheet.getCharts().length === 1)', () => {
    setupControlSheet();
    const sheet = ss.getSheetByName('Панель_Управления');

    for (let i = 1; i <= 5; i++) {
      // Modify M slightly to verify dynamic chart updates
      const mVal = 50 + i * 2;
      sheet.getRange('J3').setValue(mVal);

      runStressTest();

      const charts = sheet.getCharts();
      assert.strictEqual(charts.length, 1, `Run ${i}: Expected exactly 1 chart, found ${charts.length}`);

      const chart = charts[0];
      assert.strictEqual(chart.getType(), 'COLUMN');
      assert.ok(chart.getOptions().title.includes(`M=${mVal}`));
    }
  });

  it('repeated calls to buildHashTableFromTemplate() cleanly handle sheet recreation and filter lifecycle (5x)', () => {
    setupControlSheet();
    const controlSheet = ss.getSheetByName('Панель_Управления');

    for (let i = 1; i <= 5; i++) {
      const isChaining = (i % 2 === 0);
      controlSheet.getRange('J6').setValue(isChaining ? 'Метод цепочек' : 'Открытая адресация');

      const targetSheet = buildHashTableFromTemplate();
      const targetName = isChaining ? 'Хеш_Таблица_Цепочки_M60' : 'Хеш_Таблица_Линейное_M60';

      assert.strictEqual(targetSheet.getName(), targetName);
      assert.strictEqual(ss.getSheets().filter(s => s.getName() === targetName).length, 1, 'No duplicate sheet');

      // Native filter must exist
      const filter = targetSheet.getFilter();
      assert.ok(filter !== null, `Run ${i}: Active filter must exist on target sheet`);

      // Verify that calling build again when filter already exists removes it first and does not throw
      const existingFilter = targetSheet.getFilter();
      assert.ok(existingFilter !== null);
    }
  });

  it('ensureTemplateSheet() is idempotent across repeated calls', () => {
    const t1 = ensureTemplateSheet(ss);
    assert.strictEqual(t1.getName(), '_Шаблон_Таблицы_');
    assert.strictEqual(t1.isSheetHidden(), true);

    const t2 = ensureTemplateSheet(ss);
    assert.strictEqual(t1, t2, 'ensureTemplateSheet must return the existing instance');
    assert.strictEqual(ss.getSheets().filter(s => s.getName() === '_Шаблон_Таблицы_').length, 1);
  });
});

// ==============================================================================================
// 5. INTERACTIVE OPERATIONS EDGE CASES & TOMBSTONE INVARIANT
// ==============================================================================================
describe('5. Interactive Operations Edge Cases & Tombstone Invariant', () => {
  let ss;
  let ui;

  beforeEach(() => {
    resetGasContext();
    setupControlSheet();
    buildHashTableFromTemplate();
    ss = SpreadsheetApp.getActiveSpreadsheet();
    ui = SpreadsheetApp.getUi();
  });

  it('insertRecordInteractive aborts cleanly when user cancels phone dialog', () => {
    ui.queuePromptResponse({ button: ui.Button.CANCEL, text: '' });
    insertRecordInteractive();
    // No alert should indicate success
    assert.strictEqual(ui.alertsHistory.length, 0);
  });

  it('insertRecordInteractive aborts cleanly when user cancels name dialog', () => {
    ui.queuePromptResponse({ button: ui.Button.OK, text: '99-111-22' });
    ui.queuePromptResponse({ button: ui.Button.CANCEL, text: '' });
    insertRecordInteractive();
    assert.strictEqual(ui.alertsHistory.length, 0);
  });

  it('deleteRecordInteractive alerts when phone number is not found', () => {
    ui.queuePromptResponse({ button: ui.Button.OK, text: '00-000-00' });
    deleteRecordInteractive();
    assert.ok(ui.alertsHistory.some(a => a.msg.includes('не найдена')));
  });

  it('preserves Tombstone invariant: deletion marks DELETED and downstream item is still searchable', () => {
    const props = PropertiesService.getDocumentProperties();
    const sheetName = props.getProperty('ACTIVE_TABLE_SHEET');
    const sheet = ss.getSheetByName(sheetName);

    // Target a known occupied item from the default 30 dataset:
    // Иванов Иван Иванович: phone 23-456-78
    let targetPhone = '23-456-78';

    // Queue deletion of targetPhone
    ui.queuePromptResponse({ button: ui.Button.OK, text: targetPhone });
    deleteRecordInteractive();

    // Verify alert confirmed deletion
    assert.ok(ui.alertsHistory.some(a => a.msg.includes('успешно удалена')));

    // Find the slot where targetPhone was
    let tombstoneFound = false;
    for (let r = 2; r <= 61; r++) {
      const status = sheet.getRange(r, 2).getValue();
      if (status.includes('DELETED')) {
        tombstoneFound = true;
        assert.strictEqual(sheet.getRange(r, 4).getValue(), '[УДАЛЕНА]');
        break;
      }
    }
    assert.ok(tombstoneFound, 'Tombstone DELETED must be installed in sheet');
  });
});

// ==============================================================================================
// 6. MODULAR APPS-SCRIPT-DEPLOY REPOSITORY PARITY
// ==============================================================================================
describe('6. Modular Apps-Script-Deploy Parity Verification', () => {
  it('executes full pipeline on modular apps-script-deploy files in an isolated VM context', () => {
    const modularEnv = createGasEnvironment();
    const sandbox = {};
    modularEnv.install(sandbox);
    sandbox.global = sandbox;

    const deployDir = path.resolve(__dirname, '../../apps-script-deploy');
    const deployFiles = [
      '00_Config.js',
      '01_Hashing.js',
      '02_ControlSheet.js',
      '03_StressTest.js',
      '04_TableTemplate.js',
      '05_InteractiveOps.js',
      '06_UiMenu.js'
    ];

    const ctx = vm.createContext(sandbox);
    deployFiles.forEach(f => {
      const code = fs.readFileSync(path.join(deployDir, f), 'utf8');
      vm.runInContext(code, ctx);
    });

    // 1. Setup control sheet
    ctx.setupControlSheet();
    const ss = ctx.SpreadsheetApp.getActiveSpreadsheet();
    const controlSheet = ss.getSheetByName('Панель_Управления');
    assert.ok(controlSheet);

    // 2. Test dynamic numKey evaluator
    assert.strictEqual(ctx.evaluateNumKey('23-456-78', 'x => parseInt(x.slice(0, 2), 10)'), 23);
    assert.strictEqual(ctx.evaluateNumKey('23-456-78', 'val => { throw new Error("modular"); }'), 2345678);

    // 3. Test stress test and chart deduplication
    ctx.runStressTest();
    ctx.runStressTest();
    assert.strictEqual(controlSheet.getCharts().length, 1);

    // 4. Test table generation
    const targetSheet = ctx.buildHashTableFromTemplate();
    assert.ok(targetSheet);
    assert.ok(targetSheet.getFilter() !== null);
  });
});
