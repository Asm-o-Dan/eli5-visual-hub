# Comprehensive Codebase Survey & Gap Analysis

**Project**: Laboratory Work #1 — Hashing and Hash Tables (Variant 3: Phone Number, Linear Probing)  
**Target Platform**: Google Sheets + Google Apps Script (GAS)  
**Investigator**: `explorer_survey_1` (teamwork_preview_explorer)  
**Date**: 2026-09-10  
**Authoritative Reference**: `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

A comprehensive investigation was conducted on all source code, documentation, and data files within `data/hashing`:
- `Code.gs` (1,168 lines, 44,953 bytes)
- `README_GOOGLE_SHEETS.md` (85 lines, 9,062 bytes)
- `data_30_records.csv` (32 lines, 5,579 bytes)
- `evaluation_quality.csv` (23 lines, 1,722 bytes)
- `solution_lab1.py` (121 lines, 4,310 bytes)
- `solution_lab1.cpp` (335 lines, 12,102 bytes)

### Key Finding:
The existing `Code.gs` represents an **early static prototype** designed around a 21-variant academic comparison across four separate sheets (`Датасет`, `Метод_Цепочек_M30`, `Открытая_Адресация_M60`, `Оценка_Качества`).

It **lacks the primary interactive architecture** mandated by `ORIGINAL_REQUEST.md`:
1. **R1 Missing**: No `setupControlSheet()` and no «Панель_Управления» sheet. Missing the unified side-by-side layout (columns A..G for source data, columns I..N for settings/constants: $M=60$, $step=1$, $fallback=60$, dropdown validation `["Открытая адресация", "Метод цепочек"]`, $N=30$, and editable JS code for `numKey`). Missing dynamic code evaluation via `new Function()`. Missing Buttons 1, 2, 3.
2. **R2 Missing**: No `runStressTest()`. Missing synthetic phone generator for $N < 1000$ rows, missing frequency distribution bucket table ($0..M-1$), missing statistical metrics ($N/M$, max bucket collisions, empty slots, $\chi^2$ uniformity test), and missing creation/update of `EmbeddedChart` (type `COLUMN`).
3. **R3 Missing**: No hidden master template `_Шаблон_Таблицы_`. No `buildHashTableFromTemplate()` cloner. Existing linear probing is hardcoded to $step=1$ and ignores the $fallback$ limit. No `insertRecordInteractive()` function. Missing Google Sheets native autofilter (`createFilter()`).
4. **Testing Infrastructure Missing**: No `package.json`, no Node.js test scripts, no mock harness for `SpreadsheetApp`.

---

## 2. Inventory of Existing Files

| File | Size | Lines | Purpose & Current Role |
|---|---|---|---|
| `Code.gs` | 44,953 B | 1,168 | Primary Google Apps Script code. Contains 14 functions implementing dataset loading, chaining, open addressing for 21 variants, interactive search/delete, quality evaluation report, and sheet cleanup. |
| `README_GOOGLE_SHEETS.md` | 9,062 B | 85 | User manual explaining quick start in Google Sheets, button bindings, 21 variants table, and tombstone concept. Contains copy-paste typos in table functions (`uild...`). |
| `data_30_records.csv` | 5,579 B | 32 | Semicolon-delimited CSV containing 30 benchmark records (7 fields) matching academic guideline. |
| `evaluation_quality.csv` | 1,722 B | 23 | Reference benchmark results comparing all 21 variants against Knuth theoretical values ($S_n$). |
| `solution_lab1.py` | 4,310 B | 121 | Standalone Python 3 reference implementation with `ChainingHashTable` and `OpenAddressingHashTable`. |
| `solution_lab1.cpp` | 12,102 B | 335 | Standalone C++11 reference implementation with linked list chaining and open addressing with tombstone states. |

---

## 3. Detailed Audit of Existing `Code.gs`

### 3.1 Global Constants
- `KNUTH_A = (Math.sqrt(5) - 1) / 2` (line 21): Golden ratio constant $\approx 0.618033988749895$.
- `COPRIMES_60 = [1, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59]` (line 25): 16 Euler coprimes for secondary hash step $h_2(k)$ when $M=60$.
- `DATASET_HEADERS = ["Ф.И.О.", "Дата рождения", "Номер телефона", "Серия и номер паспорта", "Адрес прописки", "Номер банковского счета", "Остаток денег на счете"]` (line 28): 7 standard columns.
- `DEFAULT_DATASET_30` (lines 31–302): 30 static rows hardcoded directly into the script.

### 3.2 Existing Functions in `Code.gs`

```
┌───────────────────────────────────────┬────────────┬────────────────────────────────────────────────────────────────────────┐
│ Function Signature                    │ Lines      │ Functional Behavior & Current Limitations                              │
├───────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────────────────────┤
│ onOpen()                              │ 307–321    │ Builds top custom menu «⚡ Хеширование (Лаб 1)» with 7 items.            │
│ loadDataset()                         │ 326–377    │ Creates/resets sheet 'Датасет' with DEFAULT_DATASET_30. Fixed 30 rows. │
│ getDatasetRows()                      │ 382–393    │ Reads A2:G of sheet 'Датасет'. Auto-calls loadDataset() if empty.     │
│ extractNumericKey(val, colIdx)        │ 398–447    │ Hardcoded field converter (handles 7 columns). Static, non-editable.  │
│ knuthMultiplicativeHash(numKey, M)    │ 453–457    │ h(k) = floor(M * ((k * A) % 1)). Lacks boundary guard for posFrac=1.0. │
│ getDoubleHashStep(numKey)             │ 463–466    │ Secondary hash step for variant 15-21 double hashing.                  │
│ buildChainingTablePrompt()            │ 471–492    │ Modal prompt for col 1..7, delegates to buildChainingTable().          │
│ buildChainingTable(colIdx)            │ 497–621    │ Builds 'Метод_Цепочек_M30' from scratch. Hardcodes M=30.               │
│ buildOpenAddressingPrompt()           │ 626–648    │ Modal prompt for variant 1..21, delegates to buildOpenAddressingTable.│
│ buildOpenAddressingTable(variant)     │ 653–837    │ Builds 'Открытая_Адресация_M60' from scratch. Hardcodes M=60, step=1. │
│ searchKeyInteractive()                │ 842–934    │ Searches key in 'Открытая_Адресация_M60' using DocumentProperties.   │
│ deleteKeyInteractive()                │ 939–1016   │ Sets '🪦 DELETED' in 'Открытая_Адресация_M60'. Preserves trace.       │
│ buildEvaluationReport()               │ 1021–1145  │ Generates 21-row table on 'Оценка_Качества' vs Knuth formulas.         │
│ clearGeneratedSheets()                │ 1150–1167  │ Deletes all sheets except 'Датасет'.                                   │
└───────────────────────────────────────┴────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Gap Analysis: Current Code vs `ORIGINAL_REQUEST.md`

