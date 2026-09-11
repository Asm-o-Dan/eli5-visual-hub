# Master Execution Plan: Lab 1 (Variant 3) Interactive Hashing in GAS & Sheets

## Objective
Implement a production-grade, interactive Google Apps Script (GAS) and Google Sheets architecture for Laboratory Work #1 (Variant 3: Phone number, Linear probing), featuring:
1. Control Panel («Панель_Управления») with Left Data Table (A..G) and Right Settings Panel (I..N).
2. Dynamic JS `numKey` execution via `new Function()`.
3. Stress test generator with frequency distribution, statistical metrics, and embedded column chart.
4. Hidden template cloner `buildHashTableFromTemplate()` with open addressing (EMPTY/OCCUPIED/DELETED, probe traces) and separate chaining, interactive record insertion/deletion, and native auto-filter.
5. Robust mock test harness for offline Node.js verification and comprehensive E2E tests.

---

## Phases & Milestones

### Phase 0: Survey & Exploration
- Spawn 3 Explorers to examine existing `Code.gs`, `README_GOOGLE_SHEETS.md`, dependencies, and structure in `data/hashing`.
- Extract requirements, existing patterns, edge cases, and testing needs.
- Output: `survey_summary.md` and initial `PROJECT.md`.

### Phase 1: Architecture, Decomposition & Interface Contracts
- Compile master `PROJECT.md` with complete Feature Inventory, Milestones, Interface Contracts, and Code Layout.
- Establish GAS mock infrastructure plan for offline testing.

### Phase 2: Implementation & Iteration Loop
- **Milestone 1**: Core Data Structures & Algorithms
  - Dynamic `numKey` sandbox execution (`new Function`) with sanitization and fallback.
  - Knuth multiplicative hash $h(k) = \lfloor M \cdot ((k \cdot A) \pmod 1) \rfloor$.
  - Linear Probing open addressing logic with step & fallback constraints.
  - Separate Chaining fallback implementation.
  - Synthetic data generator (xx-xxx-xx phone numbers, full names, dates, passports, balances).
- **Milestone 2**: Control Sheet & Stress Test Engine
  - `setupControlSheet()` layout engine (A..G table, I..N settings, dropdown validation, buttons).
  - `runStressTest()` with distribution table, statistical metrics (mean, max bucket, empty slots, $\chi^2$ statistic), and EmbeddedChart COLUMN creation/update.
- **Milestone 3**: Template Cloner & Interactive Sheet Handlers
  - Hidden master template `_Шаблон_Таблицы_` initialization.
  - `buildHashTableFromTemplate()` cloner, slot population with status formatting and probe traces.
  - Interactive operations: `insertRecordInteractive()`, `deleteRecordInteractive()`.
  - Native sheet auto-filter (`createFilter()`).
- **Milestone 4**: Test Harness, E2E Verification & Adversarial Auditing
  - Comprehensive GAS API mock suite in Node.js.
  - Tier 1-4 test cases (coverage, boundaries, combinations, realistic workflows).
  - Reviewer, Challenger, and Forensic Auditor verification.

### Phase 3: Final Presentation & Delivery
- Compile README and verification reports.
- Deliver victory report to parent caller.
