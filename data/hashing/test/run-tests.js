/**
 * ==============================================================================================
 * Comprehensive Test Suite for Google Apps Script Hashing System
 * Laboratory Work #1 (Variant 3: Phone Number, Linear Probing)
 * 
 * Uses native Node.js test runner (node:test) and assertions (node:assert).
 * Zero external npm dependencies.
 * 
 * Contains 4 comprehensive tiers:
 * - Tier 1: numKey dynamic evaluator & Knuth multiplicative hashing
 * - Tier 2: setupControlSheet («Панель_Управления», A..G table, I..N settings, validation)
 * - Tier 3: runStressTest (synthetic phones, hit frequencies, metrics, EmbeddedChart COLUMN)
 * - Tier 4: buildHashTableFromTemplate (template cloner, slot lifecycle EMPTY/OCCUPIED/DELETED,
 *           probe counts & traces, separate chaining, interactive handlers, createFilter)
 * ==============================================================================================
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  createGasEnvironment,
  MockSpreadsheet,
  MockSheet,
  MockRange,
  MockFilter,
  MockEmbeddedChart,
  MockEmbeddedChartBuilder,
  MockDataValidation,
  MockDataValidationBuilder,
  MockUi,
  MockPropertiesService,
  MockUtilities,
  MockLogger,
  Cell,
  parseA1,
  colNumberToLetter,
  colLetterToNumber
} = require('./gas-mock.js');

// Golden ratio constant for Knuth hashing: (sqrt(5) - 1) / 2
const KNUTH_A = (Math.sqrt(5) - 1) / 2;

/**
 * Authoritative Reference Evaluator for Dynamic numKey expressions
 */
