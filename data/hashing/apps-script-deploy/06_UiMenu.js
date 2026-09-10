/**
 * ==============================================================================================
 * 06_UiMenu.js - ГЛАВНОЕ МЕНЮ, ДИСПЕТЧЕР ДЕЙСТВИЙ И ВСПОМОГАТЕЛЬНЫЕ ОТЧЕТЫ
 * ==============================================================================================
 */

/**
 * Автоматическое создание нативного меню при открытии таблицы
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Хеширование (Вариант 3)')
    .addItem('⚙️ 1. Настроить «Панель_Управления»', 'setupControlSheet')
    .addItem('🎲 2. Сгенерировать N строк данных', 'generateSyntheticRows')
    .addItem('⚡ 3. Построить хеш-таблицу (из шаблона)', 'buildHashTableFromTemplate')
    .addItem('📈 4. Запустить стресс-тест с гистограммой', 'runStressTest')
    .addSeparator()
    .addItem('➕ 5. Добавить запись (интерактивно)', 'insertRecordInteractive')
    .addItem('🗑️ 6. Удалить запись (надгробие DELETED)', 'deleteRecordInteractive')
    .addSeparator()
    .addItem('📥 7. Заполнить датасет (30 записей Таблицы 1)', 'loadDataset')
    .addItem('📊 8. Сводная оценка качества (все 21 вариант)', 'buildEvaluationReport')
    .addItem('🧹 9. Очистить сгенерированные листы', 'clearGeneratedSheets')
    .addToUi();
}

/**
 * Загрузка эталонного датасета на лист «Датасет»
 */