| Requirement Category | Requirement Specification (`ORIGINAL_REQUEST.md`) | Current Implementation in `Code.gs` | Gap Status | Severity |
|---|---|---|---|---|
| **R1: Main Control Sheet** | Sheet named «Панель_Управления» initialized by `setupControlSheet()` | Sheet is named «Датасет», lacks control panel | ❌ **MISSING** | **CRITICAL** |
| **R1: Left Data Layout** | Columns A..G: Source table with Col III = Phone `xx-xxx-xx` | Columns A..G exist on «Датасет», but not connected to control panel | ⚠️ **PARTIAL** | **HIGH** |
| **R1: Right Settings Layout** | Columns I..N: Parameter block ($M$, $step$, $fallback$, dropdown, $N$, JS code) | Non-existent; settings are hardcoded in GAS constants | ❌ **MISSING** | **CRITICAL** |
| **R1: Table Size $M$** | Cell with default $M = 60$, dynamically read by scripts | Hardcoded $M = 60$ in `buildOpenAddressingTable` and $M = 30$ in `buildChainingTable` | ❌ **MISSING** | **HIGH** |
| **R1: Probing Step $step$** | Cell with default $step = 1$, configurable | Probing step is hardcoded to $+1$ ($step$ parameter ignored) | ❌ **MISSING** | **HIGH** |
| **R1: Max Probes $fallback$** | Cell with default $fallback = 60$, halting probe loop on overflow | Probes up to $M$ times unconditionally, no configurable threshold | ❌ **MISSING** | **HIGH** |
| **R1: Method Dropdown** | Google Sheets Data Validation: `["Открытая адресация", "Метод цепочек"]` | No validation rule on sheet; prompted via modal UI text input | ❌ **MISSING** | **HIGH** |
| **R1: Records Count $N$** | Cell with default $N = 30$, supporting $N < 1000$ | Always loads exactly 30 hardcoded rows | ❌ **MISSING** | **HIGH** |
| **R1: Editable JS `numKey`** | Cell containing `val => parseInt(String(val).replace(/\D/g, ''), 10)` executed via `new Function()` | Hardcoded GAS function `extractNumericKey()` with rigid regex | ❌ **MISSING** | **CRITICAL** |
| **R1: Control Buttons** | 3 Buttons on Control Sheet: 🎲 Generate Data, ⚡ Build Table, 📈 Stress Test | Buttons must be manually created via Insert -> Drawing per README | ❌ **MISSING** | **HIGH** |
| **R2: Synthetic Phone Gen** | Generate $N$ phone numbers in format `xx-xxx-xx` for stress test | No phone number generator exists; only static array | ❌ **MISSING** | **CRITICAL** |
| **R2: Stress Test Engine** | `runStressTest()` computing hit frequencies for slots $0..M-1$ | No stress test function exists | ❌ **MISSING** | **CRITICAL** |
| **R2: Statistical Metrics** | Mean frequency $N/M$, max bucket collisions, empty slots, $\chi^2$ statistic | No metrics calculated for arbitrary $N$ / stress test | ❌ **MISSING** | **HIGH** |
| **R2: Embedded Column Chart** | `EmbeddedChart` (type `COLUMN`) created or updated on «Панель_Управления» | No chart generation code anywhere in `Code.gs` | ❌ **MISSING** | **CRITICAL** |
| **R3: Hidden Master Template** | Hidden sheet `_Шаблон_Таблицы_` with pre-formatted structure | No template sheet; tables created on-the-fly via code | ❌ **MISSING** | **HIGH** |
| **R3: Template Cloner** | `buildHashTableFromTemplate()` clones template to e.g. `Хеш_Таблица_Линейное_M60` | Creates sheet from scratch with hardcoded names | ❌ **MISSING** | **CRITICAL** |
| **R3: Probing Formula** | $h(k, i) = (h_1(k) + i \cdot step) \pmod M$ bounded by $fallback$ | Hardcoded $(h_1 + i) \pmod M$, no step factor, no fallback bound | ❌ **MISSING** | **HIGH** |
| **R3: Interactive Insert** | `insertRecordInteractive()` button on generated sheet | Only batch insertion on table build; no interactive record insertion | ❌ **MISSING** | **HIGH** |
| **R3: Interactive Delete** | `deleteRecordInteractive()` button on generated sheet with DELETED tombstone | `deleteKeyInteractive()` exists in menu, but looks at fixed sheet name | ⚠️ **PARTIAL** | **MEDIUM** |
| **R3: Native Autofilter** | Table slots have active Google Sheets Autofilter (`range.createFilter()`) | No `createFilter()` calls anywhere in `Code.gs` | ❌ **MISSING** | **MEDIUM** |

