/**
 * ==============================================================================================
 * High-Fidelity Google Apps Script (GAS) Mock Environment for Node.js
 * 
 * Provides an in-memory emulation of:
 * - SpreadsheetApp (getActiveSpreadsheet, getUi, flush, newDataValidation, enums, etc.)
 * - Spreadsheet (sheets management, active sheet/range, toasts, cloning)
 * - Sheet (sparse cell matrix, getRange, getDataRange, getLastRow/Column, copyTo deep cloner,
 *          hideSheet, isSheetHidden, showSheet, createFilter, getFilter, chart management)
 * - Range (getValue/s, setValue/s, formatting, borders, validations, createFilter, A1 notation)
 * - EmbeddedChart & EmbeddedChartBuilder (COLUMN chart type, options, ranges, container info)
 * - DataValidation & DataValidationBuilder (requireValueInList, allowInvalid, criteria)
 * - Ui (alert, prompt with queued response injection for automated headless tests, Button, Menu)
 * - PropertiesService (getDocumentProperties, getScriptProperties with Map store)
 * - Utilities (formatDate, formatString, sleep, base64)
 * - Logger (log, getLog, clear)
 * 
 * Zero external dependencies. Uses standard Node.js runtime.
 * ==============================================================================================
 */

/**
 * Converts a 1-based column number to A1 column letters (e.g. 1 -> A, 27 -> AA)
 */
function colNumberToLetter(colNum) {
  let temp = colNum;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Converts column letter to 1-based column number (e.g. 'A' -> 1, 'AA' -> 27)
 */
function colLetterToNumber(colStr) {
  let col = 0;
  const upper = String(colStr || '').toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col;
}

/**
 * Represents a single cell in a worksheet
 */
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

  clone() {
    const c = new Cell(this.value);
    c.formula = this.formula;
    c.background = this.background;
    c.fontColor = this.fontColor;
    c.fontWeight = this.fontWeight;
    c.fontSize = this.fontSize;
    c.fontFamily = this.fontFamily;
    c.horizontalAlignment = this.horizontalAlignment;
    c.verticalAlignment = this.verticalAlignment;
    c.wrap = this.wrap;
    c.numberFormat = this.numberFormat;
    c.border = this.border ? { ...this.border } : null;
    c.dataValidation = this.dataValidation;
    return c;
  }
}

/**
 * Parses A1 notation into row and col bounding coordinates
 */
