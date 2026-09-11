# Handoff Report — Adversarial Challenge: Edge Cases & Extreme Inputs

**Agent**: `challenger_2` (`teamwork_preview_challenger`, empirical_challenger)  
**Date**: 2026-09-10  
**Target Repository**: `C:/Users/DaniilTuT/Documents/antigravity/eli5-visual-hub/data/hashing`  
**Verdict**: **APPROVE**

---

## 1. Observation

Adversarial testing was executed against `Code.gs`, `test/gas-mock.js`, and the modular architecture in `apps-script-deploy/*.js`.

### 1.1 Adversarial numKey Compilation & Execution
Direct execution of `evaluateNumKey(val, codeStr)` in `Code.gs` (lines 370–394):
- **Arrow function** (`x => parseInt(x.slice(0, 2), 10)`):
  - Input: `'23-456-78'` ➔ Result: `23` (extracted first 2 digits).
- **Standard function** (`function(val) { return Number(String(val).replace(/\D/g, '')); }`):
  - Input: `'23-456-78'` ➔ Result: `2345678`.
- **Expression** (`val * 2`):
  - Input: `'123'` ➔ Result: `246`.
  - Input: `'23-456-78'` (where `'23-456-78' * 2` evaluates to `NaN`) ➔ Result: `0`. Safe sanitization via `isNaN(num) ? 0 : Math.floor(Math.abs(num))`. No crash.
- **Throwing function** (`val => { throw new Error('boom'); }`):
  - Input: `'23-456-78'` ➔ Result: `2345678`. Error safely caught in `try...catch` block, fell back to default digit extraction.
- **Returning NaN** (`val => NaN`):
  - Input: `'23-456-78'` ➔ Result: `0`. No crash.
- **Returning negative** (`val => -999`):
  - Input: `'23-456-78'` ➔ Result: `999`. Correctly converted to positive integer via `Math.abs`.
- **Empty, non-string, and undefined code inputs**:
  - `codeStr = ''` ➔ Result: `2345678` (default fallback).
  - `codeStr = null` ➔ Result: `2345678` (default fallback).
  - `codeStr = undefined` ➔ Result: `2345678` (default fallback).
  - `codeStr = 12345` ➔ Result: `2345678` (default fallback).
  - `codeStr = {}` ➔ Result: `2345678` (default fallback).
- **Adversarial `val` inputs**:
  - `evaluateNumKey(undefined, 'x => parseInt(x.slice(0, 2), 10)')` ➔ Result: `0`. Exception during `slice` safely caught and routed to default fallback.
  - `evaluateNumKey(null, 'val * 2')` ➔ Result: `0`.
  - SQL injection string `'; DROP TABLE students; --'` ➔ Result: `0` (or parsed digits), no execution escape.
  - XSS script tag `<script>alert('xss')</script>` ➔ Result: `0`, no execution escape.

### 1.2 Mathematical Invariant: Knuth Multiplicative Hash Boundaries
Direct execution of `knuthMultiplicativeHash(numKey, M)` in `Code.gs` (lines 351–360):
- Evaluated across test keys: `[0, 1, -1, 100, -999, 999999999, 2345678, NaN, Infinity, -Infinity, null, undefined, 0.5, -0.7]`
- Evaluated across modulus values: `M in [1, 2, 7, 10, 59, 60, 61, 100, 999]`
- Output was strictly an integer within `[0, M-1]` in 100% of combinations.
- For `M = 1`, output was identically `0` for all inputs.

### 1.3 Extreme Table Parameters
- **`M = 1` (Single slot table)**:
  - `runStressTest()` with `M = 1, N = 1`: Succeeded. Chart created, 0 empty slots, frequency = 1.
  - `buildHashTableFromTemplate()` with `M = 1` (Separate Chaining): Succeeded. Created sheet `Хеш_Таблица_Цепочки_M1`, slot 0 contains `30 эл. (КОЛЛИЗИЯ)` with chain depth 30.
  - `buildHashTableFromTemplate()` with `M = 1` (Open Addressing, 30 items): Threw expected overflow error:
    `"Переполнение хеш-таблицы при вставке записи #2 (91-827-36) за 1 проб."`
    Did not hang or loop infinitely.
  - `buildHashTableFromTemplate()` with `M = 1` (Open Addressing, 1 item): Succeeded. Record placed in slot 0 with status `OCCUPIED`.
