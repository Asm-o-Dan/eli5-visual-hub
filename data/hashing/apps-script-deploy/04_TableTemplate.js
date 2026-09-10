/**
 * ==============================================================================================
 * 04_TableTemplate.js - ШАБЛОНИЗАЦИЯ, ГЕНЕРАЦИЯ ТАБЛИЦЫ И АВТОФИЛЬТР
 * ==============================================================================================
 */

/**
 * Обеспечение наличия скрытого эталонного листа-шаблона «_Шаблон_Таблицы_»
 */
function ensureTemplateSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var template = ss.getSheetByName('_Шаблон_Таблицы_');
  if (!template) {
    template = ss.insertSheet('_Шаблон_Таблицы_');
  }

  var headers = [
    'Слот (0..M-1)',
    'Статус',
    'Ключ (Телефон)',
    'Ф.И.О.',
    'Исходная строка №',
    'Первичный хеш h1(k)',
    'Число проб',
    'Трасса'
  ];

  template.getRange(1, 1, 1, headers.length).setValues([headers]);
  template.getRange(1, 1, 1, headers.length)
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  template.setRowHeight(1, 36);
  template.setColumnWidth(1, 90);
  template.setColumnWidth(2, 140);
  template.setColumnWidth(3, 160);
  template.setColumnWidth(4, 240);
  template.setColumnWidth(5, 120);
  template.setColumnWidth(6, 120);
  template.setColumnWidth(7, 120);
  template.setColumnWidth(8, 260);

  template.hideSheet();
  return template;
}

/**
 * Клонирование шаблона и генерация листа хеш-таблицы (Открытая адресация / Метод цепочек)
 */
function buildHashTableFromTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var controlSheet = ss.getSheetByName('Панель_Управления');
  if (!controlSheet) {
    controlSheet = setupControlSheet();
  }

  var M_raw = parseInt(controlSheet.getRange('J3').getValue(), 10);
  var M = (!isNaN(M_raw) && M_raw > 0) ? M_raw : 60;

  var step_raw = parseInt(controlSheet.getRange('J4').getValue(), 10);
  var step = (!isNaN(step_raw) && step_raw > 0) ? step_raw : 1;

  var fallback_raw = parseInt(controlSheet.getRange('J5').getValue(), 10);
  var fallback = (!isNaN(fallback_raw) && fallback_raw > 0) ? Math.min(M, fallback_raw) : M;

  var method = String(controlSheet.getRange('J6').getValue() || 'Открытая адресация').trim();
  var numKeyCode = String(controlSheet.getRange('I10').getValue() || '');
  var isChaining = method === 'Метод цепочек';

  var lastRow = controlSheet.getLastRow();
  var rows = [];
  if (lastRow >= 2) {
    rows = controlSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    rows = rows.filter(function(r) { return r[0] || r[2]; });
  }
  if (rows.length === 0) {
    rows = DEFAULT_DATASET_30;
  }

  var targetName = isChaining ? ('Хеш_Таблица_Цепочки_M' + M) : ('Хеш_Таблица_Линейное_M' + M);
  var existing = ss.getSheetByName(targetName);
  if (existing) {
    ss.deleteSheet(existing);
  }

  var template = ensureTemplateSheet(ss);
  var targetSheet = template.copyTo(ss).setName(targetName).showSheet();

  if (!isChaining) {
    // Открытая адресация (линейное пробирование)
    var table = Array.from({ length: M }, function(_, idx) {
      return {
        slotIndex: idx,
        status: 'EMPTY',
        phone: '',
        name: '',
        rowNum: null,
        h1: null,
        probes: 0,
        trace: []
      };
    });

    var totalCollisions = 0;
    var totalProbes = 0;
    var maxProbes = 0;

    rows.forEach(function(row, rowIdx) {
      var phone = String(row[2] || '').trim();
      var name = String(row[0] || '').trim();
      var k = evaluateNumKey(phone, numKeyCode);
      var h1 = knuthMultiplicativeHash(k, M);

      var placed = false;
      var probeTrace = [];
      for (var i = 0; i < fallback; i++) {
        var slot = (h1 + i * step) % M;
        probeTrace.push(slot);

        if (table[slot].status === 'EMPTY' || table[slot].status === 'DELETED') {
          table[slot] = {
            slotIndex: slot,
            status: 'OCCUPIED',
            phone: phone,
            name: name,
            rowNum: rowIdx + 1,
            h1: h1,
            probes: i + 1,
            trace: probeTrace
          };
          placed = true;
          if (i > 0) totalCollisions++;
          totalProbes += (i + 1);
          if (i + 1 > maxProbes) maxProbes = i + 1;
          break;
        }
      }

      if (!placed) {
        throw new Error('Переполнение хеш-таблицы при вставке записи #' + (rowIdx + 1) + ' (' + phone + ') за ' + fallback + ' проб.');
      }
    });

    var outputRows = [];
    for (var s = 0; s < M; s++) {
      var item = table[s];
      var statusLabel = item.status === 'EMPTY' ? 'EMPTY' : (item.status === 'DELETED' ? '🪦 DELETED' : 'OCCUPIED');
      var traceStr = item.trace.length > 0 ? item.trace.join(' ➔ ') : '—';
      outputRows.push([
        s,
        statusLabel,
        item.phone || '—',
        item.name || '—',
        item.rowNum !== null ? item.rowNum : '—',
        item.h1 !== null ? item.h1 : '—',
        item.probes > 0 ? item.probes : '—',
        traceStr
      ]);
    }

    targetSheet.getRange(2, 1, M, 8).setValues(outputRows);
    targetSheet.getRange(2, 1, M, 8).setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');
    targetSheet.getRange(2, 1, M, 2).setHorizontalAlignment('center');
    targetSheet.getRange(2, 5, M, 3).setHorizontalAlignment('center');

    for (var s2 = 0; s2 < M; s2++) {
      var r = 2 + s2;
      var it = table[s2];
      if (it.status === 'EMPTY') {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#f8fafc').setFontColor('#94a3b8');
      } else if (it.status === 'DELETED') {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#fee2e2').setFontColor('#991b1b');
        targetSheet.getRange(r, 2).setFontWeight('bold');
      } else {
        if (it.probes === 1) {
          targetSheet.getRange(r, 1, 1, 8).setBackground('#ffffff').setFontColor('#0f172a');
          targetSheet.getRange(r, 2).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
        } else {
          targetSheet.getRange(r, 1, 1, 8).setBackground('#fffbeb').setFontColor('#0f172a');
          targetSheet.getRange(r, 2).setBackground('#fef3c7').setFontColor('#b45309').setFontWeight('bold');
          targetSheet.getRange(r, 7).setFontWeight('bold').setFontColor('#dc2626');
        }
      }
    }
  } else {
    // Метод цепочек
    var buckets = Array.from({ length: M }, function() { return []; });
    rows.forEach(function(row, rowIdx) {
      var phone = String(row[2] || '').trim();
      var name = String(row[0] || '').trim();
      var k = evaluateNumKey(phone, numKeyCode);
      var slot = knuthMultiplicativeHash(k, M);
      buckets[slot].push({ phone: phone, name: name, rowNum: rowIdx + 1, depth: buckets[slot].length + 1 });
    });

    var outputRowsChain = [];
    for (var sc = 0; sc < M; sc++) {
      var b = buckets[sc];
      var statusChain = b.length === 0 ? 'Пусто (0)' : (b.length === 1 ? '1 элемент' : (b.length + ' эл. (КОЛЛИЗИЯ)'));
      var chainStr = b.map(function(item, idx) { return '[#' + item.rowNum + '] «' + item.phone + '» (' + item.name + ') [глуб: ' + (idx + 1) + ']'; }).join(' ➔ ') || '—';
      outputRowsChain.push([
        sc,
        statusChain,
        b.length > 0 ? b[0].phone : '—',
        b.length > 0 ? b[0].name : '—',
        b.length > 0 ? b[0].rowNum : '—',
        sc,
        b.length,
        chainStr
      ]);
    }

    targetSheet.getRange(2, 1, M, 8).setValues(outputRowsChain);
    targetSheet.getRange(2, 1, M, 8).setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');

    for (var sc2 = 0; sc2 < M; sc2++) {
      var rc = 2 + sc2;
      var bc = buckets[sc2];
      if (bc.length === 0) {
        targetSheet.getRange(rc, 1, 1, 8).setBackground('#f8fafc').setFontColor('#94a3b8');
      } else if (bc.length === 1) {
        targetSheet.getRange(rc, 1, 1, 8).setBackground('#ffffff').setFontColor('#0f172a');
        targetSheet.getRange(rc, 2).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
      } else {
        targetSheet.getRange(rc, 1, 1, 8).setBackground('#fffbeb').setFontColor('#0f172a');
        targetSheet.getRange(rc, 2).setBackground('#fef3c7').setFontColor('#b45309').setFontWeight('bold');
        targetSheet.getRange(rc, 7).setFontWeight('bold').setFontColor('#dc2626');
      }
    }
  }

  targetSheet.getRange(1, 1, M + 1, 8).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // Нативный фильтр
  var existingFilter = targetSheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  targetSheet.getRange(1, 1, M + 1, 8).createFilter();

  var props = PropertiesService.getDocumentProperties();
  props.setProperty('ACTIVE_TABLE_SHEET', targetName);
  props.setProperty('ACTIVE_M', String(M));
  props.setProperty('ACTIVE_STEP', String(step));
  props.setProperty('ACTIVE_FALLBACK', String(fallback));
  props.setProperty('ACTIVE_METHOD', method);
  props.setProperty('ACTIVE_NUMKEY_CODE', numKeyCode);

  ss.setActiveSheet(targetSheet);

  try {
    SpreadsheetApp.getUi().alert(
      '⚡ Хеш-таблица построена!',
      'Лист: «' + targetName + '»\n' +
      'Метод: ' + method + '\n' +
      'Размер таблицы M: ' + M + '\n' +
      'Шаг step: ' + step + ' | Fallback: ' + fallback + '\n' +
      'Автофильтр включен на строке заголовков.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}

  return targetSheet;
}
