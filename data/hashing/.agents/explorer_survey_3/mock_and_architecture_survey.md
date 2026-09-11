# Survey Report: Google Apps Script Environment, Runtime & Mock Architecture
**Explorer**: explorer_survey_3 (teamwork_preview_explorer)  
**Project**: Laboratory Work #1 (Variant 3: Phone Number, Linear Probing) in Google Sheets + Apps Script  
**Target Directory**: `C:/Users/DaniilTuT/Documents/antigravity/eli5-visual-hub/data/hashing`  
**Timestamp**: 2026-09-10T10:44:00Z  

---

## 1. Executive Summary

This survey provides a comprehensive audit of the local environment, runtime capabilities, and testing infrastructure for Google Apps Script (GAS) development in `data/hashing`, along with a production-grade architecture design for **100% offline unit and E2E testing** in Node.js.

### Key Findings
1. **Runtime Availability**:
   - **Node.js v22.23.0** and **npm 10.9.8** are installed and operational.
   - **`node:test`** and **`node:assert`** are native to Node.js v22, providing a complete, zero-dependency test runner with TAP/spec reporters, subtests, and assertions.
   - Global tooling includes **`@google/clasp@3.4.0`**, available if remote Google Drive synchronization is ever needed.
2. **Current Repository State**:
   - **Zero existing test files or mock harnesses** existed in `data/hashing`.
   - Existing `Code.gs` (1168 lines) implements an older 21-variant lab without the new interactive Control Panel (`Панель_Управления`), dynamic in-cell `numKey` execution, stress-test histogram chart, template cloner (`_Шаблон_Таблицы_`), or native auto-filter specified in `ORIGINAL_REQUEST.md`.
3. **Mock Harness Proof of Concept**:
   - A prototype mock harness (`gas_mock_prototype.js`) and test suite (`prototype_test.js`) was built and executed in `.agents/explorer_survey_3/`.
   - It verified that `Code.gs` functions can be evaluated via `node:vm` in pure Node.js and executed with sub-10ms latency (`ok 1 - loads Code.gs and executes loadDataset and hashing functions` in 6.7ms).
4. **Proposed Architecture**:
   - High-fidelity **`gas-mock.js`** modeling `SpreadsheetApp`, `Spreadsheet`, `Sheet`, `Range`, `EmbeddedChart`, `DataValidation`, `Ui`, `PropertiesService`, and `Utilities`.
   - Native test runner using `node --test` with 4 testing tiers (unit, layout, stress-test/chart, interactive E2E).

---

## 2. Environment & Runtime Audit

### 2.1 Host System & Runtimes

| Component | Detected Version | Status / Notes |
|---|---|---|
| **Operating System** | Windows 10/11 (PowerShell shell) | Supported |
| **Node.js** | `v22.23.0` | Modern LTS/Current with V8 v12.4+ |
| **npm** | `10.9.8` | Package manager available |
| **node:test** | Native in Node 22 | Full test suite runner (`describe`, `it`, `mock`) |
| **node:assert** | Native in Node 22 | Strict assertion library (`assert.strictEqual`, etc.) |
| **node:vm** | Native in Node 22 | Sandbox code execution for `.gs` files |
| **Google Clasp** | `@google/clasp@3.4.0` (Global) | Installed at `AppData/Roaming/npm` |
| **Jest / Vitest** | Not installed globally / No local `node_modules` | **Not required**: native `node:test` avoids npm bloat |

### 2.2 Compatibility Analysis: GAS V8 Engine vs Node.js 22

Google Apps Script runs on the modern **Google V8 engine** (same engine powering Node.js).
- **ES6+ features**: Arrow functions, template literals, destructuring, classes, `Map`, `Set`, `Promise`, `async/await` are fully supported in both environments.
- **Dynamic JS Execution**: GAS supports `new Function()` within script execution limits. Node.js v22 supports `new Function()` and `node:vm` identical in semantics.
- **Top-level Scoping**:
  - In GAS, `.gs` files share a global namespace where functions and `var`/`const` declarations are placed in the global scope without `import`/`export`.
  - In Node.js, `vm.runInThisContext(code)` executes the `.gs` code directly against `global`, making all GAS functions (`setupControlSheet`, `runStressTest`, `buildHashTableFromTemplate`, etc.) immediately callable in test suites without altering `Code.gs`.
  - **Zero build step required**: `Code.gs` remains 100% clean, standard GAS code that can be copied and pasted directly into the Google Sheets script editor.

