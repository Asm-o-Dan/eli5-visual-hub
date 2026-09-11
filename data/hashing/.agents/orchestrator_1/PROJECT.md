# Project: Lab 1 (Variant 3) Interactive Hashing Architecture in GAS & Google Sheets

## Architecture
The system provides a comprehensive, interactive Google Sheets application powered by Google Apps Script (GAS) for Variant 3 (Phone number key, Linear probing), with fallback support for Separate Chaining.

```
+---------------------------------------------------------------------------------------------------+
|                                      Spreadsheet (Workbook)                                       |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Sheet: «Панель_Управления» (Main Control Dashboard)                                        |  |
|  |                                                                                             |  |
|  | [Cols A..G: Left Data Table]               [Cols I..N: Settings & Controls]                  |  |
|  | - Col I: ID                                - M (Table size, default: 60)                     |  |
|  | - Col II: Full Name                        - step (Linear probe step, default: 1)            |  |
|  | - Col III: Phone (xx-xxx-xx) [KEY]         - fallback (Max probes, default: 60)              |  |
|  | - Col IV: Date                             - Method Dropdown: [Открытая адресация, Цепочки]  |  |
|  | - Col V: Passport                          - N (Records count, default: 30)                  |  |
|  | - Col VI: Address                          - JS numKey Code (editable, new Function())       |  |
|  | - Col VII: Account                         - Buttons: [🎲 Generate], [⚡ Build], [📈 Stress] |  |
|  | - Col VIII: Balance                        - Stress Distribution Table (Slots 0..M-1)        |  |
|  |                                            - Statistical Summary (Mean, Max, Empty, Chi^2)   |  |
|  |                                            - EmbeddedChart (Type: COLUMN histogram)          |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +-------------------------------------+      +------------------------------------------------+  |
|  | Hidden Sheet: `_Шаблон_Таблицы_`    |      | Generated Sheet: `Хеш_Таблица_Линейное_M60`     |  |
|  | - Formatted blueprint               | ---> | - Cloned from template                         |  |
|  | - Master header & column styles     |      | - Slots 0..M-1 populated                        |  |
|  | - Status color templates            |      | - Statuses: EMPTY, OCCUPIED, DELETED           |  |
|  | - Pre-configured formula boundaries |      | - Probe counts & trace strings                 |  |
|  |                                     |      | - Native Auto-Filter (createFilter)            |  |
|  |                                     |      | - Interactive Buttons: [➕ Добавить], [🗑️ Удалить]|
|  +-------------------------------------+      +------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## Feature Inventory
Every feature identified during the survey is assigned to a specific milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Dual-Pane Layout | Setup «Панель_Управления» with left data table (A..G) and right settings (I..N) | M2 | ORIGINAL_REQUEST §R1 |
| F02 | Data Schema & Col III Key | Columns: ID, ФИО, Телефон (xx-xxx-xx), Дата, Паспорт, Адрес, Счет, Остаток | M2 | ORIGINAL_REQUEST §R1 |
| F03 | Settings Block | Cells for M=60, step=1, fallback=60, N=30 with formatting and boundaries | M2 | ORIGINAL_REQUEST §R1 |
| F04 | Method Validation Dropdown | In-cell dropdown with options ["Открытая адресация", "Метод цепочек"] | M2 | ORIGINAL_REQUEST §R1 |
| F05 | Dynamic JS `numKey` Cell | Editable JS code in cell, dynamically compiled via `new Function('val', ...)` | M1 | ORIGINAL_REQUEST §R1 |
| F06 | Dashboard Buttons | 🎲 Generate N rows, ⚡ Build hash table, 📈 Run stress test | M2 | ORIGINAL_REQUEST §R1 |
| F07 | Synthetic Data Generator | Generates $N < 1000$ Russian names, valid phones xx-xxx-xx, dates, passports, etc. | M1 | ORIGINAL_REQUEST §R1/R2 |
| F08 | Knuth Multiplicative Hashing | $h(k) = \lfloor M \cdot ((k \cdot A) \bmod 1) \rfloor$ with bounds check $[0, M-1]$ | M1 | ORIGINAL_REQUEST §R2 |
| F09 | Stress Test Frequency Table | Evaluates slot frequencies $0..M-1$ across $N$ synthetic keys | M2 | ORIGINAL_REQUEST §R2 |
| F10 | Statistical Metrics Engine | Computes $\bar{f}=N/M$, max bucket collisions, empty slots, and $\chi^2$ goodness-of-fit | M2 | ORIGINAL_REQUEST §R2 |
| F11 | Embedded Distribution Chart | Creates or updates Google Sheets `EmbeddedChart` (type COLUMN) | M2 | ORIGINAL_REQUEST §R2 |
| F12 | Hidden Template Sheet | Master sheet `_Шаблон_Таблицы_` with styles, headers, and color rules | M3 | ORIGINAL_REQUEST §R3 |
| F13 | Template Cloner | Clones template to target sheet and populates slots from left table | M3 | ORIGINAL_REQUEST §R3 |
| F14 | Open Addressing State Machine | Tracks EMPTY, OCCUPIED, DELETED states, probe counts, step traces | M1, M3 | ORIGINAL_REQUEST §R3 |
| F15 | Linear Probing Resolution | Sequence $h(k, i) = (h_1(k) + i \cdot \text{step}) \bmod M$ with fallback stopping limit | M1, M3 | ORIGINAL_REQUEST §R3 |
| F16 | Separate Chaining Resolution | Alternative collision resolution with linked lists and chain lengths | M1, M3 | ORIGINAL_REQUEST §R3 |
| F17 | Interactive Record Insertion | `insertRecordInteractive()`: dialog prompt, probe sequence, tombstone reuse | M3 | ORIGINAL_REQUEST §R3 |
| F18 | Interactive Record Deletion | `deleteRecordInteractive()`: dialog prompt, probe sequence, DELETED tombstone | M3 | ORIGINAL_REQUEST §R3 |
| F19 | Native Sheet Auto-Filter | Safely applies `range.createFilter()`, removing existing filters first | M3 | ORIGINAL_REQUEST §R3 |
| F20 | Clasp Direct Deployment | Configure `.clasp.json` (ID: 1vDunYWHoqNFp51aOcDhYYyiZ9kpGU9d9LsPglFnuoIg) and push via `npx @google/clasp push` | M4 | ORIGINAL_REQUEST Follow-up |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Hashing & Test Infra | `gas-mock.js`, dynamic `numKey`, Knuth hash, linear probing algorithm, chaining, data generator, unit tests | None | DONE |
| M2 | Control Sheet & Stress Test | `setupControlSheet()`, settings block, buttons, `runStressTest()`, statistical metrics, `EmbeddedChart` | M1 | DONE |
| M3 | Template Cloner & Interactive Handlers | Hidden `_Шаблон_Таблицы_`, `buildHashTableFromTemplate()`, `insertRecordInteractive()`, `deleteRecordInteractive()`, `createFilter()` | M1, M2 | DONE |
| M4 | E2E Verification & Clasp Deployment | Comprehensive 4-tier E2E test suite in `node:test`, Reviewer, Challenger, Forensic Auditor, and live Clasp Push to Google Spreadsheet | M1, M2, M3 | DONE |

---

## Interface Contracts

### Module: `AlgorithmEngine` ↔ `SheetControllers`
- `evaluateNumKey(val: any, codeString: string): number`
  - Input: raw cell value, user-defined JS code string (e.g. `val => parseInt(String(val).replace(/\D/g, ''), 10)`).
  - Output: non-negative integer. If user code throws or returns NaN, falls back to default digits extraction.
- `knuthMultiplicativeHash(numKey: number, M: number): number`
  - Input: integer $k \ge 0$, table size $M > 0$.
  - Formula: $A = (\sqrt{5} - 1)/2 \approx 0.618033988749895$.
  - Return: $\min(M - 1, \max(0, \lfloor M \cdot ((k \cdot A) \bmod 1) \rfloor))$.
- `resolveLinearProbing(records, M, step, fallback, numKeyFn)`
  - Input: array of records, table size $M$, step size $step$, max probes $fallback$, compiled key extractor $numKeyFn$.
  - Returns: array of $M$ slots: `{ slotIndex, status: 'EMPTY'|'OCCUPIED'|'DELETED', record, probeCount, probeTrace: number[] }`.
- `computeUniformityStatistics(frequencies: number[], N: number, M: number)`
  - Returns: `{ mean: N/M, maxCollisions: number, emptySlots: number, chiSquare: number }`.
  - Formula for $\chi^2 = \sum_{i=0}^{M-1} \frac{(f_i - N/M)^2}{N/M}$.

### Module: `ControlSheetController`
- `setupControlSheet(): Sheet`
  - Formats «Панель_Управления», writes dataset columns A..G, settings I..N, dropdown validation at `L5`.
- `runStressTest(): void`
  - Reads settings from «Панель_Управления», generates $N$ phones, evaluates frequencies, writes frequency table & stats, renders/updates `EmbeddedChart`.

### Module: `TemplateClonerController`
- `buildHashTableFromTemplate(): Sheet`
  - Clones `_Шаблон_Таблицы_` into `Хеш_Таблица_Линейное_M{M}`, populates slots, calls `createFilter()`.
- `insertRecordInteractive(): void`
  - Reads input via `SpreadsheetApp.getUi().prompt()`, searches slot, inserts or updates tombstone.
- `deleteRecordInteractive(): void`
  - Searches phone in table, replaces with `🪦 DELETED`.

---

## Code Layout
- `Code.gs`: Single-source Google Apps Script file for easy copy-pasting into Google Sheets Apps Script IDE.
- `test/gas-mock.js`: Lightweight, zero-dependency Node.js mock of Google Apps Script environment (`SpreadsheetApp`, `Range`, `Sheet`, `EmbeddedChart`, `DataValidation`, `Ui`).
- `test/run-tests.js`: Test runner leveraging Node.js `node:test` covering Tiers 1-4.
- `README_GOOGLE_SHEETS.md`: End-user documentation, button assignment instructions, lab manual notes.