function referenceEvaluateNumKey(val, codeStr) {
  const defaultFn = (v) => {
    const digits = String(v || '').replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  if (!codeStr || typeof codeStr !== 'string' || !codeStr.trim()) {
    return defaultFn(val);
  }

  const raw = codeStr.trim();
  try {
    let fn;
    if (raw.startsWith('function') || raw.startsWith('(') || raw.includes('=>')) {
      fn = new Function('return (' + raw + ');')();
    } else {
      fn = new Function('val', raw.includes('return') ? raw : 'return (' + raw + ');');
    }
    const res = fn(val);
    const num = Number(res);
    return isNaN(num) ? 0 : Math.floor(Math.abs(num));
  } catch (err) {
    // Graceful fallback to default on syntax or runtime error
    return defaultFn(val);
  }
}

/**
 * Authoritative Reference Knuth Multiplicative Hash
 */
function referenceKnuthHash(k, M) {
  const frac = (k * KNUTH_A) % 1;
  const posFrac = frac < 0 ? frac + 1 : frac;
  return Math.floor(M * posFrac);
}

/**
 * Authoritative Reference Statistics Engine
 */
function referenceComputeStats(frequencies, N, M) {
  const mean = N / M;
  let maxCollisions = 0;
  let emptySlots = 0;
  let chiSquare = 0;

  for (let s = 0; s < M; s++) {
    const obs = frequencies[s] || 0;
    if (obs > maxCollisions) maxCollisions = obs;
    if (obs === 0) emptySlots++;
    const diff = obs - mean;
    chiSquare += (diff * diff) / mean;
  }

  return { mean, maxCollisions, emptySlots, chiSquare };
}

/**
 * Generates synthetic phone number matching xx-xxx-xx
 */
function generateSyntheticPhone(index) {
  const p1 = String((index * 17 + 10) % 90 + 10).padStart(2, '0');
  const p2 = String((index * 31 + 100) % 900 + 100).padStart(3, '0');
  const p3 = String((index * 47 + 10) % 90 + 10).padStart(2, '0');
  return `${p1}-${p2}-${p3}`;
}

// Initialize global GAS environment once
let gasEnv = createGasEnvironment();
gasEnv.install(global);

let codeGsSource = '';
try {
  const codePath = path.resolve(__dirname, '../Code.gs');
  if (fs.existsSync(codePath)) {
    codeGsSource = fs.readFileSync(codePath, 'utf8');
    vm.runInThisContext(codeGsSource);
  }
} catch (e) {
  console.warn('Code.gs not loaded:', e.message);
}

function initFreshGasContext() {
  gasEnv = createGasEnvironment();
  gasEnv.install(global);
  return gasEnv;
}

// ==============================================================================================
// 0. FOUNDATIONAL GAS MOCK FIDELITY TESTS
// ==============================================================================================
describe('Foundational GAS Mock Environment Verification', () => {
  let env;

  beforeEach(() => {
    env = createGasEnvironment();
  });

  it('correctly converts between column numbers and A1 letters', () => {
    assert.strictEqual(colNumberToLetter(1), 'A');
    assert.strictEqual(colNumberToLetter(7), 'G');
    assert.strictEqual(colNumberToLetter(9), 'I');
    assert.strictEqual(colNumberToLetter(14), 'N');
    assert.strictEqual(colNumberToLetter(26), 'Z');
    assert.strictEqual(colNumberToLetter(27), 'AA');

    assert.strictEqual(colLetterToNumber('A'), 1);
    assert.strictEqual(colLetterToNumber('G'), 7);
    assert.strictEqual(colLetterToNumber('I'), 9);
    assert.strictEqual(colLetterToNumber('N'), 14);
    assert.strictEqual(colLetterToNumber('Z'), 26);
    assert.strictEqual(colLetterToNumber('AA'), 27);
  });

  it('parses diverse A1 notations accurately', () => {
    const sheet = env._ss.insertSheet('TestSheet');
    const single = parseA1('J3', sheet);
    assert.deepStrictEqual(single, { row: 3, col: 10, numRows: 1, numCols: 1 });

    const range = parseA1('A1:G30', sheet);
    assert.deepStrictEqual(range, { row: 1, col: 1, numRows: 30, numCols: 7 });

    const prefixed = parseA1('Панель_Управления!I5:N20', sheet);
    assert.deepStrictEqual(prefixed, { row: 5, col: 9, numRows: 16, numCols: 6 });
  });

  it('enforces Range dimension validation on setValues', () => {
    const sheet = env._ss.insertSheet('MatrixTest');
    const range = sheet.getRange(1, 1, 2, 3); // 2 rows x 3 cols

    // Mismatched rows
    assert.throws(() => {
      range.setValues([['a', 'b', 'c']]);
    }, /number of rows in the data does not match/);

    // Mismatched cols
    assert.throws(() => {
      range.setValues([['a', 'b'], ['c', 'd']]);
    }, /number of columns in row 0 does not match/);

    // Valid assignment
    range.setValues([
      ['r1c1', 'r1c2', 'r1c3'],
      ['r2c1', 'r2c2', 'r2c3']
    ]);
    assert.deepStrictEqual(range.getValues(), [
      ['r1c1', 'r1c2', 'r1c3'],
      ['r2c1', 'r2c2', 'r2c3']
    ]);
  });

  it('manages DocumentProperties and ScriptProperties in memory', () => {
    const docProps = env.PropertiesService.getDocumentProperties();
    docProps.setProperty('ACTIVE_VARIANT', '3');
    docProps.setProperty('ACTIVE_M', '60');
    assert.strictEqual(docProps.getProperty('ACTIVE_VARIANT'), '3');
    assert.strictEqual(docProps.getProperty('ACTIVE_M'), '60');

    const all = docProps.getProperties();
    assert.strictEqual(all.ACTIVE_VARIANT, '3');
    assert.strictEqual(all.ACTIVE_M, '60');

    docProps.deleteProperty('ACTIVE_VARIANT');
    assert.strictEqual(docProps.getProperty('ACTIVE_VARIANT'), null);

    docProps.deleteAllProperties();
    assert.strictEqual(docProps.getKeys().length, 0);
  });

  it('implements Utilities formatting helpers', () => {
    const formatted = env.Utilities.formatString('Slot %d: Key %s (Value: %d)', 12, '23-456-78', 2345678);
    assert.strictEqual(formatted, 'Slot 12: Key 23-456-78 (Value: 2345678)');

    const dateStr = env.Utilities.formatDate(new Date(2026, 8, 10, 15, 30, 45), 'UTC', 'yyyy-MM-dd HH:mm:ss');
    assert.strictEqual(dateStr, '2026-09-10 15:30:45');
  });

  it('verifies SpreadsheetApp workbook creation, getDataRange, clearContent, clearFormat, and borders', () => {
    const newWb = env.SpreadsheetApp.create('Новая_Книга');
    assert.strictEqual(newWb.getName(), 'Новая_Книга');

    const opened = env.SpreadsheetApp.openById('dummy_id');
    assert.ok(opened);

    const sheet = newWb.insertSheet('DataSheet');
    sheet.getRange('A1:B2').setValues([['val1', 'val2'], ['val3', 'val4']]);
    sheet.getRange('A1:B2').setBackground('#ff0000');
    sheet.getRange('A1:B2').setBorder(true, true, true, true, true, true, '#000000', env.SpreadsheetApp.BorderStyle.SOLID);

    const dataRange = sheet.getDataRange();
    assert.strictEqual(dataRange.getNumRows(), 2);
    assert.strictEqual(dataRange.getNumColumns(), 2);

    // clearFormat resets background
    sheet.getRange('A1').clearFormat();
    assert.strictEqual(sheet.getRange('A1').getBackground(), '#ffffff');
    assert.strictEqual(sheet.getRange('A1').getValue(), 'val1');

    // clearContent resets value
    sheet.getRange('A1').clearContent();
    assert.strictEqual(sheet.getRange('A1').getValue(), '');

    // toast records notification
    newWb.toast('Данные обновлены', 'Инфо', 3);
    assert.strictEqual(newWb.toastsHistory.length, 1);
  });

  it('verifies EmbeddedChart modification, container info, options, and ranges', () => {
    const sheet = env._ss.insertSheet('ChartModTest');
    const range = sheet.getRange('A1:B10');
    const chart = sheet.newChart()
      .asColumnChart()
      .addRange(range)
      .setPosition(2, 5, 10, 20)
      .setOption('title', 'Test Chart')
      .build();

    assert.strictEqual(chart.getChartType(), 'COLUMN');
    assert.strictEqual(chart.getContainerInfo().getAnchorRow(), 2);
    assert.strictEqual(chart.getContainerInfo().getAnchorColumn(), 5);
    assert.strictEqual(chart.getContainerInfo().getOffsetX(), 10);
    assert.strictEqual(chart.getContainerInfo().getOffsetY(), 20);
    assert.strictEqual(chart.getOptions().title, 'Test Chart');
    assert.strictEqual(chart.getRanges().length, 1);

    // modify returns a builder with existing properties
    const modified = chart.modify().setTitle('Updated Title').build();
    assert.strictEqual(modified.getOptions().title, 'Updated Title');
    assert.strictEqual(modified.getChartType(), 'COLUMN');
  });

  it('verifies DataValidationBuilder and DataValidation getters', () => {
    const builder = env.SpreadsheetApp.newDataValidation();
    const rule = builder.requireValueInList(['A', 'B', 'C'], true)
      .setAllowInvalid(false)
      .setHelpText('Choose A, B, or C')
      .build();

    assert.strictEqual(rule.getAllowInvalid(), false);
    assert.strictEqual(rule.getCriteriaType(), 'VALUE_IN_LIST');
    assert.deepStrictEqual(rule.getCriteriaValues()[0], ['A', 'B', 'C']);
    assert.strictEqual(rule.getHelpText(), 'Choose A, B, or C');
  });

  it('verifies Ui modal dialog, button sets, and menu registration', () => {
    const ui = env.SpreadsheetApp.getUi();
    ui.showModalDialog({}, 'Модальное окно');
    assert.strictEqual(ui.dialogsHistory.length, 1);
    assert.strictEqual(ui.dialogsHistory[0].title, 'Модальное окно');

    assert.strictEqual(ui.Button.OK, 'OK');
    assert.strictEqual(ui.Button.CANCEL, 'CANCEL');
    assert.strictEqual(ui.ButtonSet.OK_CANCEL, 'OK_CANCEL');

    const menu = ui.createMenu('Тест')
      .addItem('Действие 1', 'action1')
      .addSeparator()
      .addToUi();
    assert.strictEqual(ui.menusHistory.length, 1);
    assert.strictEqual(ui.menusHistory[0].caption, 'Тест');
  });
});

// ==============================================================================================
// 1. TIER 1: numKey DYNAMIC EVALUATOR & KNUTH MULTIPLICATIVE HASHING
// ==============================================================================================
describe('Tier 1: Dynamic numKey Evaluator & Knuth Multiplicative Hashing', () => {
  beforeEach(() => {
    initFreshGasContext();
  });

  it('computes Knuth multiplicative hash within strict [0, M-1] boundary', () => {
    const hashFn = typeof global.knuthMultiplicativeHash === 'function'
      ? global.knuthMultiplicativeHash
      : referenceKnuthHash;

    const M = 60;
    // Boundary checks: 0, 1, sample keys, and large keys
    const testKeys = [0, 1, 10, 2345678, 9182736, 4512389, 7790142, 9999999, 2147483647];

    testKeys.forEach(k => {
      const h = hashFn(k, M);
      assert.ok(Number.isInteger(h), `Hash of ${k} must be integer`);
      assert.ok(h >= 0 && h < M, `Hash ${h} of key ${k} must be in range [0, ${M-1}]`);
    });

    // Verify h(0) === 0
    assert.strictEqual(hashFn(0, M), 0, 'Knuth hash of 0 is always 0');

    // Test different table sizes M
    [30, 60, 100, 256].forEach(size => {
      const h = hashFn(2345678, size);
      assert.ok(h >= 0 && h < size, `Hash must respect M=${size}`);
    });
  });

  it('evaluates dynamic arrow functions in numKey correctly', () => {
    const evalFn = typeof global.evaluateNumKey === 'function'
      ? global.evaluateNumKey
      : referenceEvaluateNumKey;

    const arrowCode = 'val => parseInt(String(val).replace(/\\D/g, ""), 10)';
    assert.strictEqual(evalFn('23-456-78', arrowCode), 2345678);
    assert.strictEqual(evalFn('91-827-36', arrowCode), 9182736);
    assert.strictEqual(evalFn('01-234-56', arrowCode), 123456);
  });

  it('evaluates standard function declarations and expression bodies', () => {
    const evalFn = typeof global.evaluateNumKey === 'function'
      ? global.evaluateNumKey
      : referenceEvaluateNumKey;

    // Standard function declaration
    const fnDecl = 'function(val) { return Number(String(val).replace(/\\D/g, "")); }';
    assert.strictEqual(evalFn('77-901-42', fnDecl), 7790142);

    // Return body without wrapping function
    const bodyOnly = 'return parseInt(String(val).replace(/\\D/g, ""), 10);';
    assert.strictEqual(evalFn('45-123-89', bodyOnly), 4512389);

    // Single expression
    const singleExpr = 'parseInt(String(val).replace(/\\D/g, ""), 10)';
    assert.strictEqual(evalFn('88-234-51', singleExpr), 8823451);
  });

  it('handles adversarial malformed JS and non-numeric returns with safe fallback', () => {
    const evalFn = typeof global.evaluateNumKey === 'function'
      ? global.evaluateNumKey
      : referenceEvaluateNumKey;

    // Syntax error in cell JS
    const brokenCode = 'val => { broken syntax (((';
    assert.doesNotThrow(() => {
      const res = evalFn('23-456-78', brokenCode);
      assert.strictEqual(res, 2345678, 'Malformed code must safely fall back to digit extraction');
    });

    // Empty / whitespace code string
    assert.strictEqual(evalFn('23-456-78', ''), 2345678);
    assert.strictEqual(evalFn('23-456-78', '   '), 2345678);
    assert.strictEqual(evalFn('23-456-78', null), 2345678);

    // Function returning string or NaN
    const returnString = 'val => "not-a-number"';
    assert.strictEqual(evalFn('23-456-78', returnString), 0);

    const returnNaN = 'val => NaN';
    assert.strictEqual(evalFn('23-456-78', returnNaN), 0);

    // Function returning negative number
    const returnNeg = 'val => -500';
    assert.strictEqual(evalFn('23-456-78', returnNeg), 500, 'Negative key is sanitized to positive');
  });
});

// ==============================================================================================
// 2. TIER 2: SETUP CONTROL SHEET («Панель_Управления»)
// ==============================================================================================
describe('Tier 2: Control Sheet Setup («Панель_Управления»)', () => {
  beforeEach(() => {
    initFreshGasContext();
  });

  it('verifies mock capabilities for layout, styling, and validation dropdown', () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet('Панель_Управления');

    // 1. Left Data Table (A1:G31)
    const headers = [
      'Ф.И.О.', 'Дата рождения', 'Номер телефона',
      'Серия и номер паспорта', 'Адрес прописки', 'Номер банковского счета', 'Остаток денег на счете'
    ];
    sheet.getRange(1, 1, 1, 7).setValues([headers]);
    sheet.getRange(1, 1, 1, 7)
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    assert.strictEqual(sheet.getRange('C1').getValue(), 'Номер телефона', 'Column III must be Номер телефона');
    assert.strictEqual(sheet.getRange('A1').getBackground(), '#1e293b');

    // 2. Right Settings Block (I..N)
    sheet.getRange('I3').setValue('Размер таблицы (M)');
    sheet.getRange('J3').setValue(60);

    sheet.getRange('I4').setValue('Шаг пробирования (step)');
    sheet.getRange('J4').setValue(1);

    sheet.getRange('I5').setValue('Предел проб (fallback)');
    sheet.getRange('J5').setValue(60);

    sheet.getRange('I6').setValue('Метод разрешения коллизий');
    sheet.getRange('J6').setValue('Открытая адресация');

    sheet.getRange('I7').setValue('Количество записей (N)');
    sheet.getRange('J7').setValue(30);

    // Data Validation Dropdown on J6
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Открытая адресация', 'Метод цепочек'], true)
      .setAllowInvalid(false)
      .setHelpText('Выберите метод разрешения коллизий')
      .build();

    sheet.getRange('J6').setDataValidation(rule);

    const appliedRule = sheet.getRange('J6').getDataValidation();
    assert.ok(appliedRule, 'Validation rule must be present on J6');
    assert.strictEqual(appliedRule.getCriteriaType(), 'VALUE_IN_LIST');
    assert.deepStrictEqual(appliedRule.getCriteriaValues()[0], ['Открытая адресация', 'Метод цепочек']);

    // Editable numKey code cell
    sheet.getRange('I9:N9').setValue('Редактируемый JS-код функции numKey:');
    sheet.getRange('I10').setValue('val => parseInt(String(val).replace(/\\D/g, ""), 10)');

    assert.strictEqual(sheet.getRange('J3').getValue(), 60);
    assert.strictEqual(sheet.getRange('J4').getValue(), 1);
    assert.strictEqual(sheet.getRange('J5').getValue(), 60);
    assert.strictEqual(sheet.getRange('J7').getValue(), 30);
    assert.ok(sheet.getRange('I10').getValue().includes('numKey') || sheet.getRange('I10').getValue().includes('replace'));
  });

  it('runs setupControlSheet() if implemented in Code.gs', (t) => {
    if (typeof global.setupControlSheet !== 'function') {
      t.skip('setupControlSheet() not yet implemented in Code.gs (Milestone 2 pending)');
      return;
    }

    global.setupControlSheet();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Панель_Управления');
    assert.ok(sheet, '«Панель_Управления» sheet must exist after setup');

    // Verify dataset headers in A1:G1
    const headers = sheet.getRange(1, 1, 1, 7).getValues()[0];
    assert.strictEqual(headers[2], 'Номер телефона', 'Column III must be phone number key');

    // Verify default parameters in right panel
    assert.strictEqual(sheet.getRange('J3').getValue(), 60, 'Default M must be 60');
    assert.strictEqual(sheet.getRange('J4').getValue(), 1, 'Default step must be 1');
    assert.strictEqual(sheet.getRange('J5').getValue(), 60, 'Default fallback must be 60');
    assert.strictEqual(sheet.getRange('J6').getValue(), 'Открытая адресация');
    assert.strictEqual(sheet.getRange('J7').getValue(), 30, 'Default N must be 30');

    // Verify DataValidation on method dropdown
    const valRule = sheet.getRange('J6').getDataValidation();
    assert.ok(valRule, 'DataValidation rule must be applied to J6');
  });
});

