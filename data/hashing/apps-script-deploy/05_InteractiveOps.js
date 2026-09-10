/**
 * ==============================================================================================
 * 05_InteractiveOps.js - ИНТЕРАКТИВНЫЕ ОПЕРАЦИИ (ДОБАВЛЕНИЕ, ПОИСК, УДАЛЕНИЕ С TOMBSTONE)
 * ==============================================================================================
 */

/**
 * Интерактивное добавление записи в хеш-таблицу открытой адресации
 */
function insertRecordInteractive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();
  var sheetName = props.getProperty('ACTIVE_TABLE_SHEET');
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();

  if (!sheet || (!sheet.getName().includes('Хеш_Таблица_Линейное_') && !sheet.getName().includes('Открытая_Адресация_'))) {
    ui.alert('⚠️ Ошибка', 'Сначала откройте или постройте лист хеш-таблицы открытой адресации.', ui.ButtonSet.OK);
    return;
  }

  var promptPhone = ui.prompt(
    '➕ Добавить запись',
    'Введите номер телефона (формат xx-xxx-xx):',
    ui.ButtonSet.OK_CANCEL
  );
  if (promptPhone.getSelectedButton() !== ui.Button.OK) return;
  var phone = promptPhone.getResponseText().trim();
  if (!phone) return;

  var promptName = ui.prompt(
    '➕ Добавить запись',
    'Введите Ф.И.О. владельца:',
    ui.ButtonSet.OK_CANCEL
  );
  if (promptName.getSelectedButton() !== ui.Button.OK) return;
  var name = promptName.getResponseText().trim() || 'Новый клиент';

  var M = parseInt(props.getProperty('ACTIVE_M') || '60', 10);
  var step = parseInt(props.getProperty('ACTIVE_STEP') || '1', 10);
  var fallback = parseInt(props.getProperty('ACTIVE_FALLBACK') || '60', 10);
  var numKeyCode = props.getProperty('ACTIVE_NUMKEY_CODE') || '';

  var startRow = sheet.getRange(1, 1).getValue().toString().includes('Слот') ? 2 : 5;
  var tableData = sheet.getRange(startRow, 1, M, 8).getValues();

  var k = evaluateNumKey(phone, numKeyCode);
  var h1 = knuthMultiplicativeHash(k, M);

  var placed = false;
  var probes = 0;
  var probeTrace = [];

  for (var i = 0; i < fallback; i++) {
    probes++;
    var slot = (h1 + i * step) % M;
    probeTrace.push(slot);

    var status = String(tableData[slot][1]);
    if (status.includes('EMPTY') || status.includes('DELETED')) {
      placed = true;
      var targetRow = startRow + slot;
      sheet.getRange(targetRow, 1).setValue(slot);
      sheet.getRange(targetRow, 2).setValue('OCCUPIED').setBackground(probes === 1 ? '#dcfce7' : '#fef3c7').setFontColor(probes === 1 ? '#166534' : '#b45309').setFontWeight('bold');
      sheet.getRange(targetRow, 3).setValue(phone).setFontColor('#0f172a');
      sheet.getRange(targetRow, 4).setValue(name).setFontColor('#0f172a');
      sheet.getRange(targetRow, 5).setValue('+');
      sheet.getRange(targetRow, 6).setValue(h1);
      sheet.getRange(targetRow, 7).setValue(probes).setFontWeight(probes > 1 ? 'bold' : 'normal').setFontColor(probes > 1 ? '#dc2626' : '#0f172a');
      sheet.getRange(targetRow, 8).setValue(probeTrace.join(' ➔ '));
      sheet.getRange(targetRow, 1, 1, 8).setBackground(probes === 1 ? '#ffffff' : '#fffbeb');

      sheet.setActiveRange(sheet.getRange(targetRow, 1, 1, 8));
      ui.alert(
        '✅ Запись успешно добавлена!',
        'Телефон: ' + phone + ' (' + name + ')\n' +
        'Размещено в слоте: #' + slot + '\n' +
        'Первичный хеш h1: ' + h1 + '\n' +
        'Затрачено проб: ' + probes + '\n' +
        'Трасса: ' + probeTrace.join(' ➔ '),
        ui.ButtonSet.OK
      );
      break;
    }
  }

  if (!placed) {
    ui.alert(
      '⚠️ Переполнение хеш-таблицы!',
      'Не удалось вставить запись за ' + fallback + ' проб.\n' +
      'Проверенные слоты: ' + probeTrace.join(' ➔ '),
      ui.ButtonSet.OK
    );
  }
}