---

## 5. Critical Edge Cases, Mathematical Nuances & Known Bugs

### 5.1 Bug: Floating-Point Boundary Overflow in Multiplicative Hash
In `Code.gs` lines 453–457:
```javascript
function knuthMultiplicativeHash(numKey, M) {
  const frac = (numKey * KNUTH_A) % 1;
  const posFrac = frac < 0 ? frac + 1 : frac;
  return Math.floor(M * posFrac);
}
```
**Risk**: Due to IEEE-754 double precision rounding, if `posFrac` evaluates to `0.9999999999999999` or effectively `1.0`, `Math.floor(M * 1.0)` produces slot `M`. Since valid slots are $0 \le \text{slot} \le M-1$, slot $M$ causes an **array index out-of-bounds error**.  
**Required Fix**:
```javascript
const slot = Math.floor(M * posFrac);
return slot >= M ? M - 1 : (slot < 0 ? 0 : slot);
```

### 5.2 Dynamic `numKey` Execution via `new Function()`
**Challenge**: The user cell may contain:
- Arrow function expression: `val => parseInt(String(val).replace(/\D/g, ''), 10)`
- Parenthesized arrow function: `(val) => parseInt(String(val).replace(/\D/g, ''), 10)`
- Function expression: `function(val) { return parseInt(String(val).replace(/\D/g, ''), 10); }`
- Raw expression: `parseInt(String(val).replace(/\D/g, ''), 10)`