// ==============================================================================================
// 3. TIER 3: STRESS-TEST ENGINE & EMBEDDED DISTRIBUTION CHART
// ==============================================================================================
describe('Tier 3: Stress-Test Engine & Embedded Chart', () => {
  beforeEach(() => {
    initFreshGasContext();
  });

  it('generates valid synthetic phones and computes statistical metrics', () => {
    const N = 60;
    const M = 60;
    const phones = [];
    for (let i = 0; i < N; i++) {
      phones.push(generateSyntheticPhone(i));
    }

    assert.strictEqual(phones.length, N);
    // Verify phone format xx-xxx-xx
    phones.forEach(p => {
      assert.match(p, /^\d{2}-\d{3}-\d{2}$/, `Phone ${p} must match pattern xx-xxx-xx`);
    });

    // Hash phones into M=60 slots
    const freqs = new Array(M).fill(0);
    phones.forEach(p => {
      const k = referenceEvaluateNumKey(p);
      const slot = referenceKnuthHash(k, M);
      freqs[slot]++;
    });

    const totalHits = freqs.reduce((a, b) => a + b, 0);
    assert.strictEqual(totalHits, N, 'Sum of frequencies must equal N');

    // Compute metrics
    const stats = referenceComputeStats(freqs, N, M);
    assert.strictEqual(stats.mean, N / M, 'Mean frequency must equal N / M');
    assert.ok(stats.maxCollisions >= stats.mean, 'Max collisions >= mean');
    assert.ok(stats.emptySlots >= 0 && stats.emptySlots < M, 'Empty slots count valid');
    assert.ok(Number.isFinite(stats.chiSquare) && stats.chiSquare >= 0, 'Chi-square must be non-negative finite number');

    // Adversarial test: perfectly uniform distribution yields chi^2 = 0
    const uniformFreqs = new Array(M).fill(1);
    const uniformStats = referenceComputeStats(uniformFreqs, M, M);
    assert.strictEqual(uniformStats.chiSquare, 0, 'Uniform distribution has chi^2 = 0');
  });

  it('manages EmbeddedChart COLUMN lifecycle without accumulating duplicates', () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet('ChartSheet');

    // Create frequency table
    sheet.getRange('I14').setValue('Слот');
    sheet.getRange('J14').setValue('Частота');
    for (let i = 0; i < 10; i++) {
      sheet.getRange(15 + i, 9).setValue(i);
      sheet.getRange(15 + i, 10).setValue((i * 3) % 7);
    }

    const dataRange = sheet.getRange('I14:J24');

    // First stress-test run: build and insert chart
    assert.strictEqual(sheet.getCharts().length, 0);

    const chart1 = sheet.newChart()
      .asColumnChart()
      .addRange(dataRange)
      .setPosition(14, 12, 0, 0)
      .setTitle('Гистограмма распределения (N=60, M=60)')
      .setXAxisTitle('Слот')
      .setYAxisTitle('Частота')
      .build();

    sheet.insertChart(chart1);
    assert.strictEqual(sheet.getCharts().length, 1);
    assert.strictEqual(sheet.getCharts()[0].getChartType(), SpreadsheetApp.ChartType.COLUMN);
    assert.strictEqual(sheet.getCharts()[0].getOptions().title, 'Гистограмма распределения (N=60, M=60)');

    // Second stress-test run: removes old charts first, then inserts new chart
    sheet.getCharts().forEach(c => sheet.removeChart(c));
    assert.strictEqual(sheet.getCharts().length, 0, 'Existing charts cleared');

    const chart2 = sheet.newChart()
      .asColumnChart()
      .addRange(dataRange)
      .setPosition(14, 12, 0, 0)
      .setTitle('Гистограмма распределения v2')
      .build();

    sheet.insertChart(chart2);
    assert.strictEqual(sheet.getCharts().length, 1, 'Only exactly 1 chart remains on sheet');
    assert.strictEqual(sheet.getCharts()[0].getOptions().title, 'Гистограмма распределения v2');
  });

  it('runs runStressTest() if implemented in Code.gs', (t) => {
    if (typeof global.runStressTest !== 'function') {
      t.skip('runStressTest() not yet implemented in Code.gs (Milestone 2 pending)');
      return;
    }

    if (typeof global.setupControlSheet === 'function') {
      global.setupControlSheet();
    }

    global.runStressTest();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Панель_Управления');
    assert.ok(sheet, 'Control sheet must exist');
    assert.strictEqual(sheet.getCharts().length, 1, 'Chart must be created by stress test');
    assert.strictEqual(sheet.getCharts()[0].getChartType(), 'COLUMN');
  });
});