function parseA1(a1Notation, sheet) {
  // Strip optional sheet prefix: "Sheet1!A1:B2" -> "A1:B2"
  let cleanA1 = a1Notation.trim();
  const exclIdx = cleanA1.lastIndexOf('!');
  if (exclIdx !== -1) {
    cleanA1 = cleanA1.substring(exclIdx + 1);
  }

  const parts = cleanA1.split(':');
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
  const startRow = start.row !== null ? start.row : 1;
  const startCol = start.col !== null ? start.col : 1;
  const endRow = end.row !== null ? end.row : Math.max(sheet.getLastRow(), 100);
  const endCol = end.col !== null ? end.col : Math.max(sheet.getLastColumn(), 26);

  const minRow = Math.min(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxRow = Math.max(startRow, endRow);
  const maxCol = Math.max(startCol, endCol);

  return {
    row: minRow,
    col: minCol,
    numRows: maxRow - minRow + 1,
    numCols: maxCol - minCol + 1
  };
}

/**
 * Mock Filter representation
 */
class MockFilter {
  constructor(range) {
    this.range = range;
    this.sheet = range.sheet;
  }

  getRange() {
    return this.range;
  }

  remove() {
    if (this.sheet) {
      this.sheet.filter = null;
    }
  }
}

/**
 * Mock DataValidation object
 */
class MockDataValidation {
  constructor(criteriaType, criteriaValues, allowInvalid = true, helpText = '') {
    this.criteriaType = criteriaType;
    this.criteriaValues = criteriaValues;
    this.allowInvalid = allowInvalid;
    this.helpText = helpText;
  }

  getAllowInvalid() {
    return this.allowInvalid;
  }

  getCriteriaType() {
    return this.criteriaType;
  }

  getCriteriaValues() {
    return [...this.criteriaValues];
  }

  getHelpText() {
    return this.helpText;
  }
}

/**
 * Mock DataValidationBuilder
 */
class MockDataValidationBuilder {
  constructor() {
    this.criteriaType = 'VALUE_IN_LIST';
    this.criteriaValues = [];
    this.allowInvalid = true;
    this.helpText = '';
  }

  requireValueInList(values, showDropdown = true) {
    this.criteriaType = 'VALUE_IN_LIST';
    this.criteriaValues = [values, showDropdown];
    return this;
  }

  requireValueInRange(range, showDropdown = true) {
    this.criteriaType = 'VALUE_IN_RANGE';
    this.criteriaValues = [range, showDropdown];
    return this;
  }

  requireNumberEqualTo(number) {
    this.criteriaType = 'NUMBER_EQUAL_TO';
    this.criteriaValues = [number];
    return this;
  }

  setAllowInvalid(allow) {
    this.allowInvalid = Boolean(allow);
    return this;
  }

  setHelpText(text) {
    this.helpText = String(text);
    return this;
  }

  build() {
    return new MockDataValidation(
      this.criteriaType,
      this.criteriaValues,
      this.allowInvalid,
      this.helpText
    );
  }
}

/**
 * Mock EmbeddedChart
 */
class MockEmbeddedChart {
  constructor(chartType, ranges = [], anchor = { row: 1, col: 1, offsetX: 0, offsetY: 0 }, options = {}, id = null) {
    this.chartType = chartType || 'COLUMN';
    this.ranges = [...ranges];
    this.anchor = { ...anchor };
    this.options = { ...options };
    this.id = id || Math.floor(Math.random() * 1000000);
  }

  getChartType() {
    return this.chartType;
  }

  getContainerInfo() {
    const a = this.anchor;
    return {
      getAnchorRow: () => a.row,
      getAnchorColumn: () => a.col,
      getOffsetX: () => a.offsetX || 0,
      getOffsetY: () => a.offsetY || 0
    };
  }

  getOptions() {
    return { ...this.options };
  }

  getRanges() {
    return [...this.ranges];
  }

  getId() {
    return this.id;
  }

  modify() {
    const builder = new MockEmbeddedChartBuilder();
    builder.chartType = this.chartType;
    builder.ranges = [...this.ranges];
    builder.anchor = { ...this.anchor };
    builder.options = { ...this.options };
    builder._existingId = this.id;
    return builder;
  }

  clone() {
    return new MockEmbeddedChart(this.chartType, this.ranges, this.anchor, this.options, this.id);
  }
}

/**
 * Mock EmbeddedChartBuilder
 */
class MockEmbeddedChartBuilder {
  constructor() {
    this.chartType = 'COLUMN';
    this.ranges = [];
    this.anchor = { row: 1, col: 1, offsetX: 0, offsetY: 0 };
    this.options = {};
    this._existingId = null;
  }

  asColumnChart() {
    this.chartType = 'COLUMN';
    return this;
  }

  asBarChart() {
    this.chartType = 'BAR';
    return this;
  }

  asLineChart() {
    this.chartType = 'LINE';
    return this;
  }

  asPieChart() {
    this.chartType = 'PIE';
    return this;
  }

  asAreaChart() {
    this.chartType = 'AREA';
    return this;
  }

  asScatterChart() {
    this.chartType = 'SCATTER';
    return this;
  }

  setChartType(type) {
    this.chartType = type;
    return this;
  }

  addRange(range) {
    this.ranges.push(range);
    return this;
  }

  removeRange(range) {
    this.ranges = this.ranges.filter(r => r !== range);
    return this;
  }

  setPosition(anchorRow, anchorCol, offsetX = 0, offsetY = 0) {
    this.anchor = { row: anchorRow, col: anchorCol, offsetX, offsetY };
    return this;
  }

  setOption(key, value) {
    this.options[key] = value;
    return this;
  }

  setTitle(title) {
    this.options.title = title;
    return this;
  }

  setXAxisTitle(title) {
    if (!this.options.hAxis) this.options.hAxis = {};
    this.options.hAxis.title = title;
    return this;
  }

  setYAxisTitle(title) {
    if (!this.options.vAxis) this.options.vAxis = {};
    this.options.vAxis.title = title;
    return this;
  }

  build() {
    return new MockEmbeddedChart(this.chartType, this.ranges, this.anchor, this.options, this._existingId);
  }
}

/**
 * Mock Range representing a rectangular block of cells
 */
class MockRange {
  constructor(sheet, startRow, startCol, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getRow() {
    return this.startRow;
  }

  getColumn() {
    return this.startCol;
  }

  getNumRows() {
    return this.numRows;
  }

  getNumColumns() {
    return this.numCols;
  }

  getLastRow() {
    return this.startRow + this.numRows - 1;
  }

  getLastColumn() {
    return this.startCol + this.numCols - 1;
  }

  getSheet() {
    return this.sheet;
  }

  getA1Notation() {
    const startA1 = colNumberToLetter(this.startCol) + this.startRow;
    if (this.numRows === 1 && this.numCols === 1) {
      return startA1;
    }
    const endA1 = colNumberToLetter(this.getLastColumn()) + this.getLastRow();
    return `${startA1}:${endA1}`;
  }

  getCell(relRow, relCol) {
    return new MockRange(this.sheet, this.startRow + relRow - 1, this.startCol + relCol - 1, 1, 1);
  }

  offset(rowOffset, colOffset, numRows, numCols) {
    return new MockRange(
      this.sheet,
      this.startRow + rowOffset,
      this.startCol + colOffset,
      numRows || this.numRows,
      numCols || this.numCols
    );
  }

  getValue() {
    return this.sheet._getCell(this.startRow, this.startCol).value;
  }

  setValue(val) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        const cell = this.sheet._getCell(this.startRow + r, this.startCol + c);
        cell.value = val;
        cell.formula = null;
      }
    }
    return this;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push(this.sheet._getCell(this.startRow + r, this.startCol + c).value);
      }
      result.push(row);
    }
    return result;
  }

  setValues(values2D) {
    if (!Array.isArray(values2D) || values2D.length !== this.numRows) {
      throw new Error(
        `The number of rows in the data does not match the number of rows in the range. The data has ${values2D ? values2D.length : 0} but the range has ${this.numRows}.`
      );
    }
    for (let r = 0; r < this.numRows; r++) {
      if (!Array.isArray(values2D[r]) || values2D[r].length !== this.numCols) {
        throw new Error(
          `The number of columns in row ${r} does not match the number of columns in the range. Row has ${values2D[r] ? values2D[r].length : 0} but range has ${this.numCols}.`
        );
      }
      for (let c = 0; c < this.numCols; c++) {
        const cell = this.sheet._getCell(this.startRow + r, this.startCol + c);
        cell.value = values2D[r][c];
        cell.formula = null;
      }
    }
    return this;
  }

  getDisplayValue() {
    const val = this.getValue();
    return val !== null && val !== undefined ? String(val) : '';
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => (v !== null && v !== undefined ? String(v) : '')));
  }

  getFormula() {
    return this.sheet._getCell(this.startRow, this.startCol).formula || '';
  }

  setFormula(formula) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        const cell = this.sheet._getCell(this.startRow + r, this.startCol + c);
        cell.formula = formula;
      }
    }
    return this;
  }

  getFormulas() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push(this.sheet._getCell(this.startRow + r, this.startCol + c).formula || '');
      }
      res.push(row);
    }
    return res;
  }

  setFormulas(formulas2D) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).formula = formulas2D[r][c];
      }
    }
    return this;
  }

  getBackground() {
    return this.sheet._getCell(this.startRow, this.startCol).background;
  }

  getBackgrounds() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push(this.sheet._getCell(this.startRow + r, this.startCol + c).background);
      }
      res.push(row);
    }
    return res;
  }

  getFontColor() {
    return this.sheet._getCell(this.startRow, this.startCol).fontColor;
  }

  getFontColors() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push(this.sheet._getCell(this.startRow + r, this.startCol + c).fontColor);
      }
      res.push(row);
    }
    return res;
  }

  getFontWeight() {
    return this.sheet._getCell(this.startRow, this.startCol).fontWeight;
  }

  getFontSize() {
    return this.sheet._getCell(this.startRow, this.startCol).fontSize;
  }

  getFontFamily() {
    return this.sheet._getCell(this.startRow, this.startCol).fontFamily;
  }

  getHorizontalAlignment() {
    return this.sheet._getCell(this.startRow, this.startCol).horizontalAlignment;
  }

  getVerticalAlignment() {
    return this.sheet._getCell(this.startRow, this.startCol).verticalAlignment;
  }

  getWrap() {
    return this.sheet._getCell(this.startRow, this.startCol).wrap;
  }

  getNumberFormat() {
    return this.sheet._getCell(this.startRow, this.startCol).numberFormat;
  }

  setBackground(color) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).background = color;
      }
    }
    return this;
  }

  setBackgrounds(colors2D) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).background = colors2D[r][c];
      }
    }
    return this;
  }

  setFontColor(color) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).fontColor = color;
      }
    }
    return this;
  }

  setFontColors(colors2D) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).fontColor = colors2D[r][c];
      }
    }
    return this;
  }

  setFontWeight(weight) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).fontWeight = weight;
      }
    }
    return this;
  }

  setFontSize(size) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).fontSize = size;
      }
    }
    return this;
  }

  setFontFamily(family) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).fontFamily = family;
      }
    }
    return this;
  }

  setHorizontalAlignment(alignment) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).horizontalAlignment = alignment;
      }
    }
    return this;
  }

  setVerticalAlignment(alignment) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).verticalAlignment = alignment;
      }
    }
    return this;
  }

  setWrap(isWrap) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).wrap = Boolean(isWrap);
      }
    }
    return this;
  }

  setNumberFormat(format) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).numberFormat = format;
      }
    }
    return this;
  }

  setBorder(top, left, bottom, right, vertical, horizontal, color = '#000000', style = 'SOLID') {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).border = {
          top, left, bottom, right, vertical, horizontal, color, style
        };
      }
    }
    return this;
  }

  clear() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.cells.delete(`${this.startRow + r},${this.startCol + c}`);
      }
    }
    return this;
  }

  clearContent() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        const cell = this.sheet._getCell(this.startRow + r, this.startCol + c);
        cell.value = '';
        cell.formula = null;
      }
    }
    return this;
  }

  clearFormat() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        const cell = this.sheet._getCell(this.startRow + r, this.startCol + c);
        cell.background = '#ffffff';
        cell.fontColor = '#000000';
        cell.fontWeight = 'normal';
        cell.fontSize = 10;
        cell.horizontalAlignment = 'left';
        cell.verticalAlignment = 'bottom';
        cell.wrap = false;
        cell.border = null;
      }
    }
    return this;
  }

  merge() {
    this.sheet.merges.push({
      startRow: this.startRow,
      startCol: this.startCol,
      endRow: this.getLastRow(),
      endCol: this.getLastColumn()
    });
    return this;
  }

  breakApart() {
    this.sheet.merges = this.sheet.merges.filter(m =>
      !(m.startRow >= this.startRow && m.endRow <= this.getLastRow() &&
        m.startCol >= this.startCol && m.endCol <= this.getLastColumn())
    );
    return this;
  }

  isPartOfMerge() {
    return this.sheet.merges.some(m =>
      this.startRow >= m.startRow && this.startRow <= m.endRow &&
      this.startCol >= m.startCol && this.startCol <= m.endCol
    );
  }

  setDataValidation(validation) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).dataValidation = validation;
      }
    }
    return this;
  }

  getDataValidation() {
    return this.sheet._getCell(this.startRow, this.startCol).dataValidation;
  }

  clearDataValidations() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._getCell(this.startRow + r, this.startCol + c).dataValidation = null;
      }
    }
    return this;
  }

  /**
   * Creates a native filter covering this range.
   * Throws an error if a filter already exists on the sheet.
   */
  createFilter() {
    if (this.sheet.filter) {
      throw new Error('There is already a filter on this sheet');
    }
    const filter = new MockFilter(this);
    this.sheet.filter = filter;
    return filter;
  }

  activate() {
    this.sheet.spreadsheet.setActiveRange(this);
    return this;
  }
}