**Trap with `new Function()`**:
Calling `new Function('val', codeStr)` when `codeStr` is an arrow function `val => ...` results in a function that returns the arrow function, rather than executing it!  
**Required Robust Evaluator**:
```javascript
function compileUserNumKey(codeStr) {
  const defaultFn = (val) => {
    const digits = String(val).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };
  if (!codeStr || typeof codeStr !== 'string' || !codeStr.trim()) {
    return defaultFn;
  }
  const clean = codeStr.trim();
  try {
    // Attempt 1: Evaluate as an expression returning a callable function
    const fn = new Function(`"use strict"; return (${clean});`)();
    if (typeof fn === 'function') {
      return (val) => {
        try {
          const res = fn(val);
          const num = Number(res);
          return isNaN(num) ? defaultFn(val) : Math.abs(Math.floor(num));
        } catch (e) {
          return defaultFn(val);
        }
      };
    }
  } catch (err1) {
    // Attempt 2: Fall back to function body taking argument 'val'
    try {
      const fn = new Function('val', `"use strict"; ${clean.includes('return') ? clean : 'return ' + clean};`);
      return (val) => {
        try {
          const res = fn(val);
          const num = Number(res);
          return isNaN(num) ? defaultFn(val) : Math.abs(Math.floor(num));
        } catch (e) {
          return defaultFn(val);
        }
      };
    } catch (err2) {
      console.warn('Failed to compile numKey JS code, using default:', err2);
      return defaultFn;
    }
  }
  return defaultFn;
}
```

### 5.3 Linear Probing Step & Coprimality ($\gcd(step, M) = 1$)
- When $step > 1$, if $\gcd(step, M) \ne 1$, linear probing will **cycle through a subgroup of size $M / \gcd(step, M)$** and fail to inspect the entire table, causing premature overflow even when empty slots exist!
- With $M=60$, if $step=2$, only 30 slots are probed; if $step=5$, only 12 slots are probed.
- The algorithm must respect the `fallback` parameter: if `probes >= fallback`, terminate the search/insert loop and raise or return an `OVERFLOW` status.

### 5.4 Autofilter Collision in Google Sheets API
In Google Apps Script:
If a filter already exists on a sheet and `range.createFilter()` is invoked, GAS throws an unrecoverable runtime exception:  
`Exception: A filter already exists on the sheet.`  
**Required Fix**:
```javascript
const existingFilter = sheet.getFilter();
if (existingFilter) {
  existingFilter.remove();
}
range.createFilter();
```

### 5.5 Chart Duplication on Re-running Stress Test
In GAS, calling `sheet.insertChart(chart)` without cleaning previous charts will stack multiple charts on top of each other.  
**Required Fix**:
```javascript
const existingCharts = sheet.getCharts();
for (let i = 0; i < existingCharts.length; i++) {
  // Remove charts matching stress test position/title
  sheet.removeChart(existingCharts[i]);
}
sheet.insertChart(newChart);
```

### 5.6 Chi-Square Uniformity Statistic Calculation ($\chi^2$)
For testing uniform distribution of $N$ items hashed into $M$ slots:
- Observed frequencies: $O_i$ for $i = 0, \dots, M-1$
- Expected frequency: $E_i = \frac{N}{M}$
- Formula:
  $$\chi^2 = \sum_{i=0}^{M-1} \frac{(O_i - E_i)^2}{E_i} = \frac{M}{N} \sum_{i=0}^{M-1} \left(O_i - \frac{N}{M}\right)^2$$
- Critical values for $\alpha = 0.05$ with $df = M - 1 = 59$ is approximately $77.93$. If $\chi^2 \approx M \pm 2\sqrt{2M}$, the hash function demonstrates good uniformity.

---

## 6. Sheet Layout Architectures: As-Is vs To-Be

### 6.1 Current Layout (`Code.gs`)
```
Sheets in Spreadsheet:
├── [Датасет] (A1:G31: Raw data, no controls, no settings)
├── [Метод_Цепочек_M30] (Generated on demand)
├── [Открытая_Адресация_M60] (Generated on demand)
└── [Оценка_Качества] (Generated on demand)
```

### 6.2 Target Architecture (`ORIGINAL_REQUEST.md`)