---

## 3. Inventory of GAS Services Required by ORIGINAL_REQUEST.md

To support R1, R2, and R3, the mock harness must faithfully emulate the following Google Apps Script services and methods:

```
                  ┌──────────────────────┐
                  │    SpreadsheetApp    │
                  └──────────┬───────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Spreadsheet   │ │       Ui        │ │ DataValidation  │
└────────┬────────┘ └────────┬────────┘ └─────────────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│      Sheet      │ │ Prompt / Alert  │
└────────┬────────┘ └─────────────────┘
    ┌────┴─────────────────────────────┐
    ▼                                  ▼
┌───────┐                      ┌───────────────┐
│ Range │                      │ EmbeddedChart │
└───────┘                      └───────────────┘
```

### 3.1 SpreadsheetApp
- `getActiveSpreadsheet()` -> returns active `Spreadsheet` instance.
- `getUi()` -> returns `Ui` instance.
- `flush()` -> synchronizes spreadsheet state (no-op in in-memory mock).
- `newDataValidation()` -> returns `DataValidationBuilder`.
- `BorderStyle` enum: `SOLID`, `SOLID_MEDIUM`, `DOTTED`, `DASHED`, `DOUBLE`.
- `ChartType` enum: `COLUMN`, `BAR`, `LINE`, `PIE`, `SCATTER`, `AREA`.

### 3.2 Spreadsheet
- `getSheetByName(name)` -> `Sheet | null`
- `insertSheet(name, [index])` -> creates and returns new `Sheet`
- `deleteSheet(sheet)` -> removes sheet
- `getSheets()` -> array of all `Sheet` instances
- `setActiveSheet(sheet)` -> updates current active sheet
- `toast(message, title, timeoutSeconds)` -> records toast message for assertions

### 3.3 Sheet
- `getName()`, `setName(name)`
- `getRange(row, col, [numRows], [numCols])` (1-based integer coordinates)
- `getRange(a1Notation)` (e.g., `'A1'`, `'A1:G30'`, `'I5:N20'`)
- `clear()`, `clearContents()`, `clearFormats()`
- `getLastRow()`, `getLastColumn()` (dynamically computed from cell contents)
- `getMaxRows()`, `getMaxColumns()`
- `setRowHeight(row, height)`, `setColumnWidth(col, width)`, `autoResizeColumn(col)`
- `setActiveRange(range)`
- `hideSheet()`, `showSheet()`, `isSheetHidden()`
- `copyTo(spreadsheet)`: **Critical for R3 template cloning**. Must perform deep-copy of all cells, values, formatting, row heights, column widths, merges, and charts into a new sheet.
- **Charts API**:
  - `getCharts()` -> array of `EmbeddedChart`
  - `newChart()` -> returns `EmbeddedChartBuilder`
  - `insertChart(chart)` -> adds chart to sheet
  - `updateChart(chart)` -> replaces existing chart
  - `removeChart(chart)` -> removes chart
- **Filter API**:
  - `getFilter()` -> returns active `Filter | null`
  - Range method `range.createFilter()` sets sheet filter

### 3.4 Range
- **Data Access**:
  - `getValue()` -> scalar value of top-left cell
  - `setValue(value)` -> sets scalar value across all cells in range
  - `getValues()` -> 2D array of values `[numRows][numCols]`
  - `setValues(values2d)` -> writes 2D array, validates row/col dimensions match range
  - `getDisplayValue()`, `getDisplayValues()` -> string formatted representations
  - `getFormula()`, `setFormula(formula)`, `getFormulas()`, `setFormulas(formulas2d)`
- **Structure**:
  - `getRow()`, `getColumn()`, `getNumRows()`, `getNumColumns()`, `getLastRow()`, `getLastColumn()`, `getA1Notation()`
  - `getCell(relRow, relCol)` (1-based relative to range)
  - `offset(rowOffset, colOffset, [numRows], [numCols])`
  - `merge()`, `breakApart()`, `isPartOfMerge()`
