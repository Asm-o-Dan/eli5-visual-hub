# Handoff Report — Codebase Audit & Gap Survey

**Agent**: `explorer_survey_1` (teamwork_preview_explorer)  
**Date**: 2026-09-10  
**Target Milestone**: Phase 0 (Survey & Exploration) -> Phase 1 (Architecture & Specification)  
**Detailed Report**: `C:/Users/DaniilTuT/Documents/antigravity/eli5-visual-hub/data/hashing/.agents/explorer_survey_1/survey_codebase.md`

---

## 1. Observation

1. **File Inventory**:
   - `Code.gs`: 1,168 lines, 44,953 bytes. Contains 14 functions (`onOpen`, `loadDataset`, `getDatasetRows`, `extractNumericKey`, `knuthMultiplicativeHash`, `getDoubleHashStep`, `buildChainingTablePrompt`, `buildChainingTable`, `buildOpenAddressingPrompt`, `buildOpenAddressingTable`, `searchKeyInteractive`, `deleteKeyInteractive`, `buildEvaluationReport`, `clearGeneratedSheets`).
   - `README_GOOGLE_SHEETS.md`: 85 lines, 9,062 bytes. Contains user instructions for 21 variants. Contains typos at lines 45, 46, 49 (`uildChainingTablePrompt`, `uildOpenAddressingPrompt`, `uildEvaluationReport`).
   - `data_30_records.csv`: 32 lines, 5,579 bytes. 30 benchmark records with 7 columns.
   - `evaluation_quality.csv`: 23 lines, 1,722 bytes. 21 variants comparison table vs Knuth formulas.
   - `solution_lab1.py`: 121 lines, 4,310 bytes. Standalone Python reference.
   - `solution_lab1.cpp`: 335 lines, 12,102 bytes. Standalone C++ reference.
   - No `package.json`, no automated test files, no mock framework exists in the repository.
   - Node.js `v22.23.0` and Python `3.14.2` are installed and functional in the environment.

2. **Absence of Core Requirements from `ORIGINAL_REQUEST.md`**:
   - `ORIGINAL_REQUEST.md` Line 13: `setupControlSheet()` is **not defined** in `Code.gs`. (Grep search for `setupControlSheet` yielded 0 matches).
   - `ORIGINAL_REQUEST.md` Line 12: Sheet «Панель_Управления» is **not referenced or created** anywhere in `Code.gs`. The dataset is loaded onto sheet «Датасет» (lines 328, 384).
   - `ORIGINAL_REQUEST.md` Lines 15–23: Settings block in columns I..N ($M=60$, $step=1$, $fallback=60$, dropdown `["Открытая адресация", "Метод цепочек"]`, $N=30$, editable JS code for `numKey`) does **not exist**.
   - `ORIGINAL_REQUEST.md` Line 23: Dynamic JS compilation of `numKey` via `new Function()` is **not implemented**. `extractNumericKey()` at lines 398–447 uses a hardcoded static regex and switch construct.
   - `ORIGINAL_REQUEST.md` Line 29: `runStressTest()` is **not defined** in `Code.gs`. (Grep search for `runStressTest` yielded 0 matches).
   - `ORIGINAL_REQUEST.md` Line 34: `EmbeddedChart` (type `COLUMN`) is **not created or referenced** in `Code.gs`.
   - `ORIGINAL_REQUEST.md` Line 37: Hidden master template `_Шаблон_Таблицы_` is **not implemented**.
   - `ORIGINAL_REQUEST.md` Line 38: `buildHashTableFromTemplate()` is **not defined**. Existing functions `buildOpenAddressingTable()` (line 653) and `buildChainingTable()` (line 497) create sheets from scratch with hardcoded formats.
   - `ORIGINAL_REQUEST.md` Line 41: Linear probing in `buildOpenAddressingTable` (line 707) uses `slot = (h1 + i) % M;`. It ignores the configurable `step` parameter and has no `fallback` limit stopping condition.
   - `ORIGINAL_REQUEST.md` Line 44: `insertRecordInteractive()` is **not defined**.
   - `ORIGINAL_REQUEST.md` Line 46: `range.createFilter()` is **not invoked** anywhere in `Code.gs`.