function loadDataset() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Датасет');
  if (!sheet) {
    sheet = ss.insertSheet('Датасет', 0);
  } else {
    sheet.clear();
  }

  sheet.getRange(1, 1, 1, DATASET_HEADERS.length).setValues([DATASET_HEADERS]);
  sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length).setValues(DEFAULT_DATASET_30);

  var headerRange = sheet.getRange(1, 1, 1, DATASET_HEADERS.length);
  headerRange.setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle')
             .setWrap(true);
  sheet.setRowHeight(1, 40);

  var dataRange = sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length);
  dataRange.setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');

  for (var r = 2; r <= DEFAULT_DATASET_30.length + 1; r++) {
    sheet.setRowHeight(r, 26);
    if (r % 2 === 1) {
      sheet.getRange(r, 1, 1, DATASET_HEADERS.length).setBackground('#f8fafc');
    }
  }

  dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  headerRange.setBorder(true, true, true, true, true, true, '#0f172a', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(5, 320);
  sheet.setColumnWidth(6, 220);

  ss.setActiveSheet(sheet);
  try {
    SpreadsheetApp.getUi().alert('✅ Успешно!', 'Лист «Датасет» заполнен 30 эталонными записями методички.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Считывание данных с «Панель_Управления» или «Датасет»
 */
function getDatasetRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var control = ss.getSheetByName('Панель_Управления');
  if (control && control.getLastRow() >= 2) {
    var vals = control.getRange(2, 1, control.getLastRow() - 1, 7).getValues();
    var filtered = vals.filter(function(r) { return r[0] || r[2]; });
    if (filtered.length > 0) return filtered;
  }

  var sheet = ss.getSheetByName('Датасет');
  if (!sheet || sheet.getLastRow() < 2) {
    loadDataset();
    sheet = ss.getSheetByName('Датасет');
  }
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

/**
 * Построение сводной таблицы оценки качества для всех 21 вариантов
 */
function buildEvaluationReport() {
  var rows = getDatasetRows();
  var N = rows.length;
  var M_open = 60;
  var alpha_open = N / M_open;

  var evalRows = [];

  for (var v = 1; v <= 21; v++) {
    var colIdx, methodType, methodName, knuthTheor;
    if (v >= 1 && v <= 7) {
      colIdx = v - 1;
      methodType = 'linear';
      methodName = 'Линейное';
      knuthTheor = 0.5 * (1 + 1 / (1 - alpha_open));
    } else if (v >= 8 && v <= 14) {
      colIdx = v - 8;
      methodType = 'quadratic';
      methodName = 'Квадратичное';
      knuthTheor = 1 - Math.log(1 - alpha_open) - alpha_open / 2;
    } else {
      colIdx = v - 15;
      methodType = 'double';
      methodName = 'Двойное хеширование';
      knuthTheor = (1 / alpha_open) * Math.log(1 / (1 - alpha_open));
    }

    var table = new Array(M_open).fill(null);
    var collisions = 0;
    var totalProbes = 0;

    rows.forEach(function(row) {
      var numKey = extractNumericKey(row[colIdx], colIdx);
      var h1 = knuthMultiplicativeHash(numKey, M_open);
      var h2 = getDoubleHashStep(numKey);

      var probes = 0;
      for (var i = 0; i < M_open; i++) {
        probes++;
        var slot;
        if (methodType === 'linear') slot = (h1 + i) % M_open;
        else if (methodType === 'quadratic') slot = (h1 + i + i * i) % M_open;
        else slot = (h1 + i * h2) % M_open;

        if (table[slot] === null) {
          table[slot] = true;
          if (probes > 1) collisions++;
          totalProbes += probes;
          break;
        }
      }
    });

    var avgProbes = (totalProbes / N).toFixed(2);
    evalRows.push([
      v,
      'Столбец ' + (colIdx + 1) + ': ' + DATASET_HEADERS[colIdx],
      methodName,
      collisions,
      parseFloat(avgProbes),
      parseFloat(knuthTheor.toFixed(2)),
      Math.abs(avgProbes - knuthTheor).toFixed(2)
    ]);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Оценка_Качества');
  if (!sheet) {
    sheet = ss.insertSheet('Оценка_Качества');
  } else {
    sheet.clear();
  }

  sheet.getRange('A1:G1').merge().setValue('📊 СВОДНАЯ ТАБЛИЦА ОЦЕНКИ КАЧЕСТВА ХЕШИРОВАНИЯ (ВСЕ 21 ВАРИАНТ)')
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:G2').merge().setValue(
    'Сравнение эмпирического среднего числа проб (Sn) при вставке 30 записей в M=60 с теоретическими пределами Д. Кнута'
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  var headers = [
    'Вариант', 'Ключевое поле (Столбец)', 'Метод разрешения коллизий',
    'Коллизий при вставке', 'Ср. число проб (Sn факт)', 'Теория Кнута (Sn теор)', 'Отклонение |Факт - Теор|'
  ];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange(5, 1, evalRows.length, headers.length).setValues(evalRows);
  sheet.getRange(5, 1, evalRows.length, 1).setHorizontalAlignment('center');
  sheet.getRange(5, 3, evalRows.length, 5).setHorizontalAlignment('center');

  sheet.getRange(4, 1, evalRows.length + 1, headers.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 190);
  sheet.setColumnWidth(4, 170);
  sheet.setColumnWidth(5, 170);
  sheet.setColumnWidth(6, 170);
  sheet.setColumnWidth(7, 180);

  for (var r = 0; r < evalRows.length; r++) {
    var colCount = evalRows[r][3];
    var cell = sheet.getRange(5 + r, 4);
    if (colCount <= 5) {
      cell.setBackground('#dcfce7').setFontColor('#166534');
    } else if (colCount <= 9) {
      cell.setBackground('#fef3c7').setFontColor('#b45309');
    } else {
      cell.setBackground('#fee2e2').setFontColor('#991b1b');
    }
  }

  ss.setActiveSheet(sheet);
}

/**
 * Очистка временных листов
 */
function clearGeneratedSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToKeep = ['Панель_Управления', 'Датасет', '_Шаблон_Таблицы_'];
  var sheets = ss.getSheets();

  var removed = 0;
  sheets.forEach(function(sh) {
    if (!sheetsToKeep.includes(sh.getName())) {
      if (sheets.length - removed > 1) {
        ss.deleteSheet(sh);
        removed++;
      }
    }
  });

  try {
    SpreadsheetApp.getUi().alert('🧹 Очистка завершена', 'Удалено сгенерированных листов: ' + removed, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function buildChainingTablePrompt() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt(
    '🔗 Метод цепочек (M = 30)',
    'Введите номер ключевого столбца (1–7):\n1: ФИО | 2: Дата | 3: Телефон | 4: Паспорт | 5: Адрес | 6: Счет | 7: Остаток\n(по умолчанию 3 — Номер телефона):',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  var text = prompt.getResponseText().trim();
  var colIdx = 2;
  if (text) {
    var parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) colIdx = parsed - 1;
  }
  buildChainingTable(colIdx);
}

function buildChainingTable(colIdx) {
  colIdx = (colIdx !== undefined && colIdx >= 0 && colIdx < 7) ? colIdx : 2;
  var M = 30;
  var rows = getDatasetRows();
  var colName = DATASET_HEADERS[colIdx];

  var buckets = Array.from({ length: M }, function() { return []; });
  var totalCollisions = 0;
  var maxChainLength = 0;

  rows.forEach(function(row, rowIdx) {
    var rawVal = row[colIdx];
    var numKey = extractNumericKey(rawVal, colIdx);
    var hash = knuthMultiplicativeHash(numKey, M);

    var item = {
      rowNum: rowIdx + 1,
      rawKey: rawVal,
      fullName: row[0],
      numKey: numKey,
      hash: hash,
      depth: buckets[hash].length + 1
    };

    if (buckets[hash].length > 0) totalCollisions++;
    buckets[hash].push(item);
    if (buckets[hash].length > maxChainLength) maxChainLength = buckets[hash].length;
  });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Метод_Цепочек_M30');
  if (!sheet) {
    sheet = ss.insertSheet('Метод_Цепочек_M30');
  } else {
    sheet.clear();
  }

  sheet.getRange('A1:G1').merge().setValue('🔗 ХЕШ-ТАБЛИЦА: МЕТОД ЦЕПОЧЕК (SEPARATE CHAINING)')
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:G2').merge().setValue(
    'Ключ: Столбец ' + (colIdx + 1) + ' (' + colName + ') | N = ' + rows.length + ', M = ' + M + ', α = ' + (rows.length / M).toFixed(2) + ' | ' +
    'Коллизий: ' + totalCollisions + ' | Макс. глубина: ' + maxChainLength
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  var headers = ['Слот (0..29)', 'Статус', 'Хеш h(k)', 'Длина цепочки', 'Элементы цепочки (Связный список)', '', ''];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  var outputRows = [];
  for (var s = 0; s < M; s++) {
    var b = buckets[s];
    var status = b.length === 0 ? 'Пусто (0)' : (b.length === 1 ? '1 элемент' : (b.length + ' эл. (КОЛЛИЗИЯ)'));
    var chainStr = b.map(function(item, idx) { return '[#' + item.rowNum + '] «' + item.rawKey + '» (' + item.fullName + ') [глуб: ' + (idx + 1) + ']'; }).join(' ➔ ') || '—';
    outputRows.push([s, status, s, b.length, chainStr, '', '']);
  }

  sheet.getRange(5, 1, M, headers.length).setValues(outputRows);
  sheet.getRange(5, 1, M, headers.length).setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');
  sheet.getRange(4, 1, M + 1, headers.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  for (var s2 = 0; s2 < M; s2++) {
    var r = 5 + s2;
    var b2 = buckets[s2];
    if (b2.length === 0) {
      sheet.getRange(r, 1, 1, headers.length).setBackground('#f8fafc').setFontColor('#94a3b8');
    } else if (b2.length === 1) {
      sheet.getRange(r, 1, 1, headers.length).setBackground('#ffffff').setFontColor('#0f172a');
      sheet.getRange(r, 2).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
    } else {
      sheet.getRange(r, 1, 1, headers.length).setBackground('#fffbeb').setFontColor('#0f172a');
      sheet.getRange(r, 2).setBackground('#fef3c7').setFontColor('#b45309').setFontWeight('bold');
      sheet.getRange(r, 4).setFontWeight('bold').setFontColor('#dc2626');
    }
  }

  ss.setActiveSheet(sheet);
}

function buildOpenAddressingPrompt() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt(
    '🎯 Открытая адресация (M = 60)',
    'Введите номер варианта лабораторной работы (1–21):\n(по умолчанию Вариант 3 — Номер телефона):',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  var text = prompt.getResponseText().trim();
  var variant = 3;
  if (text) {
    var parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 21) variant = parsed;
  }
  buildOpenAddressingTable(variant);
}

function buildOpenAddressingTable(variant) {
  variant = (variant !== undefined && variant >= 1 && variant <= 21) ? variant : 3;
  var M = 60;
  var rows = getDatasetRows();

  var colIdx, methodType, methodName;
  if (variant >= 1 && variant <= 7) {
    colIdx = variant - 1;
    methodType = 'linear';
    methodName = 'Линейное пробирование: h(k, i) = (h1(k) + i) mod 60';
  } else if (variant >= 8 && variant <= 14) {
    colIdx = variant - 8;
    methodType = 'quadratic';
    methodName = 'Квадратичное пробирование: h(k, i) = (h1(k) + i + i²) mod 60';
  } else {
    colIdx = variant - 15;
    methodType = 'double';
    methodName = 'Двойное хеширование: h(k, i) = (h1(k) + i · h2(k)) mod 60';
  }
  var colName = DATASET_HEADERS[colIdx];

  var table = Array.from({ length: M }, function(_, idx) {
    return {
      status: 'EMPTY',
      rawKey: '',
      fullName: '',
      rowNum: null,
      numKey: null,
      primaryHash: null,
      probesCount: 0,
      trace: []
    };
  });

  var totalInsertCollisions = 0;
  var totalInsertProbes = 0;
  var maxProbes = 0;

  rows.forEach(function(row, rowIdx) {
    var rawVal = row[colIdx];
    var numKey = extractNumericKey(rawVal, colIdx);
    var h1 = knuthMultiplicativeHash(numKey, M);
    var h2 = getDoubleHashStep(numKey);

    var placed = false;
    var probes = 0;
    var probeTrace = [];

    for (var i = 0; i < M; i++) {
      probes++;
      var slot;
      if (methodType === 'linear') slot = (h1 + i) % M;
      else if (methodType === 'quadratic') slot = (h1 + i + i * i) % M;
      else slot = (h1 + i * h2) % M;
      probeTrace.push(slot);

      if (table[slot].status === 'EMPTY' || table[slot].status === 'DELETED') {
        table[slot] = {
          status: 'OCCUPIED',
          rawKey: rawVal,
          fullName: row[0],
          rowNum: rowIdx + 1,
          numKey: numKey,
          primaryHash: h1,
          probesCount: probes,
          trace: probeTrace
        };
        placed = true;
        if (probes > 1) totalInsertCollisions++;
        totalInsertProbes += probes;
        if (probes > maxProbes) maxProbes = probes;
        break;
      }
    }

    if (!placed) {
      throw new Error('Переполнение хеш-таблицы при вставке записи #' + (rowIdx + 1) + ': ' + rawVal);
    }
  });

  var avgProbes = (totalInsertProbes / rows.length).toFixed(2);
  var loadFactor = (rows.length / M).toFixed(2);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Открытая_Адресация_M60');
  if (!sheet) {
    sheet = ss.insertSheet('Открытая_Адресация_M60');
  } else {
    sheet.clear();
  }

  sheet.getRange('A1:H1').merge().setValue('🎯 ХЕШ-ТАБЛИЦА: ОТКРЫТАЯ АДРЕСАЦИЯ — ВАРИАНТ ' + variant)
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:H2').merge().setValue(
    'Метод: ' + methodName + ' | Ключ: Столбец ' + (colIdx + 1) + ' (' + colName + ') | ' +
    'N = ' + rows.length + ', M = ' + M + ', α = ' + loadFactor + ' | Коллизий: ' + totalInsertCollisions + ' | Макс. проб: ' + maxProbes + ' | Ср. число проб (Sn): ' + avgProbes
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  PropertiesService.getDocumentProperties().setProperty('ACTIVE_VARIANT', String(variant));
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_COL_IDX', String(colIdx));
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_METHOD', methodType);

  var tableHeaders = ['Слот (0..59)', 'Статус', 'Ключ поиска', 'Ф.И.О. владельца', 'Исходная строка №', 'Хеш h1(k)', 'Проб при вставке', 'Трасса пробирования'];
  sheet.getRange(4, 1, 1, tableHeaders.length).setValues([tableHeaders])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  var outputRows = [];
  for (var s = 0; s < M; s++) {
    var item = table[s];
    var statusLabel = item.status === 'EMPTY' ? 'EMPTY (пусто)' : (item.status === 'DELETED' ? '🪦 DELETED' : 'OCCUPIED (занято)');
    var traceStr = item.trace.length > 0 ? item.trace.join(' ➔ ') : '—';
    outputRows.push([
      s,
      statusLabel,
      item.rawKey || '—',
      item.fullName || '—',
      item.rowNum !== null ? item.rowNum : '—',
      item.primaryHash !== null ? item.primaryHash : '—',
      item.probesCount > 0 ? item.probesCount : '—',
      traceStr
    ]);
  }

  sheet.getRange(5, 1, M, tableHeaders.length).setValues(outputRows);
  sheet.getRange(5, 1, M, 2).setHorizontalAlignment('center');
  sheet.getRange(5, 5, M, 3).setHorizontalAlignment('center');

  for (var s3 = 0; s3 < M; s3++) {
    var r3 = 5 + s3;
    var it = table[s3];
    if (it.status === 'EMPTY') {
      sheet.getRange(r3, 1, 1, tableHeaders.length).setBackground('#f8fafc').setFontColor('#94a3b8');
    } else if (it.status === 'DELETED') {
      sheet.getRange(r3, 1, 1, tableHeaders.length).setBackground('#fee2e2').setFontColor('#991b1b');
    } else {
      if (it.probesCount === 1) {
        sheet.getRange(r3, 1, 1, tableHeaders.length).setBackground('#ffffff').setFontColor('#0f172a');
        sheet.getRange(r3, 2).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
      } else {
        sheet.getRange(r3, 1, 1, tableHeaders.length).setBackground('#fffbeb').setFontColor('#0f172a');
        sheet.getRange(r3, 2).setBackground('#fef3c7').setFontColor('#b45309').setFontWeight('bold');
        sheet.getRange(r3, 7).setFontWeight('bold').setFontColor('#dc2626');
      }
    }
  }

  sheet.getRange(4, 1, M + 1, tableHeaders.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 250);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 90);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 250);

  ss.setActiveSheet(sheet);
}