/**
 * Mock Sheet (Worksheet)
 */
class MockSheet {
  constructor(name, spreadsheet) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.cells = new Map(); // "row,col" => Cell
    this.rowHeights = new Map();
    this.colWidths = new Map();
    this.merges = [];
    this.charts = [];
    this.filter = null;
    this.hidden = false;
    this.maxRows = 1000;
    this.maxCols = 26;
  }

  getName() {
    return this.name;
  }

  setName(newName) {
    this.name = String(newName);
    return this;
  }

  getParent() {
    return this.spreadsheet;
  }

  _getCell(row, col) {
    const key = `${row},${col}`;
    if (!this.cells.has(key)) {
      this.cells.set(key, new Cell());
    }
    return this.cells.get(key);
  }

  getRange(rowOrA1, col, numRows, numCols) {
    if (typeof rowOrA1 === 'string') {
      const parsed = parseA1(rowOrA1, this);
      return new MockRange(this, parsed.row, parsed.col, parsed.numRows, parsed.numCols);
    }
    return new MockRange(this, rowOrA1, col, numRows || 1, numCols || 1);
  }

  getDataRange() {
    const lastR = Math.max(1, this.getLastRow());
    const lastC = Math.max(1, this.getLastColumn());
    return new MockRange(this, 1, 1, lastR, lastC);
  }

  getLastRow() {
    let maxRow = 0;
    for (const [key, cell] of this.cells.entries()) {
      if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
        const r = parseInt(key.split(',')[0], 10);
        if (r > maxRow) maxRow = r;
      }
    }
    return maxRow;
  }

  getLastColumn() {
    let maxCol = 0;
    for (const [key, cell] of this.cells.entries()) {
      if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
        const c = parseInt(key.split(',')[1], 10);
        if (c > maxCol) maxCol = c;
      }
    }
    return maxCol;
  }

  getMaxRows() {
    return this.maxRows;
  }

  getMaxColumns() {
    return this.maxCols;
  }

  setRowHeight(row, height) {
    this.rowHeights.set(row, height);
    return this;
  }

  getRowHeight(row) {
    return this.rowHeights.get(row) || 21;
  }

  setColumnWidth(col, width) {
    this.colWidths.set(col, width);
    return this;
  }

  getColumnWidth(col) {
    return this.colWidths.get(col) || 100;
  }

  autoResizeColumn(col) {
    return this;
  }

  clear() {
    this.cells.clear();
    this.merges = [];
    this.charts = [];
    this.filter = null;
    return this;
  }

  clearContents() {
    for (const cell of this.cells.values()) {
      cell.value = '';
      cell.formula = null;
    }
    return this;
  }

  clearFormats() {
    for (const cell of this.cells.values()) {
      cell.background = '#ffffff';
      cell.fontColor = '#000000';
      cell.fontWeight = 'normal';
      cell.fontSize = 10;
      cell.border = null;
    }
    return this;
  }

  hideSheet() {
    this.hidden = true;
    return this;
  }

  showSheet() {
    this.hidden = false;
    return this;
  }

  isSheetHidden() {
    return this.hidden;
  }

  getFilter() {
    return this.filter;
  }

  createFilter() {
    return this.getDataRange().createFilter();
  }

  newChart() {
    return new MockEmbeddedChartBuilder();
  }

  insertChart(chart) {
    this.charts.push(chart);
    return this;
  }

  getCharts() {
    return [...this.charts];
  }

  removeChart(chart) {
    const idx = this.charts.indexOf(chart);
    if (idx >= 0) {
      this.charts.splice(idx, 1);
    }
  }

  updateChart(chart) {
    const idx = this.charts.findIndex(c => c.id === chart.id);
    if (idx >= 0) {
      this.charts[idx] = chart;
    } else {
      this.charts.push(chart);
    }
    return this;
  }

  setActiveRange(range) {
    if (this.spreadsheet) {
      this.spreadsheet.setActiveRange(range);
    }
    return range;
  }

  getActiveRange() {
    return this.spreadsheet ? this.spreadsheet.getActiveRange() : null;
  }

  /**
   * Performs deep clone of this sheet into the target spreadsheet.
   * Clones all cells, row heights, col widths, merges, charts, and visibility.
   */
  copyTo(targetSpreadsheet) {
    const ss = targetSpreadsheet || this.spreadsheet;
    let baseName = `Копия ${this.name}`;
    let candidateName = baseName;
    let counter = 1;
    while (ss.getSheetByName(candidateName)) {
      candidateName = `${baseName} (${counter++})`;
    }

    const cloned = new MockSheet(candidateName, ss);

    // Deep clone cells
    for (const [k, cell] of this.cells.entries()) {
      cloned.cells.set(k, cell.clone());
    }

    // Clone dimensions
    for (const [r, h] of this.rowHeights.entries()) {
      cloned.rowHeights.set(r, h);
    }
    for (const [c, w] of this.colWidths.entries()) {
      cloned.colWidths.set(c, w);
    }

    // Clone merges
    cloned.merges = this.merges.map(m => ({ ...m }));

    // Clone charts
    cloned.charts = this.charts.map(c => c.clone());

    cloned.hidden = this.hidden;
    ss.sheets.push(cloned);
    return cloned;
  }
}