3. **Multiplicative Hash Edge Case**:
   - In `Code.gs` line 455: `const frac = (numKey * KNUTH_A) % 1; const posFrac = frac < 0 ? frac + 1 : frac; return Math.floor(M * posFrac);`. If IEEE-754 precision evaluates `posFrac` to `1.0`, `Math.floor(M * 1.0) === M`, which is an out-of-bounds slot index ($0..M-1$).

---

## 2. Logic Chain

1. *From Observation 1 & 2*: `Code.gs` contains an extensive, working implementation of a 21-variant comparison tool for Variant 1–21. However, the user request (`ORIGINAL_REQUEST.md`) explicitly demands a unified interactive architecture centered on **Variant 3 (Phone number, Linear probing)** with a single Main Control Sheet («Панель_Управления»), editable JS code in a cell, synthetic data generation, stress testing with an embedded column chart, template cloning, and interactive add/delete buttons with autofilter.
2. *From Observation 2*: None of the three core entry point functions demanded by the user prompt (`setupControlSheet`, `runStressTest`, `buildHashTableFromTemplate`) exist in `Code.gs`.
3. *From Observation 2*: The current open addressing implementation does not support the requested parameterization ($step$, $fallback$), nor does it support interactive insertion (`insertRecordInteractive`).
4. *From Observation 1 & 3*: The project currently lacks automated offline testing. Because Node.js v22 is available, creating a lightweight mock suite for `SpreadsheetApp` will allow 100% test coverage and validation of all spreadsheet manipulation logic without needing deployment to a live Google Sheet.
5. *Therefore*: The existing `Code.gs` must be substantially refactored or augmented with the missing R1, R2, and R3 architectures. The existing 21-variant calculation logic can be retained as a secondary reference module.

---

## 3. Caveats

1. **GAS Graphical Buttons**: Apps Script cannot programmatically create Google Drawing button objects and bind scripts to them via public API; Google Sheets only allows script-assigned drawings through the GUI. However, GAS can create custom menu items (`onOpen`), checkbox / button triggers, or use standard cell triggers (`onEdit`), and clear documentation can be provided in `README_GOOGLE_SHEETS.md` for manual button assignment.
2. **`new Function()` in GAS**: GAS executes in a V8 runtime environment where `new Function()` is permitted, but user-provided syntax can be malformed (e.g. arrow function vs function body vs expression). The implementation must wrap compilation in dual `try...catch` blocks with fallback to default sanitization.
3. **Template Cloning**: When cloning a sheet using `sheet.copyTo(spreadsheet)`, the copied sheet is given a name like `Copy of ...`. The script must immediately rename it and ensure old instances are cleaned up or versioned.

---

## 4. Conclusion

The current codebase contains foundational algorithms for Knuth hashing and 30-record datasets, but is missing ~70% of the interactive features specified in `ORIGINAL_REQUEST.md`:
- **R1**: Main sheet «Панель_Управления» with dual-pane layout, validation dropdown, and dynamic JS `numKey` cell evaluation.
- **R2**: Synthetic data generator ($N < 1000$), stress test engine with $\chi^2$ uniformity statistics, and `EmbeddedChart` histogram creation.
- **R3**: Hidden master template `_Шаблон_Таблицы_`, `buildHashTableFromTemplate()` cloner, parameterized linear probing ($step$, $fallback$), `insertRecordInteractive()`, and native `createFilter()`.

A comprehensive gap report and architecture blueprint has been written to:  
`C:/Users/DaniilTuT/Documents/antigravity/eli5-visual-hub/data/hashing/.agents/explorer_survey_1/survey_codebase.md`.

---

## 5. Verification Method

To independently verify these findings:
1. **Grep for missing function names**:
   ```powershell
   cd C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub\data\hashing
   Select-String -Path .\Code.gs -Pattern "setupControlSheet", "runStressTest", "buildHashTableFromTemplate", "insertRecordInteractive", "createFilter", "new Function"
   ```
   *Expected Result*: 0 matches.
2. **Inspect current sheet creation**:
   ```powershell
   Select-String -Path .\Code.gs -Pattern "insertSheet"
   ```
   *Expected Result*: Matches only on `'Датасет'`, `'Метод_Цепочек_M30'`, `'Открытая_Адресация_M60'`, `'Оценка_Качества'`.
3. **Inspect survey report**:
   Read `C:/Users/DaniilTuT/Documents/antigravity/eli5-visual-hub/data/hashing/.agents/explorer_survey_1/survey_codebase.md`.
