/**
 * ==============================================================================================
 * 02_ControlSheet.js - УПРАВЛЕНИЕ ГЛАВНЫМ ДАШБОРДОМ («Панель_Управления»)
 * ==============================================================================================
 */

/**
 * Инициализация и форматирование главного листа «Панель_Управления»
 */
function setupControlSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Панель_Управления');
  if (!sheet) {
    sheet = ss.insertSheet('Панель_Управления', 0);
  }

  // --- ЛЕВЫЙ БЛОК: ТАБЛИЦА ИСХОДНЫХ ДАННЫХ (A..G) ---
  sheet.getRange(1, 1, 1, DATASET_HEADERS.length).setValues([DATASET_HEADERS]);
  sheet.getRange(1, 1, 1, DATASET_HEADERS.length)
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, 40);

  // 30 эталонных записей
  sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length).setValues(DEFAULT_DATASET_30);
  var dataRange = sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length);
  dataRange.setFontFamily('Consolas')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  for (var r = 2; r <= DEFAULT_DATASET_30.length + 1; r++) {
    sheet.setRowHeight(r, 26);
    if (r % 2 === 1) {
      sheet.getRange(r, 1, 1, DATASET_HEADERS.length).setBackground('#f8fafc');
    } else {
      sheet.getRange(r, 1, 1, DATASET_HEADERS.length).setBackground('#ffffff');
    }
  }

  dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(1, 1, 1, DATASET_HEADERS.length).setBorder(true, true, true, true, true, true, '#0f172a', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sheet.setColumnWidth(1, 220); // Ф.И.О.
  sheet.setColumnWidth(2, 110); // Дата рождения
  sheet.setColumnWidth(3, 120); // Номер телефона (Ключ Варианта 3)
  sheet.setColumnWidth(4, 140); // Паспорт
  sheet.setColumnWidth(5, 280); // Адрес
  sheet.setColumnWidth(6, 200); // Номер счета
  sheet.setColumnWidth(7, 130); // Остаток денег
  sheet.setColumnWidth(8, 30);  // Разделитель H

  // --- ПРАВЫЙ БЛОК: ПАРАМЕТРЫ ХЕШИРОВАНИЯ И НАСТРОЙКИ (I..N) ---
  sheet.getRange('I1:N1').merge().setValue('⚙️ ПАРАМЕТРЫ ХЕШИРОВАНИЯ И УПРАВЛЕНИЕ')
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.getRange('I3').setValue('Размер таблицы (M)').setFontWeight('bold').setBackground('#f1f5f9');
  sheet.getRange('J3').setValue(60).setHorizontalAlignment('center').setFontWeight('bold');

  sheet.getRange('I4').setValue('Шаг пробирования (step)').setFontWeight('bold').setBackground('#f1f5f9');
  sheet.getRange('J4').setValue(1).setHorizontalAlignment('center').setFontWeight('bold');

  sheet.getRange('I5').setValue('Предел проб (fallback)').setFontWeight('bold').setBackground('#f1f5f9');
  sheet.getRange('J5').setValue(60).setHorizontalAlignment('center').setFontWeight('bold');

  sheet.getRange('I6').setValue('Метод разрешения коллизий').setFontWeight('bold').setBackground('#f1f5f9');
  sheet.getRange('J6').setValue('Открытая адресация').setHorizontalAlignment('center').setFontWeight('bold');

  sheet.getRange('I7').setValue('Количество записей (N)').setFontWeight('bold').setBackground('#f1f5f9');
  sheet.getRange('J7').setValue(30).setHorizontalAlignment('center').setFontWeight('bold');

  // Выпадающий список Data Validation на J6
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Открытая адресация', 'Метод цепочек'], true)
    .setAllowInvalid(false)
    .setHelpText('Выберите метод разрешения коллизий')
    .build();
  sheet.getRange('J6').setDataValidation(rule);

  sheet.getRange('I3:J7').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // Редактируемый JS-код функции numKey в ячейке
  sheet.getRange('I9:N9').merge().setValue('💻 Редактируемый JS-код функции numKey:')
    .setBackground('#e2e8f0')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('left');

  sheet.getRange('I10:N10').merge().setValue('val => parseInt(String(val).replace(/\\D/g, ""), 10)')
    .setFontFamily('Consolas')
    .setFontSize(10)
    .setBackground('#f8fafc')
    .setFontColor('#0f172a');
  sheet.getRange('I10:N10').setBorder(true, true, true, true, true, true, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);

  // Подсказка по кнопкам
  sheet.getRange('I12:N12').merge().setValue('📌 Кнопки / Меню: 🎲 Сгенерировать N строк | ⚡ Построить хеш-таблицу | 📈 Запустить стресс-тест')
    .setBackground('#e0f2fe')
    .setFontColor('#0369a1')
    .setFontWeight('bold')
    .setFontSize(9)
    .setHorizontalAlignment('center');

  sheet.setColumnWidth(9, 180);  // I
  sheet.setColumnWidth(10, 140); // J
  sheet.setColumnWidth(11, 130); // K
  sheet.setColumnWidth(12, 130); // L
  sheet.setColumnWidth(13, 140); // M
  sheet.setColumnWidth(14, 140); // N

  ensureTemplateSheet(ss);

  ss.setActiveSheet(sheet);
  return sheet;
}