/**
 * Mock Spreadsheet (Workbook)
 */
class MockSpreadsheet {
  constructor(name = 'Лабораторная работа №1') {
    this.name = name;
    this.sheets = [];
    this.activeSheet = null;
    this.activeRange = null;
    this.toastsHistory = [];
  }

  getName() {
    return this.name;
  }

  getSheetByName(name) {
    return this.sheets.find(s => s.getName() === name) || null;
  }

  insertSheet(name, index) {
    const s = new MockSheet(name, this);
    if (index !== undefined && index >= 0 && index <= this.sheets.length) {
      this.sheets.splice(index, 0, s);
    } else {
      this.sheets.push(s);
    }
    this.activeSheet = s;
    return s;
  }

  deleteSheet(sheet) {
    const idx = this.sheets.indexOf(sheet);
    if (idx >= 0) {
      this.sheets.splice(idx, 1);
      if (this.activeSheet === sheet) {
        this.activeSheet = this.sheets[0] || null;
      }
    }
  }

  getSheets() {
    return [...this.sheets];
  }

  getActiveSheet() {
    if (!this.activeSheet && this.sheets.length > 0) {
      this.activeSheet = this.sheets[0];
    }
    return this.activeSheet;
  }

  setActiveSheet(sheet) {
    this.activeSheet = sheet;
    return sheet;
  }