/**
 * Интерактивное удаление записи с установкой надгробия Tombstone (🪦 DELETED)
 */
function deleteRecordInteractive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();
  var sheetName = props.getProperty('ACTIVE_TABLE_SHEET');
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();

  if (!sheet || (!sheet.getName().includes('Хеш_Таблица_Линейное_') && !sheet.getName().includes('Открытая_Адресация_'))) {
    ui.alert('⚠️ Ошибка', 'Сначала откройте или постройте лист хеш-таблицы открытой адресации.', ui.ButtonSet.OK);
    return;
  }

  var promptPhone = ui.prompt(
    '🗑️ Удалить запись',
    'Введите номер телефона для удаления (xx-xxx-xx):',
    ui.ButtonSet.OK_CANCEL
  );
  if (promptPhone.getSelectedButton() !== ui.Button.OK) return;
  var phone = promptPhone.getResponseText().trim();
  if (!phone) return;

  var M = parseInt(props.getProperty('ACTIVE_M') || '60', 10);
  var step = parseInt(props.getProperty('ACTIVE_STEP') || '1', 10);
  var numKeyCode = props.getProperty('ACTIVE_NUMKEY_CODE') || '';

  var startRow = sheet.getRange(1, 1).getValue().toString().includes('Слот') ? 2 : 5;
  var tableData = sheet.getRange(startRow, 1, M, 8).getValues();

  var k = evaluateNumKey(phone, numKeyCode);
  var h1 = knuthMultiplicativeHash(k, M);

  var foundSlot = -1;
  var probes = 0;
  var probeTrace = [];

  for (var i = 0; i < M; i++) {
    probes++;
    var slot = (h1 + i * step) % M;
    probeTrace.push(slot);

    var status = String(tableData[slot][1]);
    var cellPhone = String(tableData[slot][2]);

    if (status.includes('EMPTY')) {
      // Пустой слот обрывает цепочку поиска
      break;
    }

    if (status.includes('DELETED')) {
      // Надгробие Tombstone: НЕ ОСТАНАВЛИВАЕМСЯ, продолжаем поиск!
      continue;
    }

    if (status.includes('OCCUPIED') && cellPhone.toLowerCase() === phone.toLowerCase()) {
      foundSlot = slot;
      break;
    }
  }

  if (foundSlot !== -1) {
    var targetRow = startRow + foundSlot;
    sheet.getRange(targetRow, 1, 1, 8).setBackground('#fee2e2');
    sheet.getRange(targetRow, 2).setValue('🪦 DELETED').setBackground('#fee2e2').setFontColor('#991b1b').setFontWeight('bold');
    sheet.getRange(targetRow, 3).setValue('[Удален: ' + phone + ']').setFontColor('#94a3b8');
    sheet.getRange(targetRow, 4).setValue('—').setFontColor('#94a3b8');
    sheet.getRange(targetRow, 7).setValue('—').setFontColor('#94a3b8');
    sheet.getRange(targetRow, 8).setValue('🪦 Надгробие').setFontColor('#94a3b8');

    sheet.setActiveRange(sheet.getRange(targetRow, 1, 1, 8));
    ui.alert(
      '🪦 Запись удалена с надгробием (Tombstone)!',
      'Слот #' + foundSlot + ' переведен в статус «🪦 DELETED».\n' +
      'Ключ: ' + phone + '\n' +
      'Проверено ячеек: ' + probes + '\n' +
      'Трасса: ' + probeTrace.join(' ➔ ') + '\n\n' +
      'Важно для защиты работы: Статус DELETED сохраняет целостность последующих поисковых цепочек.',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Запись не найдена',
      'Телефон «' + phone + '» отсутствует в таблице.\n' +
      'Проверено ячеек: ' + probes + '\n' +
      'Трасса: ' + probeTrace.join(' ➔ '),
      ui.ButtonSet.OK
    );
  }
}