- **Visual Styling (Fluent Chaining `return this`)**:
  - `setBackground(hex)`, `setBackgrounds(2d)`
  - `setFontColor(hex)`, `setFontColors(2d)`
  - `setFontWeight(weight)` (`'bold'`, `'normal'`)
  - `setFontSize(size)` (number)
  - `setFontFamily(family)` (`'Consolas'`, `'Arial'`, etc.)
  - `setHorizontalAlignment(align)` (`'center'`, `'left'`, `'right'`)
  - `setVerticalAlignment(align)` (`'middle'`, `'top'`, `'bottom'`)
  - `setWrap(isWrap)` (boolean)
  - `setNumberFormat(format)`
  - `setBorder(top, left, bottom, right, vertical, horizontal, color, style)`
- **Data Validation & Filter**:
  - `setDataValidation(rule)`, `clearDataValidations()`
  - `createFilter()` -> creates `Filter` on sheet

### 3.5 EmbeddedChartBuilder & EmbeddedChart
- `asColumnChart()`, `asBarChart()`, `setChartType(type)`
- `addRange(range)` -> attaches data series range
- `setPosition(anchorRow, anchorCol, offsetX, offsetY)`
- `setOption(key, value)` (e.g., `title`, `hAxis`, `vAxis`, `legend`, `colors`)
- `build()` -> returns `EmbeddedChart`
- `EmbeddedChart.modify()` -> returns builder initialized with existing chart state

### 3.6 DataValidationBuilder & DataValidation
- `requireValueInList(values, showDropdown)` (for dropdown `["Открытая адресация", "Метод цепочек"]`)
- `setAllowInvalid(allow)`
- `setHelpText(text)`
- `build()` -> returns `DataValidation` rule

### 3.7 Ui, Prompt, Alert, and Menu
- Non-blocking headless execution:
  - `createMenu(caption)`: records registered menus and menu items.
  - `alert(prompt)` / `alert(title, prompt, buttons)`: records alert in call log, returns `Button.OK`.
  - `prompt(title, prompt, buttons)`:
    - Supports a response queue: `mockUi.queuePromptResponse({ button: 'OK', text: '...' })`.
    - Returns `{ getSelectedButton: () => 'OK', getResponseText: () => text }`.
  - Enums: `ButtonSet` (`OK`, `OK_CANCEL`, `YES_NO`, `YES_NO_CANCEL`), `Button` (`OK`, `CANCEL`, `YES`, `NO`, `CLOSE`).

### 3.8 PropertiesService
- `getDocumentProperties()`, `getScriptProperties()`, `getUserProperties()`
- Methods: `getProperty(k)`, `setProperty(k, v)`, `getProperties()`, `setProperties(props, deleteAll)`, `deleteProperty(k)`, `deleteAllProperties()`.

### 3.9 Utilities
- `formatDate(date, timeZone, format)`
- `sleep(ms)` (no-op in test runner for speed)
- `newBlob(data, contentType, name)`

---

## 4. In-Depth Design of `gas-mock.js`

Below is the complete architectural specification for `test/gas-mock.js`.

### 4.1 In-Memory Sheet Model: Dense Sparse Matrix

To ensure speed and accurate dimension tracking:
```javascript
class Cell {
  constructor(value = '') {
    this.value = value;
    this.formula = null;
    this.background = '#ffffff';
    this.fontColor = '#000000';
    this.fontWeight = 'normal';
    this.fontSize = 10;
    this.fontFamily = 'Arial';
    this.horizontalAlignment = 'left';
    this.verticalAlignment = 'bottom';
    this.wrap = false;
    this.numberFormat = '@';
    this.border = null;
    this.dataValidation = null;
  }
}
```
In `MockSheet`:
- Cells are indexed via a string key `"${row},${col}"` (1-based) in a `Map<string, Cell>`.
- Merged regions are stored in `merges: Array<{ startRow, startCol, endRow, endCol }>`.
- When `sheet.getLastRow()` is called, it iterates through non-empty cells and returns $\max(\text{row})$, matching GAS behavior.
- `sheet.copyTo(targetSpreadsheet)` creates a deep clone of all cells, row heights, column widths, merges, and chart builders into a new sheet named `"Копия <исходный>"` or specified name.

### 4.2 Robust A1 Notation Parser