  getActiveRange() {
    return this.activeRange;
  }

  setActiveRange(range) {
    this.activeRange = range;
    return range;
  }

  toast(msg, title = '', timeout = 5) {
    this.toastsHistory.push({ msg, title, timeout });
  }

  getActiveSpreadsheet() {
    return this;
  }
}

/**
 * Mock Ui for interactive dialogs, menus, and automated headless testing
 */
class MockUi {
  constructor() {
    this.promptQueue = [];
    this.alertsHistory = [];
    this.promptsHistory = [];
    this.menusHistory = [];
    this.dialogsHistory = [];

    this.Button = {
      OK: 'OK',
      CANCEL: 'CANCEL',
      YES: 'YES',
      NO: 'NO',
      CLOSE: 'CLOSE'
    };

    this.ButtonSet = {
      OK: 'OK',
      OK_CANCEL: 'OK_CANCEL',
      YES_NO: 'YES_NO',
      YES_NO_CANCEL: 'YES_NO_CANCEL'
    };
  }

  /**
   * Enqueue response for subsequent ui.prompt() call
   * @param {string|{button: string, text: string}} response 
   */
  queuePromptResponse(response) {
    if (typeof response === 'string') {
      this.promptQueue.push({ button: this.Button.OK, text: response });
    } else {
      this.promptQueue.push({
        button: response.button || this.Button.OK,
        text: response.text !== undefined ? String(response.text) : ''
      });
    }
  }