/**
 * Генерация N случайных валидных строк данных для датасета
 */
function generateSyntheticRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Панель_Управления');
  if (!sheet) {
    sheet = setupControlSheet();
  }

  var N_raw = parseInt(sheet.getRange('J7').getValue(), 10);
  var N = (!isNaN(N_raw) && N_raw > 0) ? Math.min(999, Math.max(1, N_raw)) : 30;
  sheet.getRange('J7').setValue(N);

  var firstNames = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артем', 'Илья', 'Михаил', 'Кирилл', 'Анна', 'Елена', 'Ольга', 'Татьяна', 'Мария'];
  var lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семенов'];
  var middleNames = ['Иванович', 'Сергеевич', 'Александрович', 'Дмитриевич', 'Андреевич', 'Алексеевич', 'Михайлович', 'Владимирович'];
  var cities = ['г. Москва', 'г. Санкт-Петербург', 'г. Новосибирск', 'г. Екатеринбург', 'г. Казань', 'г. Нижний Новгород', 'г. Самара', 'г. Омск'];
  var streets = ['ул. Ленина', 'ул. Мира', 'пр-т Победы', 'ул. Гагарина', 'ул. Советская', 'ул. Тверская', 'ул. Садовая', 'пр-т Мира'];

  var newRows = [];
  for (var i = 0; i < N; i++) {
    var fn = firstNames[i % firstNames.length];
    var ln = lastNames[(i * 3 + 1) % lastNames.length];
    var mn = middleNames[(i * 2 + 3) % middleNames.length];
    var fullName = ln + ' ' + fn + ' ' + mn;

    var day = String((i * 7) % 28 + 1).padStart(2, '0');
    var month = String((i * 3) % 12 + 1).padStart(2, '0');
    var year = 1980 + (i % 25);
    var birthDate = day + '.' + month + '.' + year;

    var phone = generateSyntheticPhone(i);
    var passportSeries = String(1000 + (i * 137) % 9000);
    var passportNumber = String(100000 + (i * 911) % 900000);
    var passport = passportSeries + ' ' + passportNumber;

    var city = cities[i % cities.length];
    var street = streets[(i * 2) % streets.length];
    var building = (i % 99) + 1;
    var apt = (i * 7) % 200 + 1;
    var address = city + ', ' + street + ', д. ' + building + ', кв. ' + apt;

    var account = '40817810' + String(100000000000 + i * 37913).slice(-12);
    var balance = ((i * 5432.10 + 1250.75) % 900000 + 5000).toFixed(2);

    newRows.push([fullName, birthDate, phone, passport, address, account, balance]);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 7).clearContent().clearFormat();
  }

  sheet.getRange(2, 1, N, 7).setValues(newRows);
  var dataRange = sheet.getRange(2, 1, N, 7);
  dataRange.setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');

  for (var r2 = 2; r2 <= N + 1; r2++) {
    sheet.setRowHeight(r2, 26);
    if (r2 % 2 === 1) {
      sheet.getRange(r2, 1, 1, 7).setBackground('#f8fafc');
    } else {
      sheet.getRange(r2, 1, 1, 7).setBackground('#ffffff');
    }
  }
  dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  try {
    SpreadsheetApp.getUi().alert('🎲 Генерация завершена!', 'Успешно сгенерировано ' + N + ' строк данных в таблице исходных данных.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function generateDatasetRows() {
  generateSyntheticRows();
}
