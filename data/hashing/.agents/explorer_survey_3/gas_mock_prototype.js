/**
 * Minimal GAS Mock Prototype for explorer_survey_3
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createGasEnvironment() {
  const documentProperties = new Map();

  class MockRange {
    constructor(sheet, row, col, numRows = 1, numCols = 1) {
      this.sheet = sheet;
      this.startRow = row;
      this.startCol = col;
      this.numRows = numRows;
      this.numCols = numCols;
    }

    getValue() {
      return this.sheet._getCell(this.startRow, this.startCol).value;
    }

    setValue(val) {
      for (let r = 0; r < this.numRows; r++) {
        for (let c = 0; c < this.numCols; c++) {
          this.sheet._getCell(this.startRow + r, this.startCol + c).value = val;
        }
      }
      return this;
    }

    getValues() {
      const res = [];
      for (let r = 0; r < this.numRows; r++) {
        const row = [];
        for (let c = 0; c < this.numCols; c++) {
          row.push(this.sheet._getCell(this.startRow + r, this.startCol + c).value);
        }
        res.push(row);
      }
      return res;
    }

    setValues(values2D) {
      for (let r = 0; r < this.numRows; r++) {
        for (let c = 0; c < this.numCols; c++) {
          this.sheet._getCell(this.startRow + r, this.startCol + c).value = values2D[r][c];
        }
      }
      return this;
    }

    merge() { return this; }
    setBackground(c) { return this; }
    setFontColor(c) { return this; }
    setFontWeight(w) { return this; }
    setFontSize(s) { return this; }
    setFontFamily(f) { return this; }
    setHorizontalAlignment(a) { return this; }
    setVerticalAlignment(a) { return this; }
    setWrap(w) { return this; }
    setBorder() { return this; }
    createFilter() { return { getRange: () => this }; }
    setDataValidation() { return this; }
  }

  class MockSheet {
    constructor(name) {
      this.name = name;
      this.cells = new Map(); // "row,col" => { value, ... }
      this.charts = [];
    }

    getName() { return this.name; }
    setName(n) { this.name = n; return this; }

    _getCell(r, c) {
      const k = `${r},${c}`;
      if (!this.cells.has(k)) {
        this.cells.set(k, { value: '' });
      }
      return this.cells.get(k);
    }

    getRange(rowOrA1, col, numRows, numCols) {
      if (typeof rowOrA1 === 'string') {
        return this._parseA1(rowOrA1);
      }
      return new MockRange(this, rowOrA1, col, numRows || 1, numCols || 1);
    }

    _parseA1(a1) {
      // Simplified parser for prototype
      const parts = a1.split(':');
      const start = this._colRowFromA1(parts[0]);
      if (parts.length === 1) {
        return new MockRange(this, start.row, start.col, 1, 1);
      }
      const end = this._colRowFromA1(parts[1]);
      return new MockRange(this, start.row, start.col, end.row - start.row + 1, end.col - start.col + 1);
    }

    _colRowFromA1(token) {
      const match = token.match(/([A-Z]+)([0-9]+)/);
      if (!match) return { row: 1, col: 1 };
      const colStr = match[1];
      let col = 0;
      for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 64);
      }
      return { row: parseInt(match[2], 10), col };
    }

    clear() { this.cells.clear(); return this; }
    setRowHeight() { return this; }
    setColumnWidth() { return this; }
    autoResizeColumn() { return this; }
    setActiveRange() { return this; }
    getLastRow() {
      let maxR = 0;
      for (const [k, v] of this.cells.entries()) {
        if (v.value !== '' && v.value !== undefined && v.value !== null) {
          const r = parseInt(k.split(',')[0], 10);
          if (r > maxR) maxR = r;
        }
      }
      return maxR;
    }
    getLastColumn() {
      let maxC = 0;
      for (const [k, v] of this.cells.entries()) {
        if (v.value !== '' && v.value !== undefined && v.value !== null) {
          const c = parseInt(k.split(',')[1], 10);
          if (c > maxC) maxC = c;
        }
      }
      return maxC;
    }
    getCharts() { return this.charts; }
    newChart() {
      const chart = { ranges: [], options: {} };
      return {
        asColumnChart() { chart.type = 'COLUMN'; return this; },
        addRange(r) { chart.ranges.push(r); return this; },
        setPosition(r, c) { chart.position = { r, c }; return this; },
        setOption(k, v) { chart.options[k] = v; return this; },
        build() { return chart; }
      };
    }
    insertChart(c) { this.charts.push(c); }
    removeChart(c) {
      const idx = this.charts.indexOf(c);
      if (idx >= 0) this.charts.splice(idx, 1);
    }
  }

  class MockSpreadsheet {
    constructor() {
      this.sheets = [new MockSheet('Датасет')];
      this.activeSheet = this.sheets[0];
    }
    getSheetByName(n) {
      return this.sheets.find(s => s.name === n) || null;
    }
    insertSheet(n, idx) {
      const s = new MockSheet(n);
      if (idx !== undefined) this.sheets.splice(idx, 0, s);
      else this.sheets.push(s);
      return s;
    }
    deleteSheet(s) {
      const idx = this.sheets.indexOf(s);
      if (idx >= 0) this.sheets.splice(idx, 1);
    }
    getSheets() { return [...this.sheets]; }
    setActiveSheet(s) { this.activeSheet = s; return s; }
    getActiveSpreadsheet() { return this; }
  }

  const ss = new MockSpreadsheet();

  const mockUi = {
    alerts: [],
    prompts: [],
    createMenu(caption) {
      return {
        addItem() { return this; },
        addSeparator() { return this; },
        addToUi() { return this; }
      };
    },
    alert(title, msg, buttons) {
      mockUi.alerts.push({ title, msg });
      return 'OK';
    },
    prompt(title, msg, buttons) {
      mockUi.prompts.push({ title, msg });
      return {
        getSelectedButton: () => 'OK',
        getResponseText: () => '3'
      };
    },
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' },
    Button: { OK: 'OK', CANCEL: 'CANCEL' }
  };

  const mockSpreadsheetApp = {
    getActiveSpreadsheet: () => ss,
    getUi: () => mockUi,
    BorderStyle: { SOLID: 'SOLID', SOLID_MEDIUM: 'SOLID_MEDIUM' },
    ChartType: { COLUMN: 'COLUMN', BAR: 'BAR' },
    newDataValidation() {
      return {
        requireValueInList(list) { return this; },
        build() { return {}; }
      };
    }
  };

  const mockPropertiesService = {
    getDocumentProperties: () => ({
      getProperty: (k) => documentProperties.get(k) || null,
      setProperty: (k, v) => documentProperties.set(k, String(v)),
      deleteProperty: (k) => documentProperties.delete(k),
      deleteAllProperties: () => documentProperties.clear()
    })
  };

  return {
    SpreadsheetApp: mockSpreadsheetApp,
    PropertiesService: mockPropertiesService,
    _ss: ss,
    _ui: mockUi
  };
}

module.exports = { createGasEnvironment };