  clearPromptQueue() {
    this.promptQueue = [];
  }

  alert(titleOrPrompt, prompt, buttons) {
    let title = '';
    let msg = '';
    let btn = this.ButtonSet.OK;

    if (prompt === undefined && buttons === undefined) {
      msg = String(titleOrPrompt);
    } else if (buttons === undefined) {
      title = String(titleOrPrompt);
      msg = String(prompt);
    } else {
      title = String(titleOrPrompt);
      msg = String(prompt);
      btn = buttons;
    }

    this.alertsHistory.push({ title, msg, buttons: btn });
    return this.Button.OK;
  }

  prompt(titleOrPrompt, prompt, buttons) {
    let title = '';
    let msg = '';
    let btn = this.ButtonSet.OK;

    if (prompt === undefined && buttons === undefined) {
      msg = String(titleOrPrompt);
    } else if (buttons === undefined) {
      title = String(titleOrPrompt);
      msg = String(prompt);
    } else {
      title = String(titleOrPrompt);
      msg = String(prompt);
      btn = buttons;
    }

    this.promptsHistory.push({ title, msg, buttons: btn });

    const queued = this.promptQueue.shift() || { button: this.Button.OK, text: '' };
    return {
      getSelectedButton: () => queued.button || this.Button.OK,
      getResponseText: () => (queued.text !== undefined ? String(queued.text) : '')
    };
  }