/**
 * Интерактивный поиск по ключу
 */
function searchKeyInteractive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Открытая_Адресация_M60') || ss.getActiveSheet();
  var ui = SpreadsheetApp.getUi();

  var savedVariant = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_VARIANT') || '3', 10);
  var savedColIdx = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_COL_IDX') || '2', 10);
  var savedMethod = PropertiesService.getDocumentProperties().getProperty('ACTIVE_METHOD') || 'linear';
  var colName = DATASET_HEADERS[savedColIdx];

  var prompt = ui.prompt(
    '🔍 Поиск ключа в хеш-таблице',
    'Введите искомое значение ключа [Столбец ' + (savedColIdx + 1) + ': ' + colName + ']:',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  var searchVal = prompt.getResponseText().trim();
  if (!searchVal) return;

  var M = 60;
  var numKey = extractNumericKey(searchVal, savedColIdx);
  var h1 = knuthMultiplicativeHash(numKey, M);
  var h2 = getDoubleHashStep(numKey);

  var startRow = sheet.getRange(1, 1).getValue().toString().includes('Слот') ? 2 : 5;
  var tableData = sheet.getRange(startRow, 1, M, 4).getValues();

  var found = false;
  var foundSlot = -1;
  var probes = 0;
  var traceDetails = [];

  for (var i = 0; i < M; i++) {
    probes++;
    var slot;
    if (savedMethod === 'linear') {
      slot = (h1 + i) % M;
    } else if (savedMethod === 'quadratic') {
      slot = (h1 + i + i * i) % M;
    } else {
      slot = (h1 + i * h2) % M;
    }

    var rowStatus = String(tableData[slot][1]);
    var rowKey = String(tableData[slot][2]);
    var rowName = String(tableData[slot][3]);

    if (rowStatus.indexOf('EMPTY') !== -1) {
      traceDetails.push('Шаг ' + probes + ': Слот [' + slot + '] ➔ EMPTY (пусто). Цепочка оборвана.');
      break;
    } else if (rowStatus.indexOf('DELETED') !== -1) {
      traceDetails.push('Шаг ' + probes + ': Слот [' + slot + '] ➔ 🪦 DELETED (надгробие). Пропускаем, продолжаем поиск!');
    } else {
      if (rowKey.toLowerCase() === searchVal.toLowerCase()) {
        traceDetails.push('Шаг ' + probes + ': Слот [' + slot + '] ➔ НАЙДЕНО! Совпадение ключа «' + rowKey + '» (' + rowName + ').');
        found = true;
        foundSlot = slot;
        break;
      } else {
        traceDetails.push('Шаг ' + probes + ': Слот [' + slot + '] ➔ OCCUPIED («' + rowKey + '» ≠ «' + searchVal + '»). Коллизия.');
      }
    }
  }

  if (found) {
    sheet.setActiveRange(sheet.getRange(startRow + foundSlot, 1, 1, 8));
    ui.alert(
      '🎉 Запись успешно найдена!',
      'Результат: НАЙДЕНО в слоте #' + foundSlot + '\n' +
      'Ключ: «' + searchVal + '»\n' +
      'Всего проверено ячеек: ' + probes + '\n\n' +
      'Трассировка цепочки проб:\n' + traceDetails.join('\n'),
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Запись не найдена',
      'Ключ «' + searchVal + '» отсутствует в хеш-таблице.\n' +
      'Всего проверено ячеек: ' + probes + '\n\n' +
      'Трассировка цепочки проб:\n' + traceDetails.join('\n'),
      ui.ButtonSet.OK
    );
  }
}

function deleteKeyInteractive() {
  deleteRecordInteractive();
}