- **`step = 0`**:
  - `Code.gs` line 858: `const step = (!isNaN(step_raw) && step_raw > 0) ? step_raw : 1;`
  - When `step = 0`, safely sanitized to `step = 1`. Succeeded without infinite loop.
- **`step = M` (e.g. `M = 60, step = 60`)**:
  - `(h1 + i * M) % M === h1`, so collisions loop on slot `h1`.
  - Open addressing halted after `fallback` attempts and threw clear overflow error:
    `"Переполнение хеш-таблицы при вставке записи #13 (89-012-34) за 60 проб."`
    Did not hang in an infinite loop.
- **`step = M + 5` (e.g. `M = 60, step = 65`)**:
  - Probes effectively with `step = 5`. Succeeded and placed all records.
- **`fallback = 0`**:
  - `Code.gs` line 861: `const fallback = (!isNaN(fallback_raw) && fallback_raw > 0) ? Math.min(M, fallback_raw) : M;`
  - Sanitized to default `M = 60`. Succeeded.
- **`fallback = 1`**:
  - Open addressing threw clear error upon first collision:
    `"Переполнение хеш-таблицы при вставке записи #13 (89-012-34) за 1 проб."`
- **`fallback = 1000`**:
  - Clamped via `Math.min(M, fallback)` to `M = 60`. Prevented excessive probe iterations.
- **`N = 0`**:
  - `runStressTest()` with `N = 0`: Sanitized to default `N = 30`. Summary card verified `N = 30`.
  - `generateNRows()` with `N = 0`: Sanitized to default `N = 30`.
- **`N = 1`**:
  - Succeeded across `generateNRows()` (1 row generated), `runStressTest()` (N=1), and `buildHashTableFromTemplate()` (1 record placed).
- **`N = 999`**:
  - Maximum allowed records per specification (`N < 1000`). Succeeded without memory pressure, generated summary card `N = 999`, built single embedded column chart.
- **`N = 2500`**:
  - Clamped to maximum `N = 999`.

### 1.4 Spreadsheet Operations Idempotency & Lifecycle
- **Repeated calls to `setupControlSheet()` (5 consecutive runs)**:
  - Exact count of `Панель_Управления` sheets in workbook remained `1`.
  - Table headers `A1:G1`, 30 data rows, parameter labels `I3:J7`, and dropdown validation rule on `J6` remained intact.
- **Repeated calls to `runStressTest()` (5 consecutive runs)**:
  - Lines 762–777: `sheet.getCharts().forEach(c => sheet.removeChart(c)); sheet.insertChart(chart);`
  - Verified: `sheet.getCharts().length` was strictly `1` after every execution. Zero chart accumulation or memory leakage.
- **Repeated calls to `buildHashTableFromTemplate()` (5 consecutive runs, alternating open addressing and chaining)**:
  - Old target sheets were deleted before recreating (`ss.deleteSheet(existing)`). Exactly 1 target sheet of each type existed.
  - Lines 1036–1040:
    ```javascript
    const existingFilter = targetSheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
    }
    targetSheet.getRange(1, 1, M + 1, 8).createFilter();
    ```
  - Defensive removal prior to recreation guaranteed that GAS error `There is already a filter on this sheet` was NEVER triggered.
- **Interactive Handlers & Tombstone Lifecycle**:
  - `insertRecordInteractive`: Cancel on phone or name prompt aborted cleanly without modifying spreadsheet or throwing unhandled errors.
  - `deleteRecordInteractive`: Non-existent phone number produced user-facing alert `не найдена`.
  - Deletion of existing phone installed tombstone `🪦 DELETED` in status column and set name to `[УДАЛЕНА]`.
  - Subsequent probe trace passed through `🪦 DELETED` slot to find downstream colliding records, validating tombstone preservation.