  showModalDialog(userInterface, title) {
    this.dialogsHistory.push({ type: 'modal', userInterface, title });
  }

  showSidebar(userInterface) {
    this.dialogsHistory.push({ type: 'sidebar', userInterface });
  }

  createMenu(caption) {
    const menu = {
      caption,
      items: [],
      addItem: (itemCaption, fnName) => {
        menu.items.push({ type: 'item', caption: itemCaption, fnName });
        return menu;
      },
      addSeparator: () => {
        menu.items.push({ type: 'separator' });
        return menu;
      },
      addSubMenu: (subMenu) => {
        menu.items.push({ type: 'submenu', menu: subMenu });
        return menu;
      },
      addToUi: () => {
        this.menusHistory.push(menu);
        return this;
      }
    };
    return menu;
  }
}

/**
 * Mock PropertiesService with in-memory storage
 */
class MockPropertiesService {
  constructor() {
    this.documentStore = new Map();
    this.scriptStore = new Map();
    this.userStore = new Map();
  }

  _createPropertyInterface(store) {
    return {
      getProperty: (key) => store.get(String(key)) || null,
      setProperty: (key, val) => {
        store.set(String(key), String(val));
        return this;
      },
      getProperties: () => {
        const res = {};
        for (const [k, v] of store.entries()) {
          res[k] = v;
        }
        return res;
      },
      setProperties: (props, deleteAll = false) => {
        if (deleteAll) store.clear();
        for (const [k, v] of Object.entries(props)) {
          store.set(String(k), String(v));
        }
        return this;
      },
      deleteProperty: (key) => {
        store.delete(String(key));
        return this;
      },
      deleteAllProperties: () => {
        store.clear();
        return this;
      },
      getKeys: () => Array.from(store.keys())
    };
  }

  getDocumentProperties() {
    return this._createPropertyInterface(this.documentStore);
  }