```
Spreadsheet Structure:
├── [Панель_Управления] (Active Main Control Hub)
│   ├── Columns A..G: Source Dataset Table (Phone xx-xxx-xx in Col III)
│   │   ├── Row 1: Banner / Title
│   │   ├── Row 3: Headers [Ф.И.О., Дата рождения, Номер телефона, Паспорт, Адрес, Номер счета, Остаток]
│   │   └── Rows 4..N+3: Data rows (up to 1000 rows)
│   ├── Column H: Blank aesthetic margin separator (Width: 25px)
│   └── Columns I..N: Settings & Action Dashboard
│       ├── I1:N1: Control Panel Header Banner
│       ├── Settings Grid (Labels in I, Inputs in J..K):
│       │   ├── [I3:J3] Размер таблицы (M): 60
│       │   ├── [I4:J4] Шаг пробирования (step): 1
│       │   ├── [I5:J5] Макс. число проб (fallback): 60
│       │   ├── [I6:J6] Метод коллизий: [Открытая адресация ▼] (Data Validation)
│       │   ├── [I7:J7] Число записей (N): 30 (N < 1000)
│       │   └── [I8:J8] Код numKey (JS): val => parseInt(String(val).replace(/\D/g, ''), 10)
│       ├── Buttons Block:
│       │   ├── Button 1: 🎲 Сгенерировать N строк данных (generateSyntheticDataset)
│       │   ├── Button 2: ⚡ Построить хеш-таблицу (buildHashTableFromTemplate)
│       │   └── Button 3: 📈 Запустить стресс-тест (runStressTest)
│       ├── Stress-Test Metrics Card (Rows 13..18):
│       │   ├── Среднее число элементов в слоте (N/M)
│       │   ├── Максимум коллизий в одном слоте
│       │   ├── Число пустых слотов
│       │   └── Критерий равномерности (χ²)
│       ├── Stress-Test Frequency Distribution Table (Rows 20..20+M):
│       │   └── [Слот i, Ожидаемое E_i, Частота O_i, Отклонение]
│       └── Embedded Column Chart:
│           └── Visual histogram of O_i across slots 0..M-1 placed at Column K..N
├── [_Шаблон_Таблицы_] (Hidden Template Sheet)
│   ├── Pre-formatted slot table headers, borders, column widths, conditional formats
│   └── Buttons: «➕ Добавить запись», «🗑️ Удалить запись»
└── [Хеш_Таблица_Линейное_M60] (Cloned Instance)
    ├── Cloned from _Шаблон_Таблицы_
    ├── Table of M slots populated with data from Панель_Управления
    ├── Native Autofilter active on slot headers
    └── Interactive Handlers operational
```

---

## 7. Actionable Implementation Recommendations

1. **Retain Benchmark Code as Legacy / Sub-module**:
   The existing `DEFAULT_DATASET_30` and multi-variant evaluation algorithms in `Code.gs` are high quality for academic defense. They should be retained as a secondary module or helper library rather than discarded, but the primary entry points must strictly satisfy `ORIGINAL_REQUEST.md`.

2. **Refactor `Code.gs` into Clean Modular Sections**:
   - `01_CONSTANTS.gs`: Default configurations, Knuth constants, Russian names/surnames data pools for synthetic generator.
   - `02_CORE_HASHING.gs`: Multiplicative Knuth hash with boundary clamping, dynamic `numKey` compilation/evaluation with fallback.
   - `03_DATA_GENERATOR.gs`: Fast synthetic Russian records generator ($N < 1000$) with phone numbers `xx-xxx-xx`.
   - `04_CONTROL_PANEL.gs`: `setupControlSheet()`, settings reader, data validation builder, sheet styling.
   - `05_STRESS_TEST.gs`: `runStressTest()`, frequency calculations, statistical metrics ($\chi^2$), `EmbeddedChart` builder/updater.
   - `06_TEMPLATE_ENGINE.gs`: `_Шаблон_Таблицы_` hidden creator, `buildHashTableFromTemplate()`, open addressing (with $step$ and $fallback$) and chaining renderers, native autofilter setup.
   - `07_INTERACTIVE.gs`: `insertRecordInteractive()`, `deleteRecordInteractive()` with tombstone `🪦 DELETED`.
   - `08_MENU.gs`: Updated `onOpen()` menu pointing to new functions with legacy fallbacks.

3. **Offline Node.js Test Harness**:
   Create a comprehensive Node.js mock of the Google Apps Script environment (`gas-mock.js`) covering `SpreadsheetApp`, `Sheet`, `Range`, `DataValidationBuilder`, `EmbeddedChartBuilder`, `PropertiesService`, and `Browser`/`Ui` to allow running automated unit and regression tests locally.

4. **Documentation Updates**:
   Update `README_GOOGLE_SHEETS.md` to document the new control panel, how to assign the 3 buttons, how to edit the `numKey` cell, and how the template cloning operates. Fix the typos in the markdown table.