### 1.5 Modular vs Monolithic Deployment Parity
- Verified that loading modular files from `apps-script-deploy/` (`00_Config.js` through `06_UiMenu.js`) into an isolated GAS runtime environment produced identical outputs to `Code.gs`.

---

## 2. Logic Chain

1. **Premise 1**: In Google Sheets + Apps Script solutions with user-editable formula/code cells (`numKey`), malicious or invalid user input (e.g. syntax errors, infinite exceptions, `NaN`, negative returns) must never crash script triggers or corrupt workbook state.
   - **Verification**: `evaluateNumKey` wraps dynamic `new Function` compilation in a `try...catch` block. On runtime exception or syntax failure, it invokes `defaultFn(val)` extracting digits. If the result is numeric but negative or floating, `Math.floor(Math.abs(num))` normalizes it. If `NaN`, it returns `0`. All boundary inputs (`null`, `undefined`, objects, injection strings) produced valid non-negative integer outputs.
2. **Premise 2**: Hash table parameters entered by users (`M`, `step`, `fallback`, `N`) can take on degenerate values (`M=1`, `step=0`, `step=M`, `fallback=0`, `fallback=1`, `N=0`, `N>1000`). The engine must handle these without hanging in infinite loops or causing runtime crashes.
   - **Verification**:
     - `step=0` is guarded by `step > 0 ? step : 1`.
     - `step=M` loops on slot `h1`; the bounded loop `for (let i = 0; i < fallback; i++)` terminates in at most `fallback` iterations and throws a controlled overflow exception.
     - `fallback=0` defaults to `M`.
     - `fallback=1000` is clamped to `M`.
     - `N=0` defaults to `30`, and `N > 1000` is clamped to `999`.
     - `M=1` with Chaining successfully places all records into bucket 0; with Open Addressing, it places 1 record or throws overflow on collision.
3. **Premise 3**: Repeated user clicks on sheet buttons (idempotency) must not leak charts, duplicate sheets, or crash Google Sheets' filter API.
   - **Verification**:
     - `setupControlSheet` checks `sheetByName` before inserting.
     - `runStressTest` removes all prior charts before inserting a new chart.
     - `buildHashTableFromTemplate` checks and removes existing filters with `existingFilter.remove()` before calling `createFilter()`.
4. **Conclusion**: The codebase satisfies all requirements and exhibits high robustness against adversarial and extreme inputs.

---

## 3. Caveats

- Interactive UI dialogs (`Browser.msgBox`, `SpreadsheetApp.getUi().prompt`) were tested using `gas-mock.js` queued responses; actual Google Sheets modal rendering depends on client browser context, but the underlying business logic, state machines, and property services are fully validated.
- Timeouts in long-running user JS code: While syntax errors and throwing exceptions are caught instantly, an explicit user infinite loop (e.g. `while(true){}`) entered in cell `I10` would be bounded by Google Apps Script's native 6-minute trigger execution limit. This is standard Apps Script container sandbox behavior.

---

## 4. Conclusion

**VERDICT: APPROVE.**

The implementation is verified to be robust, defensively coded, mathematically sound, and fully compliant with all edge cases specified in the project requirements.

---

## 5. Verification Method

Independent reproduction commands:

1. **Run full standard test suite**:
   ```bash
   node test/run-tests.js
   ```
   *Expected*: 25/25 tests passing across all 4 tiers.

2. **Inspect adversarial stress test suite**:
   - File: `.agents/challenger_2/edge_stress.js`
   - Contains 35 unit and integration tests covering:
     - Section 1: Adversarial numKey inputs
     - Section 2: Knuth multiplicative hash boundary invariants
     - Section 3: Extreme table parameters (M=1, step=0/M/M+5, fallback=0/1/1000, N=0/1/999/2500)
     - Section 4: Spreadsheet operations idempotency & lifecycle
     - Section 5: Interactive operations edge cases & tombstone invariant
     - Section 6: Modular `apps-script-deploy/` parity

3. **Deploy verification to Google Sheets via Clasp**:
   ```bash
   cd apps-script-deploy
   npx @google/clasp push
   ```