  getScriptProperties() {
    return this._createPropertyInterface(this.scriptStore);
  }

  getUserProperties() {
    return this._createPropertyInterface(this.userStore);
  }
}

/**
 * Mock Utilities for dates, string formatting, base64
 */
const MockUtilities = {
  formatDate(date, timeZone, format) {
    const d = new Date(date);
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return format
      .replace(/yyyy/g, d.getFullYear())
      .replace(/MM/g, pad(d.getMonth() + 1))
      .replace(/dd/g, pad(d.getDate()))
      .replace(/HH/g, pad(d.getHours()))
      .replace(/mm/g, pad(d.getMinutes()))
      .replace(/ss/g, pad(d.getSeconds()));
  },

  formatString(template, ...args) {
    let i = 0;
    return template.replace(/%[sfd]/g, () => args[i++]);
  },

  sleep(ms) {
    // Non-blocking no-op in tests
  },

  base64Encode(data) {
    return Buffer.from(String(data)).toString('base64');
  },

  base64Decode(encoded) {
    return Buffer.from(String(encoded), 'base64').toString('utf8');
  },

  newBlob(data, contentType = 'text/plain', name = 'blob') {
    return {
      getDataAsString: () => String(data),
      getContentType: () => contentType,
      getName: () => name
    };
  }
};

/**
 * Mock Logger
 */
class MockLogger {
  constructor() {
    this.logs = [];
  }
  log(...args) {
    this.logs.push(args.map(String).join(' '));
  }
  getLog() {
    return this.logs.join('\n');
  }
  clear() {
    this.logs = [];
  }
}

/**
 * Factory function creating a fresh isolated GAS mock environment
 */
function createGasEnvironment() {
  const ss = new MockSpreadsheet();
  const ui = new MockUi();
  const properties = new MockPropertiesService();
  const logger = new MockLogger();

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => ss,
    getActiveSheet: () => ss.getActiveSheet(),
    openById: (id) => ss,
    create: (name) => {
      const newSs = new MockSpreadsheet(name);
      return newSs;
    },
    getUi: () => ui,
    flush: () => { /* No-op in-memory */ },
    newDataValidation: () => new MockDataValidationBuilder(),
    BorderStyle: {
      SOLID: 'SOLID',
      SOLID_MEDIUM: 'SOLID_MEDIUM',
      SOLID_THICK: 'SOLID_THICK',
      DOTTED: 'DOTTED',
      DASHED: 'DASHED',
      DOUBLE: 'DOUBLE'
    },
    ChartType: {
      COLUMN: 'COLUMN',
      BAR: 'BAR',
      LINE: 'LINE',
      PIE: 'PIE',
      SCATTER: 'SCATTER',
      AREA: 'AREA',
      HISTOGRAM: 'HISTOGRAM',
      TABLE: 'TABLE'
    },
    AutoFillSeries: {
      DEFAULT_SERIES: 'DEFAULT_SERIES',
      ALTERNATE_SERIES: 'ALTERNATE_SERIES'
    },
    Direction: {
      UP: 'UP',
      DOWN: 'DOWN',
      PREVIOUS: 'PREVIOUS',
      NEXT: 'NEXT'
    },
    InterpolationMethod: {
      LINEAR: 'LINEAR',
      STEP: 'STEP'
    }
  };

  return {
    SpreadsheetApp,
    PropertiesService: properties,
    Utilities: MockUtilities,
    Logger: logger,
    Browser: {
      msgBox: (prompt) => ui.alert(prompt),
      inputBox: (prompt) => ui.prompt(prompt).getResponseText()
    },
    _ss: ss,
    _ui: ui,
    install(target = global) {
      target.SpreadsheetApp = SpreadsheetApp;
      target.PropertiesService = properties;
      target.Utilities = MockUtilities;
      target.Logger = logger;
      target.Browser = this.Browser;
      return this;
    }
  };
}

module.exports = {
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
  colNumberToLetter,
  colLetterToNumber,
  parseA1
};