The parser must handle:
1. Single cells: `"A1"`, `"Z100"`, `"AA5"`
2. Ranges: `"A1:G30"`, `"I5:N20"`
3. Mixed/Case-insensitive: `"a1:g7"`
4. Column-only / Row-only: `"A:G"`, `"5:10"`

Algorithm:
```javascript
function colLetterToNumber(letter) {
  let col = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col;
}

function parseA1(a1String, sheet) {
  const parts = a1String.split(':');
  const parseToken = (token) => {
    const match = token.match(/^([A-Za-z]+)?([0-9]+)?$/);
    if (!match) throw new Error(`Invalid A1 notation: ${token}`);
    const col = match[1] ? colLetterToNumber(match[1]) : null;
    const row = match[2] ? parseInt(match[2], 10) : null;
    return { col, row };
  };

  const start = parseToken(parts[0]);
  if (parts.length === 1) {
    return {
      row: start.row || 1,
      col: start.col || 1,
      numRows: 1,
      numCols: 1
    };
  }
  const end = parseToken(parts[1]);
  const startRow = start.row || 1;
  const startCol = start.col || 1;
  const endRow = end.row || sheet.getLastRow() || 100;
  const endCol = end.col || sheet.getLastColumn() || 26;

  return {
    row: Math.min(startRow, endRow),
    col: Math.min(startCol, endCol),
    numRows: Math.abs(endRow - startRow) + 1,
    numCols: Math.abs(endCol - startCol) + 1
  };
}
```

### 4.3 Interactive Testing Interceptor (Headless UI)

Interactive functions like `insertRecordInteractive()` or `deleteRecordInteractive()` prompt the user via `ui.prompt(...)`.
To test these automatically without blocking:
- `MockUi` maintains a FIFO queue: `queuePromptResponse({ button: 'OK', text: '91-827-36' })`.
- When `ui.prompt()` is invoked in `Code.gs`, it dequeues the pre-programmed user response.
- If the queue is empty, it returns `{ getSelectedButton: () => 'OK', getResponseText: () => '' }`.
- All alerts and prompts are appended to `ui.alertsHistory` and `ui.promptsHistory` so tests can assert exact user-facing messages (e.g. `assert.match(alerts[0].msg, /Слот #\d+ переведен в состояние «🪦 DELETED»/)`).

---

## 5. Dynamic `numKey` Sandbox Execution & Safety Strategy

Requirement R1 specifies:
- Main sheet contains cell with editable JS code for `numKey`.
- Default: `val => parseInt(String(val).replace(/\D/g, ''), 10)`.
- The user can input an arrow function `val => ...` or function statement `function(val) { ... }` or body `return ...`.
- The script executes this via `new Function()`.

### 5.1 Safe Dynamic Evaluator Pattern in `Code.gs`

```javascript
/**
 * Safely compiles and executes user-defined numKey code from a cell
 * @param {string} codeStr - Raw string from settings cell
 * @param {*} val - Value to convert to integer key
 * @returns {number} Non-negative integer key
 */
function executeDynamicNumKey(codeStr, val) {
  const defaultFn = (v) => {
    const digits = String(v || '').replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  if (!codeStr || typeof codeStr !== 'string' || !codeStr.trim()) {
    return defaultFn(val);
  }

  const trimmed = codeStr.trim();
  try {
    let fn;
    if (trimmed.startsWith('val =>') || trimmed.startsWith('(val) =>') || trimmed.startsWith('function')) {
      fn = new Function('return (' + trimmed + ')')();
    } else {
      fn = new Function('val', trimmed.includes('return') ? trimmed : `return (${trimmed});`);
    }
    const res = fn(val);
    const num = Number(res);
    return isNaN(num) ? 0 : Math.abs(Math.floor(num));
  } catch (err) {
    // If user made a syntax error in cell, fall back gracefully to default
    return defaultFn(val);
  }
}
```

### 5.2 Unit Test Matrix for `executeDynamicNumKey`
1. **Default arrow function**: `'val => parseInt(String(val).replace(/\\D/g, ""), 10)'` -> `'23-456-78'` -> `2345678`.
2. **Standard function**: `'function(val) { return Number(val.replace(/\\D/g, "")); }'` -> `'91-827-36'` -> `9182736`.
3. **Short expression**: `'parseInt(val.replace(/\\D/g, ""), 10)'` -> returns correct number.
4. **Syntax error in cell**: `'val => ;;; error'` -> gracefully falls back to default without throwing an unhandled exception.
5. **Non-numeric result**: `'val => "hello"'` -> falls back to `0`.