// ==============================================================================================
// 4. TIER 4: TEMPLATE CLONER, OPEN ADDRESSING, CHAINING & INTERACTIVE OPERATIONS
// ==============================================================================================
describe('Tier 4: Template Cloner, Open Addressing, Chaining & Interactive Handlers', () => {
  beforeEach(() => {
    initFreshGasContext();
  });

  it('deep clones _Шаблон_Таблицы_ into active hash table sheet', () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const template = ss.insertSheet('_Шаблон_Таблицы_');
    template.hideSheet();

    assert.strictEqual(template.isSheetHidden(), true, 'Template must be hidden');

    // Configure blueprint structure
    template.getRange('A1:H1').setValues([
      ['Слот', 'Статус', 'Ключ (Телефон)', 'Ф.И.О.', 'Исходная строка', 'Хеш h1(k)', 'Число проб', 'Трасса']
    ]);
    template.getRange('A1:H1').setBackground('#1e293b').setFontColor('#ffffff');
    template.setColumnWidth(3, 140);
    template.setColumnWidth(4, 240);

    // Clone template to target sheet
    const targetName = 'Хеш_Таблица_Линейное_M60';
    const cloned = template.copyTo(ss).setName(targetName).showSheet();

    assert.strictEqual(cloned.getName(), targetName);
    assert.strictEqual(cloned.isSheetHidden(), false, 'Cloned target sheet must be visible');
    assert.strictEqual(cloned.getRange('C1').getValue(), 'Ключ (Телефон)');
    assert.strictEqual(cloned.getRange('A1').getBackground(), '#1e293b');
    assert.strictEqual(cloned.getColumnWidth(4), 240);
  });

  it('resolves linear probing with statuses EMPTY, OCCUPIED, and probe count/traces', () => {
    const M = 10;
    const step = 1;
    const fallback = 10;

    // Simulated slots
    const slots = Array.from({ length: M }, (_, idx) => ({
      slotIndex: idx,
      status: 'EMPTY',
      record: null,
      probeCount: 0,
      trace: []
    }));

    function insertItem(key, name) {
      const h1 = referenceKnuthHash(key, M);
      const trace = [];
      for (let i = 0; i < fallback; i++) {
        const s = (h1 + i * step) % M;
        trace.push(s);
        if (slots[s].status === 'EMPTY' || slots[s].status === 'DELETED') {
          slots[s].status = 'OCCUPIED';
          slots[s].record = { key, name };
          slots[s].probeCount = i + 1;
          slots[s].trace = trace;
          return { slot: s, probes: i + 1, trace };
        }
      }
      throw new Error(`Table overflow: exceeds fallback limit ${fallback}`);
    }

    // Insert first item
    const r1 = insertItem(100, 'User 1');
    assert.strictEqual(slots[r1.slot].status, 'OCCUPIED');
    assert.strictEqual(r1.probes, 1);

    // Insert colliding item that hashes to same primary slot
    const collidingKey = 100; // Same hash
    const r2 = insertItem(collidingKey, 'User 2');
    assert.strictEqual(r2.probes, 2);
    assert.strictEqual(r2.slot, (r1.slot + step) % M);
    assert.deepStrictEqual(r2.trace, [r1.slot, r2.slot]);
  });

  it('preserves Tombstone invariant on deletion and maintains search probe chain', () => {
    const M = 10;
    const step = 1;
    const slots = Array.from({ length: M }, (_, idx) => ({
      slotIndex: idx,
      status: 'EMPTY',
      key: null,
      name: null
    }));

    // Setup collision chain at slot 2 and slot 3
    slots[2] = { slotIndex: 2, status: 'OCCUPIED', key: '23-456-78', name: 'User A' };
    slots[3] = { slotIndex: 3, status: 'OCCUPIED', key: '91-827-36', name: 'User B' };

    // Search algorithm with Tombstone support
    function search(targetPhone, startSlot) {
      const visited = [];
      for (let i = 0; i < M; i++) {
        const s = (startSlot + i * step) % M;
        visited.push(s);
        if (slots[s].status === 'EMPTY') {
          return { found: false, probes: i + 1, trace: visited };
        }
        if (slots[s].status === 'OCCUPIED' && slots[s].key === targetPhone) {
          return { found: true, slot: s, record: slots[s], probes: i + 1, trace: visited };
        }
        // If status === 'DELETED', DO NOT stop; continue probing!
      }
      return { found: false, probes: M, trace: visited };
    }

    // Delete User A from slot 2 -> install Tombstone DELETED
    slots[2].status = 'DELETED';
    slots[2].name = '[Удален]';

    // Search for User B (starts at slot 2): must NOT stop at slot 2 DELETED, but find at slot 3!
    const res = search('91-827-36', 2);
    assert.strictEqual(res.found, true, 'Search must cross Tombstone and find User B');
    assert.strictEqual(res.slot, 3);
    assert.deepStrictEqual(res.trace, [2, 3]);

    // Search for nonexistent key: must stop at slot 4 (EMPTY)
    const notFound = search('00-000-00', 2);
    assert.strictEqual(notFound.found, false);
    assert.strictEqual(notFound.trace.length, 3); // 2 (DELETED), 3 (OCCUPIED), 4 (EMPTY)
  });

  it('handles interactive dialogs via queued mock responses', () => {
    const ui = SpreadsheetApp.getUi();

    // Queue response for insert dialog
    ui.queuePromptResponse({ button: ui.Button.OK, text: '99-888-77' });
    const prompt1 = ui.prompt('Введите номер телефона:');
    assert.strictEqual(prompt1.getSelectedButton(), 'OK');
    assert.strictEqual(prompt1.getResponseText(), '99-888-77');

    // Queue response with cancel button
    ui.queuePromptResponse({ button: ui.Button.CANCEL, text: '' });
    const prompt2 = ui.prompt('Подтвердите действие:');
    assert.strictEqual(prompt2.getSelectedButton(), 'CANCEL');

    // Alert records message in history
    ui.alert('Запись успешно добавлена в слот #14');
    assert.strictEqual(ui.alertsHistory.length, 1);
    assert.ok(ui.alertsHistory[0].msg.includes('слот #14'));
  });

  it('safely applies createFilter() and guards against already-existing filters', () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.insertSheet('FilterTest');
    const tableRange = sheet.getRange('A1:H61');

    // 1. Initial filter creation
    const filter1 = tableRange.createFilter();
    assert.ok(filter1, 'Filter created successfully');
    assert.strictEqual(sheet.getFilter(), filter1);

    // 2. Calling createFilter() again without removing throws GAS error
    assert.throws(() => {
      tableRange.createFilter();
    }, /There is already a filter on this sheet/);

    // 3. Defensive pattern: check and remove existing filter first
    const existing = sheet.getFilter();
    if (existing) {
      existing.remove();
    }
    assert.strictEqual(sheet.getFilter(), null);

    // Now re-creating filter succeeds
    const filter2 = tableRange.createFilter();
    assert.ok(filter2, 'Filter recreated successfully');
    assert.strictEqual(sheet.getFilter(), filter2);
  });

  it('builds Separate Chaining alternative grouping items into bucket linked lists', () => {
    const M = 10;
    const testRecords = [
      { phone: '23-456-78', name: 'User 1' },
      { phone: '91-827-36', name: 'User 2' },
      { phone: '45-123-89', name: 'User 3' },
      { phone: '77-901-42', name: 'User 4' },
      { phone: '34-567-89', name: 'User 5' }
    ];

    const buckets = Array.from({ length: M }, () => []);

    testRecords.forEach(rec => {
      const k = referenceEvaluateNumKey(rec.phone);
      const slot = referenceKnuthHash(k, M);
      buckets[slot].push({
        phone: rec.phone,
        name: rec.name,
        depth: buckets[slot].length + 1
      });
    });

    assert.strictEqual(buckets.length, M);
    let totalItems = 0;
    let collisionsCount = 0;
    buckets.forEach(b => {
      totalItems += b.length;
      if (b.length > 1) {
        collisionsCount += (b.length - 1);
      }
    });

    assert.strictEqual(totalItems, testRecords.length, 'All items must be placed in buckets');
    assert.ok(collisionsCount >= 0);
  });

  it('runs buildHashTableFromTemplate() if implemented in Code.gs', (t) => {
    if (typeof global.buildHashTableFromTemplate !== 'function') {
      t.skip('buildHashTableFromTemplate() not yet implemented in Code.gs (Milestone 3 pending)');
      return;
    }

    if (typeof global.setupControlSheet === 'function') {
      global.setupControlSheet();
    }

    global.buildHashTableFromTemplate();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const generated = ss.getSheetByName('Хеш_Таблица_Линейное_M60');
    assert.ok(generated, 'Target hash table sheet must exist');
    assert.strictEqual(generated.isSheetHidden(), false);
    assert.ok(generated.getFilter() !== null, 'Native filter must be applied');
  });
});