---

## 6. Automated Test Suite Architecture & Catalog

### 6.1 Proposed Directory & File Layout

```
data/hashing/
├── Code.gs                               # Production Google Apps Script (100% copy-pasteable)
├── README_GOOGLE_SHEETS.md               # User & operator manual
├── test/
│   ├── gas-mock.js                       # Comprehensive GAS mock engine
│   ├── setup_control_sheet.test.js       # Tier 2: R1 Control Panel layout & styling
│   ├── stress_test.test.js               # Tier 3: R2 Stress test, Knuth hash, stats, chart
│   ├── template_cloner.test.js           # Tier 4: R3 Template cloning, linear probing, chaining
│   ├── dynamic_numkey.test.js            # Tier 1: Dynamic JS compilation & edge cases
│   └── interactive_handlers.test.js      # Tier 4: Insert, Delete (Tombstone), Filter
└── run-tests.js                          # Standalone runner (`node run-tests.js`)
```

### 6.2 Test Catalog (Tiers 1–4)

#### Tier 1: Algorithms & Mathematical Functions (`dynamic_numkey.test.js`)
- **Knuth Multiplicative Hashing**:
  - Test $h(k) = \lfloor M \cdot ((k \cdot A) \pmod 1) \rfloor$ for $A = (\sqrt{5}-1)/2$.
  - Output strictly within $[0, M-1]$ for all $k \ge 0$.
  - Verify boundary values ($k=0$, $k=1$, large $k=2^{31}-1$).
- **Linear Probing Sequence**:
  - $h(k, i) = (h_1(k) + i \cdot \text{step}) \pmod M$.
  - Step parameters $\text{step}=1$, $\text{step}=7$, fallback limit handling.
- **Chi-Squared ($\chi^2$) Uniformity Statistic**:
  - $\chi^2 = \sum_{i=0}^{M-1} \frac{(O_i - E)^2}{E}$, where $E = N/M$.
  - Exact match on uniform distribution ($\chi^2 = 0$) and known test distributions.
- **Dynamic JS Sandbox**:
  - All variations of arrow functions, syntax errors, and empty values.

#### Tier 2: Control Sheet Architecture (`setup_control_sheet.test.js`)
- **Sheet Initialization**:
  - `setupControlSheet()` creates or resets sheet `Панель_Управления`.
  - Sheet is set as active sheet.
- **Left Table (Cols A..G)**:
  - Headers in row 1: `["Ф.И.О.", "Дата рождения", "Номер телефона", "Серия и номер паспорта", "Адрес прописки", "Номер банковского счета", "Остаток денег на счете"]`.
  - Column III is specifically `'Номер телефона'`.
  - Pre-filled with default 30 records or generated records.
  - Formatted with dark header `#1e293b`, zebra rows `#f8fafc`, borders.
- **Right Settings Panel (Cols I..N)**:
  - Cell `J3` (or designated): $M = 60$.
  - Cell `J4`: $\text{step} = 1$.
  - Cell `J5`: $\text{fallback} = 60$.
  - Cell `J6`: Data Validation dropdown `["Открытая адресация", "Метод цепочек"]`.
  - Cell `J7`: $N = 30$.
  - Cell `J8` / `I8:N9`: Editable JS code cell containing `val => parseInt(String(val).replace(/\D/g, ''), 10)`.
  - Validates all borders, labels, and background colors.

#### Tier 3: Stress-Test Engine & Embedded Chart (`stress_test.test.js`)
- **Execution of `runStressTest()`**:
  - Reads $N, M, \text{numKey}$ from Control Panel settings.
  - Generates $N$ synthetic phone numbers (matching `xx-xxx-xx` pattern).
  - Evaluates each phone through dynamic `numKey` and Knuth multiplicative hash.
  - Populates frequency distribution table on `Панель_Управления` (slots $0 \dots M-1$).
- **Statistical Assertions**:
  - Mean frequency equals $N/M$.
  - Max bucket collisions $\ge \text{mean}$.
  - Empty slots count calculated accurately.
  - Chi-squared statistic computed and written to sheet summary cards.
- **EmbeddedChart Assertions**:
  - `sheet.getCharts().length === 1`.
  - Chart type is `SpreadsheetApp.ChartType.COLUMN`.
  - Chart title contains `'Распределение хешей'` or `'Stress Test Distribution'`.
  - Subsequent runs update the existing chart without leaking multiple duplicate charts!

#### Tier 4: Template Cloner & Interactive Handlers (`template_cloner.test.js`, `interactive_handlers.test.js`)
- **Template Setup**:
  - Hidden reference template `_Шаблон_Таблицы_` exists and is hidden (`isSheetHidden() === true`).
- **Cloning & Population (`buildHashTableFromTemplate()`)**:
  - Clones `_Шаблон_Таблицы_` into new sheet `Хеш_Таблица_Линейное_M60`.
  - Copies all 30 records from Left Table (A..G) of Control Panel.
  - Correctly marks slots:
    - Empty slots as `EMPTY`.
    - Populated slots as `OCCUPIED` with raw phone, full name, probes count, and full probe trace.
  - Validates total probes, collisions, and load factor $\alpha = 30/60 = 0.5$.
  - Respects `fallback` parameter (if table fills up or exceeds fallback, triggers overflow error).
- **Separate Chaining Support**:
  - When dropdown is set to `"Метод цепочек"`, clones template into `Хеш_Таблица_Цепочки_M30`, populating linked lists and chain lengths.
- **Interactive Insertion (`insertRecordInteractive()`)**:
  - Queues simulated prompt response: `"05-111-22"`, `"Иванов Тест"`.
  - Successfully finds available slot (or reuses `DELETED` tombstone).
  - Increments record count and updates status.
- **Interactive Deletion (`deleteRecordInteractive()`)**:
  - Queues simulated prompt response for existing key: `"23-456-78"`.
  - Locates slot, converts status to `'🪦 DELETED'`.
  - Preserves subsequent search probe chains (asserts key located further down the probe trace remains searchable).
- **Native Auto-Filter**:
  - Verifies `sheet.getFilter() !== null`.
  - Verifies filter range covers the entire slot table (e.g. `A4:H64`).

---

## 7. Concrete Implementation Blueprint for Phase 1 & 2

### 7.1 Standalone Test Runner Script (`run-tests.js`)

```javascript
/**
 * Standalone Test Runner for Google Apps Script
 * Zero external dependencies. Uses Node.js native test runner.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = path.join(__dirname, 'test');
if (!fs.existsSync(testDir)) {
  console.error(`Test directory not found at ${testDir}`);
  process.exit(1);
}

const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .map(f => path.join('test', f));

console.log(`\x1b[36m⚡ Running ${testFiles.length} GAS test suites with node:test...\x1b[0m`);

const proc = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
  cwd: __dirname
});

proc.on('close', (code) => {
  if (code === 0) {
    console.log(`\x1b[32m✔ All GAS mock and E2E tests passed successfully!\x1b[0m`);
  } else {
    console.log(`\x1b[31m✖ Tests failed with exit code ${code}\x1b[0m`);
  }
  process.exit(code);
});
```

### 7.2 Verification Commands

To independently run and verify the test harness:
```bash
# 1. Run all test suites natively
node --test test/*.test.js

# 2. Or run via the runner
node run-tests.js

# 3. Prototype verification (executed during survey)
node --test .agents/explorer_survey_3/prototype_test.js
```

---

## 8. Conclusion & Recommendations for the Multi-Agent Team

1. **Adopt Zero-Dependency Native `node:test`**:
   - Avoid installing bulky `node_modules` (Jest, Babel, etc.).
   - Node v22 `node:test` + `node:assert` runs entire test suites in <150ms.
2. **Separate Mock Infrastructure**:
   - Place `gas-mock.js` in `data/hashing/test/gas-mock.js`.
   - `Code.gs` remains 100% pure Google Apps Script, perfectly compatible with Google Sheets editor.
3. **Execute VM-Based Context Injection**:
   - In test files, load `Code.gs` via `vm.runInThisContext(fs.readFileSync('Code.gs', 'utf8'))`.
   - All global functions immediately bind to Node's `global` without any source modifications.
4. **Implement UI Response Queues**:
   - Ensure all interactive dialogs (`SpreadsheetApp.getUi().prompt`) are testable headlessly via `mockUi.queuePromptResponse()`.
