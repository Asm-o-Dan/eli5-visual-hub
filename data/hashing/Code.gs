/**
 * ==============================================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №1: ХЕШИРОВАНИЕ И ХЕШ-ТАБЛИЦЫ (АОД / АиСД, 3 КУРС)
 * Google Apps Script (.gs) для Google Таблиц
 * 
 * ФУНКЦИОНАЛ:
 * 1. Загрузка исходного датасета (Таблица 1: 30 записей, 7 полей) с автоформатированием
 * 2. Построение хеш-таблицы методом цепочек (M = 30) с расчетом коллизий и цепочек
 * 3. Построение хеш-таблицы методом открытой адресации (M = 60) для ВСЕХ 21 ВАРИАНТОВ:
 *    - Варианты 1–7: Линейное пробирование (поля 1..7)
 *    - Варианты 8–14: Квадратичное пробирование (c1=1, c2=1, поля 1..7)
 *    - Варианты 15–21: Двойное хеширование (шаг h2(k) взаимно прост с M=60 через числа Эйлера)
 * 4. Интерактивный поиск по ключу с трассировкой проб и подсветкой ячейки
 * 5. Интерактивное удаление по ключу с установкой надгробия DELETED (🪦 Tombstone)
 * 6. Построение сводной таблицы оценки качества (все 21 вариант vs формулы Кнута)
 * 7. Поддержка вызова из верхнего меню «⚡ Хеширование (Лаб 1)» и через графические кнопки
 * ==============================================================================================
 */

// Константа золотого сечения Кнута: A = (sqrt(5) - 1) / 2
const KNUTH_A = (Math.sqrt(5) - 1) / 2; // ~0.618033988749895

// Числа Эйлера, взаимно простые с M = 60 (gcd(s, 60) = 1)
// Гарантируют полный цикл обхода всех 60 ячеек при двойном хешировании
const COPRIMES_60 = [1, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59];

// Заголовки датасета Таблицы 1
const DATASET_HEADERS = ["Ф.И.О.", "Дата рождения", "Номер телефона", "Серия и номер паспорта", "Адрес прописки", "Номер банковского счета", "Остаток денег на счете"];

// Встроенные 30 эталонных записей методички
const DEFAULT_DATASET_30 = [
  [
    "Иванов Иван Иванович",
    "15.04.2002",
    "23-456-78",
    "4518 902145",
    "г. Москва, ул. Тверская, д. 12, кв. 45",
    "40817810500001234567",
    "154200.50"
  ],
  [
    "Петров Алексей Сергеевич",
    "28.11.2001",
    "91-827-36",
    "2215 348190",
    "г. Санкт-Петербург, Невский пр-т, д. 88, кв. 14",
    "40817810600009876543",
    "89340.75"
  ],
  [
    "Смирнова Екатерина Дмитриевна",
    "03.07.2003",
    "45-123-89",
    "4619 812304",
    "г. Казань, ул. Баумана, д. 25, кв. 112",
    "40817810700005432109",
    "312450.00"
  ],
  [
    "Соколов Дмитрий Павлович",
    "19.09.2000",
    "77-901-42",
    "4014 654987",
    "г. Новосибирск, Красный пр-т, д. 45, кв. 3",
    "40817810800003216549",
    "45120.25"
  ],
  [
    "Козлова Анна Михайловна",
    "12.01.2002",
    "34-567-89",
    "5016 789456",
    "г. Екатеринбург, пр-т Ленина, д. 101, кв. 67",
    "40817810900007891234",
    "198750.80"
  ],
  [
    "Морозов Максим Андреевич",
    "25.08.2001",
    "88-234-51",
    "6017 123789",
    "г. Нижний Новгород, ул. Родионова, д. 15, кв. 9",
    "40817810000006543218",
    "76400.00"
  ],
  [
    "Волкова Ольга Викторовна",
    "30.03.2003",
    "56-789-01",
    "4512 876543",
    "г. Самара, Волжский пр-т, д. 4, кв. 23",
    "40817810100001928374",
    "523100.90"
  ],
  [
    "Новиков Сергей Николаевич",
    "14.12.2000",
    "99-345-67",
    "2913 234567",
    "г. Ростов-на-Дону, ул. Пушкинская, д. 54, кв. 8",
    "40817810200009182736",
    "18450.30"
  ],
  [
    "Федорова Татьяна Александровна",
    "08.06.2002",
    "12-890-34",
    "3614 345678",
    "г. Уфа, ул. Ленина, д. 72, кв. 51",
    "40817810300008273645",
    "142900.00"
  ],
  [
    "Лебедев Павел Романович",
    "22.02.2001",
    "67-456-12",
    "1815 456789",
    "г. Красноярск, ул. Мира, д. 30, кв. 19",
    "40817810400007364512",
    "67300.40"
  ],
  [
    "Семенов Артем Игоревич",
    "17.10.2002",
    "83-124-95",
    "4516 567890",
    "г. Воронеж, Московский пр-т, д. 115, кв. 4",
    "40817810500006451237",
    "289600.15"
  ],
  [
    "Егорова Мария Васильевна",
    "05.05.2003",
    "24-789-31",
    "2014 678901",
    "г. Пермь, ул. Ленина, д. 66, кв. 82",
    "40817810600005123478",
    "94500.60"
  ],
  [
    "Павлов Кирилл Денисович",
    "11.09.2001",
    "95-341-78",
    "7117 789012",
    "г. Волгоград, пр-т Ленина, д. 22, кв. 16",
    "40817810700004231568",
    "12380.00"
  ],
  [
    "Ковалева Дарья Юрьевна",
    "29.07.2000",
    "41-902-63",
    "4515 890123",
    "г. Краснодар, ул. Красная, д. 150, кв. 34",
    "40817810800003124579",
    "410500.20"
  ],
  [
    "Николаев Никита Олегович",
    "18.03.2002",
    "72-564-19",
    "2816 901234",
    "г. Саратов, пр-т Столыпина, д. 9, кв. 2",
    "40817810900002135680",
    "159800.00"
  ],
  [
    "Васильева Елена Константиновна",
    "02.11.2001",
    "38-125-74",
    "4513 012345",
    "г. Тюмень, ул. Республики, д. 48, кв. 91",
    "40817810000001246791",
    "88200.75"
  ],
  [
    "Зайцев Роман Владимирович",
    "24.08.2003",
    "84-781-29",
    "5418 123456",
    "г. Тольятти, ул. Юбилейная, д. 27, кв. 60",
    "40817810100009357802",
    "34500.00"
  ],
  [
    "Попова Юлия Сергеевна",
    "09.01.2002",
    "51-349-82",
    "4517 234567",
    "г. Барнаул, пр-т Ленина, д. 54, кв. 73",
    "40817810200008468913",
    "275400.50"
  ],
  [
    "Кузнецов Андрей Вячеславович",
    "16.06.2001",
    "93-907-45",
    "1114 345678",
    "г. Ижевск, ул. Пушкинская, д. 180, кв. 12",
    "40817810300007579024",
    "189200.00"
  ],
  [
    "Богданова Виктория Антоновна",
    "31.10.2002",
    "27-563-08",
    "4519 456789",
    "г. Ульяновск, ул. Гончарова, д. 32, кв. 40",
    "40817810400006680135",
    "62400.25"
  ],
  [
    "Макаров Денис Валерьевич",
    "20.04.2000",
    "89-128-64",
    "6315 567890",
    "г. Ярославль, ул. Свободы, д. 46, кв. 5",
    "40817810500005791246",
    "387900.90"
  ],
  [
    "Кудрявцева Алина Руслановна",
    "07.12.2003",
    "46-784-21",
    "4514 678901",
    "г. Владивосток, ул. Светланская, д. 109, кв. 28",
    "40817810600004802357",
    "95300.00"
  ],
  [
    "Михайлов Илья Станиславович",
    "13.07.2001",
    "78-340-95",
    "4016 789012",
    "г. Иркутск, ул. Карла Маркса, д. 21, кв. 15",
    "40817810700003913468",
    "168400.80"
  ],
  [
    "Белова Полина Артемовна",
    "26.02.2002",
    "32-905-67",
    "4518 890123",
    "г. Хабаровск, ул. Муравьева-Амурского, д. 18, кв. 77",
    "40817810800002024579",
    "451900.00"
  ],
  [
    "Григорьев Глеб Тимофеевич",
    "04.09.2000",
    "96-562-13",
    "5215 901234",
    "г. Махачкала, пр-т Гамидова, д. 49, кв. 33",
    "40817810900001135680",
    "54800.30"
  ],
  [
    "Тарасова Ксения Игоревна",
    "21.05.2003",
    "15-129-84",
    "4512 012345",
    "г. Томск, пр-т Ленина, д. 105, кв. 9",
    "40817810000009246791",
    "224700.00"
  ],
  [
    "Орлов Владислав Эдуардович",
    "10.03.2001",
    "68-783-49",
    "2517 123456",
    "г. Оренбург, ул. Советская, д. 60, кв. 18",
    "40817810100008357802",
    "112300.45"
  ],
  [
    "Гордеева Вероника Денисовна",
    "27.08.2002",
    "94-348-12",
    "4516 234567",
    "г. Кемерово, пр-т Советский, д. 73, кв. 55",
    "40817810200007468913",
    "79600.00"
  ],
  [
    "Степанов Тимофей Вадимович",
    "15.11.2000",
    "43-904-76",
    "3814 345678",
    "г. Новокузнецк, ул. Кирова, д. 25, кв. 14",
    "40817810300006579024",
    "318500.60"
  ],
  [
    "Филиппова Яна Матвеевна",
    "01.10.2003",
    "79-561-38",
    "4519 456789",
    "г. Рязань, Первомайский пр-т, д. 37, кв. 88",
    "40817810400005680135",
    "143200.00"
  ]
];

/**
 * Автоматическое создание меню при открытии таблицы
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Хеширование (Лаб 1)')
    .addItem('📥 1. Заполнить датасет (30 записей)', 'loadDataset')
    .addSeparator()
    .addItem('🔗 2. Метод цепочек (M=30)', 'buildChainingTablePrompt')
    .addItem('🎯 3. Открытая адресация (M=60, выбор варианта 1-21)', 'buildOpenAddressingPrompt')
    .addSeparator()
    .addItem('🔍 4. Поиск по ключу (Трассировка проб)', 'searchKeyInteractive')
    .addItem('🪦 5. Удалить по ключу (Надгробие DELETED)', 'deleteKeyInteractive')
    .addSeparator()
    .addItem('📊 6. Сводная оценка качества (Все 21 вариант)', 'buildEvaluationReport')
    .addItem('🧹 7. Очистить сгенерированные листы', 'clearGeneratedSheets')
    .addToUi();
}

/**
 * 1. Загрузка / восстановление эталонного датасета на лист «Датасет»
 */
function loadDataset() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Датасет');
  if (!sheet) {
    sheet = ss.insertSheet('Датасет', 0);
  } else {
    sheet.clear();
  }

  // Запись заголовков и данных
  sheet.getRange(1, 1, 1, DATASET_HEADERS.length).setValues([DATASET_HEADERS]);
  sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length).setValues(DEFAULT_DATASET_30);

  // Стилизация шапки
  const headerRange = sheet.getRange(1, 1, 1, DATASET_HEADERS.length);
  headerRange.setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle')
             .setWrap(true);
  sheet.setRowHeight(1, 40);

  // Стилизация данных
  const dataRange = sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length);
  dataRange.setFontFamily('Consolas')
           .setFontSize(10)
           .setVerticalAlignment('middle');

  // Зебра строк
  for (let r = 2; r <= DEFAULT_DATASET_30.length + 1; r++) {
    sheet.setRowHeight(r, 26);
    if (r % 2 === 1) {
      sheet.getRange(r, 1, 1, DATASET_HEADERS.length).setBackground('#f8fafc');
    }
  }

  // Границы
  dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  headerRange.setBorder(true, true, true, true, true, true, '#0f172a', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Автоширина столбцов
  for (let c = 1; c <= DATASET_HEADERS.length; c++) {
    sheet.autoResizeColumn(c);
  }
  sheet.setColumnWidth(1, 260); // ФИО
  sheet.setColumnWidth(5, 320); // Адрес
  sheet.setColumnWidth(6, 220); // Номер счета

  ss.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert('✅ Успешно!', 'Лист «Датасет» заполнен 30 эталонными записями методички.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Считывание данных с листа «Датасет» (или загрузка эталона, если лист пуст)
 */
function getDatasetRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Датасет');
  if (!sheet || sheet.getLastRow() < 2) {
    loadDataset();
    sheet = ss.getSheetByName('Датасет');
  }
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values;
}

/**
 * Преобразование произвольного значения поля в целое число (хешируемый ключ)
 */
function extractNumericKey(val, colIdx) {
  if (val === null || val === undefined) return 0;

  // Число с плавающей точкой (Остаток на счете)
  if (colIdx === 6) {
    let num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(num)) return 0;
    return Math.floor(Math.abs(num) * 100);
  }

  // Номер счета (целое число или длинная строка цифр)
  if (colIdx === 5) {
    const s = String(val).replace(/\D/g, '');
    if (!s) return 0;
    // Разделяем на блоки по 6 цифр для предотвращения переполнения
    let acc = 0;
    for (let i = 0; i < s.length; i += 6) {
      acc = (acc * 37 + parseInt(s.substr(i, 6), 10)) % 2147483647;
    }
    return acc;
  }

  // Дата рождения
  if (colIdx === 1) {
    if (val instanceof Date) {
      return val.getFullYear() * 10000 + (val.getMonth() + 1) * 100 + val.getDate();
    }
    const s = String(val).trim();
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      return parseInt(m[3], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[1], 10);
    }
  }

  // Телефон или паспорт: извлекаем цифры
  if (colIdx === 2 || colIdx === 3) {
    const digits = String(val).replace(/\D/g, '');
    if (digits.length > 0) {
      return parseInt(digits.slice(-9), 10);
    }
  }

  // Строка (ФИО, адрес и т.д.): полиномиальный хеш
  const str = String(val).trim();
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Мультипликативный метод Кнута
 * h(k) = floor(M * ((k * A) mod 1))
 */
function knuthMultiplicativeHash(numKey, M) {
  const frac = (numKey * KNUTH_A) % 1;
  const posFrac = frac < 0 ? frac + 1 : frac;
  return Math.floor(M * posFrac);
}

/**
 * Вторичная хеш-функция h2(k) для двойного хеширования
 * Возвращает шаг из множества чисел Эйлера для M=60, взаимно простых с 60
 */
function getDoubleHashStep(numKey) {
  const idx = Math.abs(numKey) % COPRIMES_60.length;
  return COPRIMES_60[idx];
}

/**
 * Диалог запуска Метода цепочек (M=30)
 */
function buildChainingTablePrompt() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    '🔗 Метод цепочек (M = 30)',
    'Введите номер столбца для хеширования (1–7):\n' +
    '1: ФИО | 2: Дата рождения | 3: Телефон | 4: Паспорт\n' +
    '5: Адрес | 6: Номер счета | 7: Остаток\n' +
    '(по умолчанию 1 — ФИО):',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  let text = prompt.getResponseText().trim();
  let colIdx = 0;
  if (text) {
    let parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
      colIdx = parsed - 1;
    }
  }
  buildChainingTable(colIdx);
}

/**
 * 2. Построение хеш-таблицы методом цепочек (M = 30)
 */
function buildChainingTable(colIdx) {
  colIdx = (colIdx !== undefined) ? colIdx : 0;
  const colName = DATASET_HEADERS[colIdx];
  const M = 30;
  const rows = getDatasetRows();

  // Инициализация бакетов
  const buckets = Array.from({ length: M }, () => []);
  let collisionsCount = 0;

  rows.forEach((row, rowNum) => {
    const rawVal = row[colIdx];
    const numKey = extractNumericKey(rawVal, colIdx);
    const hashVal = knuthMultiplicativeHash(numKey, M);

    if (buckets[hashVal].length > 0) {
      collisionsCount++;
    }
    buckets[hashVal].push({
      rowNum: rowNum + 1,
      rawKey: rawVal,
      fullName: row[0],
      numKey: numKey,
      probeDepth: buckets[hashVal].length + 1
    });
  });

  // Расчет метрик
  let maxChain = 0;
  let emptyBuckets = 0;
  let totalProbes = 0;

  buckets.forEach(b => {
    if (b.length === 0) emptyBuckets++;
    if (b.length > maxChain) maxChain = b.length;
    b.forEach(item => {
      totalProbes += item.probeDepth;
    });
  });
  const avgProbes = (totalProbes / rows.length).toFixed(2);
  const loadFactor = (rows.length / M).toFixed(2);

  // Создание / очистка листа
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Метод_Цепочек_M30');
  if (!sheet) {
    sheet = ss.insertSheet('Метод_Цепочек_M30');
  } else {
    sheet.clear();
  }

  // Информационные карточки сверху
  sheet.getRange('A1:G1').merge().setValue('🔗 ХЕШ-ТАБЛИЦА: МЕТОД ЦЕПОЧЕК (SEPARATE CHAINING) — M = 30')
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:G2').merge().setValue(
    `Ключ хеширования: [Столбец ${colIdx + 1}: ${colName}] | ` +
    `Записей (N): ${rows.length} | Емкость (M): ${M} | Коэфф. загрузки (α): ${loadFactor} | ` +
    `Коллизий: ${collisionsCount} | Макс. цепочка: ${maxChain} | Пустых слотов: ${emptyBuckets} | Ср. число проб (Sn): ${avgProbes}`
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  // Таблица слотов
  const tableHeaders = ['Слот (Bucket)', 'Хеш h(k)', 'Длина цепочки', 'Цепочка элементов (Ключ -> ФИО [глубина])', 'Статус'];
  sheet.getRange(4, 1, 1, tableHeaders.length).setValues([tableHeaders])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  const outputRows = [];
  for (let slot = 0; slot < M; slot++) {
    const chain = buckets[slot];
    let chainStr = '';
    let status = chain.length === 0 ? 'Пусто (0)' : (chain.length === 1 ? '1 элемент (без коллизий)' : `${chain.length} элемента (КОЛЛИЗИЯ)`);
    
    if (chain.length > 0) {
      chainStr = chain.map((it, idx) => `[#${it.rowNum}] «${it.rawKey}» (${it.fullName}) [глуб: ${idx + 1}]`).join('  ➜  ');
    } else {
      chainStr = '—';
    }

    outputRows.push([
      slot,
      slot,
      chain.length,
      chainStr,
      status
    ]);
  }

  sheet.getRange(5, 1, M, tableHeaders.length).setValues(outputRows);
  sheet.getRange(5, 1, M, 3).setHorizontalAlignment('center');
  sheet.getRange(5, 5, M, 1).setHorizontalAlignment('center');

  // Цветовое форматирование статусов
  for (let slot = 0; slot < M; slot++) {
    const r = 5 + slot;
    const len = buckets[slot].length;
    if (len === 0) {
      sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#f8fafc').setFontColor('#94a3b8');
    } else if (len === 1) {
      sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#ffffff').setFontColor('#0f172a');
      sheet.getRange(r, 5).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
    } else {
      sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#fffbeb').setFontColor('#0f172a');
      sheet.getRange(r, 5).setBackground('#fee2e2').setFontColor('#991b1b').setFontWeight('bold');
    }
  }

  // Оформление границ и ширин
  sheet.getRange(4, 1, M + 1, tableHeaders.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 550);
  sheet.setColumnWidth(5, 180);

  ss.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert(
    '✅ Метод цепочек построен!',
    `Лист: «Метод_Цепочек_M30»\n` +
    `Ключ: Столбец ${colIdx + 1} (${colName})\n` +
    `Коллизий: ${collisionsCount}\n` +
    `Максимальная длина цепочки: ${maxChain}\n` +
    `Среднее число сравнений при поиске: ${avgProbes}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Диалог запуска Открытой адресации (M=60) для любого из 21 вариантов
 */
function buildOpenAddressingPrompt() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    '🎯 Открытая адресация (M = 60)',
    'Введите номер варианта лабораторной работы (1–21):\n' +
    '• Вар 1–7: Линейное пробирование (поля 1..7)\n' +
    '• Вар 8–14: Квадратичное пробирование (c1=1, c2=1, поля 1..7)\n' +
    '• Вар 15–21: Двойное хеширование (поля 1..7)\n' +
    '(по умолчанию Вариант 1):',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  let text = prompt.getResponseText().trim();
  let variant = 1;
  if (text) {
    let parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 21) {
      variant = parsed;
    }
  }
  buildOpenAddressingTable(variant);
}

/**
 * 3. Построение хеш-таблицы методом открытой адресации (M = 60)
 */
function buildOpenAddressingTable(variant) {
  variant = (variant !== undefined && variant >= 1 && variant <= 21) ? variant : 1;
  const M = 60;
  const rows = getDatasetRows();

  // Определение параметров варианта
  let colIdx, methodType, methodName;
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
  const colName = DATASET_HEADERS[colIdx];

  // Инициализация таблицы из 60 ячеек
  // Статусы: 'EMPTY', 'OCCUPIED', 'DELETED'
  const table = Array.from({ length: M }, () => ({
    status: 'EMPTY',
    rawKey: '',
    fullName: '',
    rowNum: null,
    numKey: null,
    primaryHash: null,
    probesCount: 0,
    trace: []
  }));

  let totalInsertCollisions = 0;
  let totalInsertProbes = 0;
  let maxProbes = 0;

  // Вставка 30 записей
  rows.forEach((row, rowIdx) => {
    const rawVal = row[colIdx];
    const numKey = extractNumericKey(rawVal, colIdx);
    const h1 = knuthMultiplicativeHash(numKey, M);
    const h2 = getDoubleHashStep(numKey);

    let placed = false;
    let probes = 0;
    const probeTrace = [];

    for (let i = 0; i < M; i++) {
      probes++;
      let slot;
      if (methodType === 'linear') {
        slot = (h1 + i) % M;
      } else if (methodType === 'quadratic') {
        slot = (h1 + i + i * i) % M;
      } else {
        slot = (h1 + i * h2) % M;
      }
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
        if (probes > 1) {
          totalInsertCollisions++;
        }
        totalInsertProbes += probes;
        if (probes > maxProbes) maxProbes = probes;
        break;
      }
    }

    if (!placed) {
      throw new Error(`Переполнение хеш-таблицы при вставке записи #${rowIdx + 1}: ${rawVal}`);
    }
  });

  const avgProbes = (totalInsertProbes / rows.length).toFixed(2);
  const loadFactor = (rows.length / M).toFixed(2);

  // Создание листа
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Открытая_Адресация_M60');
  if (!sheet) {
    sheet = ss.insertSheet('Открытая_Адресация_M60');
  } else {
    sheet.clear();
  }

  // Заголовок
  sheet.getRange('A1:H1').merge().setValue(`🎯 ХЕШ-ТАБЛИЦА: ОТКРЫТАЯ АДРЕСАЦИЯ (OPEN ADDRESSING) — ВАРИАНТ ${variant}`)
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:H2').merge().setValue(
    `Метод: ${methodName} | Ключ: Столбец ${colIdx + 1} (${colName}) | ` +
    `N = ${rows.length}, M = ${M}, α = ${loadFactor} | Коллизий: ${totalInsertCollisions} | Макс. проб: ${maxProbes} | Ср. число проб (Sn): ${avgProbes}`
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  // Сохраняем метаданные варианта в невидимом месте или в DocumentProperties для поиска/удаления
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_VARIANT', String(variant));
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_COL_IDX', String(colIdx));
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_METHOD', methodType);

  // Таблица ячеек
  const tableHeaders = ['Слот (0..59)', 'Статус', 'Ключ поиска', 'Ф.И.О. владельца', 'Исходная строка №', 'Хеш h1(k)', 'Проб при вставке', 'Трасса пробирования'];
  sheet.getRange(4, 1, 1, tableHeaders.length).setValues([tableHeaders])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  const outputRows = [];
  for (let s = 0; s < M; s++) {
    const item = table[s];
    let statusLabel = item.status === 'EMPTY' ? 'EMPTY (пусто)' : (item.status === 'DELETED' ? '🪦 DELETED' : 'OCCUPIED (занято)');
    let traceStr = item.trace.length > 0 ? item.trace.join(' ➔ ') : '—';

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

  // Цветовая раскраска ячеек
  for (let s = 0; s < M; s++) {
    const r = 5 + s;
    const item = table[s];
    if (item.status === 'EMPTY') {
      sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#f8fafc').setFontColor('#94a3b8');
    } else if (item.status === 'DELETED') {
      sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#fee2e2').setFontColor('#991b1b');
    } else {
      if (item.probesCount === 1) {
        sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#ffffff').setFontColor('#0f172a');
        sheet.getRange(r, 2).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
      } else {
        sheet.getRange(r, 1, 1, tableHeaders.length).setBackground('#fffbeb').setFontColor('#0f172a');
        sheet.getRange(r, 2).setBackground('#fef3c7').setFontColor('#b45309').setFontWeight('bold');
        sheet.getRange(r, 7).setFontWeight('bold').setFontColor('#dc2626');
      }
    }
  }

  // Границы и колонки
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
  SpreadsheetApp.getUi().alert(
    '✅ Открытая адресация построена!',
    `Лист: «Открытая_Адресация_M60»\n` +
    `Вариант: ${variant}\n` +
    `Ключ: Столбец ${colIdx + 1} (${colName})\n` +
    `Метод: ${methodName}\n` +
    `Коллизий: ${totalInsertCollisions}\n` +
    `Макс. проб: ${maxProbes}\n` +
    `Среднее число проб: ${avgProbes}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 4. Интерактивный поиск по ключу в таблице открытой адресации
 */
function searchKeyInteractive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Открытая_Адресация_M60');
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('⚠️ Ошибка', 'Сначала постройте таблицу «Открытая_Адресация_M60» (действие №3).', ui.ButtonSet.OK);
    return;
  }

  const savedVariant = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_VARIANT') || '1', 10);
  const savedColIdx = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_COL_IDX') || '0', 10);
  const savedMethod = PropertiesService.getDocumentProperties().getProperty('ACTIVE_METHOD') || 'linear';
  const colName = DATASET_HEADERS[savedColIdx];

  const prompt = ui.prompt(
    '🔍 Поиск ключа в хеш-таблице M=60',
    `Введите искомое значение ключа [Столбец ${savedColIdx + 1}: ${colName}]:\n` +
    `(Например: Иванов Иван Иванович, 15.04.2002, 23-456-78 и т.д.)`,
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const searchVal = prompt.getResponseText().trim();
  if (!searchVal) return;

  const M = 60;
  const numKey = extractNumericKey(searchVal, savedColIdx);
  const h1 = knuthMultiplicativeHash(numKey, M);
  const h2 = getDoubleHashStep(numKey);

  // Считываем текущее состояние слотов листа
  const tableData = sheet.getRange(5, 1, M, 4).getValues();

  let found = false;
  let foundSlot = -1;
  let probes = 0;
  const traceDetails = [];

  for (let i = 0; i < M; i++) {
    probes++;
    let slot;
    if (savedMethod === 'linear') {
      slot = (h1 + i) % M;
    } else if (savedMethod === 'quadratic') {
      slot = (h1 + i + i * i) % M;
    } else {
      slot = (h1 + i * h2) % M;
    }

    const rowStatus = String(tableData[slot][1]);
    const rowKey = String(tableData[slot][2]);
    const rowName = String(tableData[slot][3]);

    if (rowStatus.indexOf('EMPTY') !== -1) {
      traceDetails.push(`Шаг ${probes}: Слот [${slot}] ➔ EMPTY (пусто). Цепочка оборвана.`);
      break;
    } else if (rowStatus.indexOf('DELETED') !== -1) {
      traceDetails.push(`Шаг ${probes}: Слот [${slot}] ➔ 🪦 DELETED (надгробие). Пропускаем, продолжаем поиск!`);
    } else {
      // OCCUPIED
      if (rowKey.toLowerCase() === searchVal.toLowerCase()) {
        traceDetails.push(`Шаг ${probes}: Слот [${slot}] ➔ НАЙДЕНО! Совпадение ключа «${rowKey}» (${rowName}).`);
        found = true;
        foundSlot = slot;
        break;
      } else {
        traceDetails.push(`Шаг ${probes}: Слот [${slot}] ➔ OCCUPIED («${rowKey}» ≠ «${searchVal}»). Коллизия.`);
      }
    }
  }

  // Подсветка найденной строки
  if (found) {
    sheet.setActiveRange(sheet.getRange(5 + foundSlot, 1, 1, 8));
    ui.alert(
      '🎉 Запись успешно найдена!',
      `Результат: НАЙДЕНО в слоте #${foundSlot}\n` +
      `Ключ: «${searchVal}»\n` +
      `Всего проверено ячеек: ${probes}\n\n` +
      `Трассировка цепочки проб:\n${traceDetails.join('\n')}`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Запись не найдена',
      `Ключ «${searchVal}» отсутствует в хеш-таблице.\n` +
      `Всего проверено ячеек: ${probes}\n\n` +
      `Трассировка цепочки проб:\n${traceDetails.join('\n')}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * 5. Интерактивное удаление по ключу с установкой надгробия DELETED (Tombstone)
 */
function deleteKeyInteractive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Открытая_Адресация_M60');
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('⚠️ Ошибка', 'Сначала постройте таблицу «Открытая_Адресация_M60» (действие №3).', ui.ButtonSet.OK);
    return;
  }

  const savedVariant = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_VARIANT') || '1', 10);
  const savedColIdx = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_COL_IDX') || '0', 10);
  const savedMethod = PropertiesService.getDocumentProperties().getProperty('ACTIVE_METHOD') || 'linear';
  const colName = DATASET_HEADERS[savedColIdx];

  const prompt = ui.prompt(
    '🪦 Удаление ключа (Tombstone)',
    `Введите значение ключа для удаления [Столбец ${savedColIdx + 1}: ${colName}]:\n` +
    `Ячейка получит статус DELETED (надгробие), сохраняя целостность цепочек поиска!`,
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const deleteVal = prompt.getResponseText().trim();
  if (!deleteVal) return;

  const M = 60;
  const numKey = extractNumericKey(deleteVal, savedColIdx);
  const h1 = knuthMultiplicativeHash(numKey, M);
  const h2 = getDoubleHashStep(numKey);

  const tableData = sheet.getRange(5, 1, M, 4).getValues();

  let foundSlot = -1;
  let probes = 0;

  for (let i = 0; i < M; i++) {
    probes++;
    let slot;
    if (savedMethod === 'linear') {
      slot = (h1 + i) % M;
    } else if (savedMethod === 'quadratic') {
      slot = (h1 + i + i * i) % M;
    } else {
      slot = (h1 + i * h2) % M;
    }

    const rowStatus = String(tableData[slot][1]);
    const rowKey = String(tableData[slot][2]);

    if (rowStatus.indexOf('EMPTY') !== -1) {
      break;
    } else if (rowStatus.indexOf('OCCUPIED') !== -1 && rowKey.toLowerCase() === deleteVal.toLowerCase()) {
      foundSlot = slot;
      break;
    }
  }

  if (foundSlot !== -1) {
    const r = 5 + foundSlot;
    // Устанавливаем надгробие
    sheet.getRange(r, 2).setValue('🪦 DELETED').setBackground('#fee2e2').setFontColor('#991b1b').setFontWeight('bold');
    sheet.getRange(r, 3).setValue(`[Удален: ${deleteVal}]`).setFontColor('#94a3b8');
    sheet.getRange(r, 4).setValue('—').setFontColor('#94a3b8');
    sheet.setActiveRange(sheet.getRange(r, 1, 1, 8));

    ui.alert(
      '🪦 Элемент удален с надгробием!',
      `Слот #${foundSlot} переведен в состояние «🪦 DELETED».\n` +
      `Ключ: «${deleteVal}»\n\n` +
      `Важно для защиты работы: Мы не очищаем ячейку в EMPTY, ` +
      `иначе последующие элементы той же цепочки проб станут недоступными для поиска!`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert('❌ Не найдено', `Элемент с ключом «${deleteVal}» не найден в таблице.`, ui.ButtonSet.OK);
  }
}

/**
 * 6. Построение сводной таблицы оценки качества (все 21 вариант vs Кнут)
 */
function buildEvaluationReport() {
  const rows = getDatasetRows();
  const N = rows.length;
  const M_chain = 30;
  const M_open = 60;
  const alpha_open = N / M_open; // 0.5

  const evalRows = [];

  // Расчет всех 21 вариантов открытой адресации
  for (let v = 1; v <= 21; v++) {
    let colIdx, methodType, methodName, knuthTheor;
    if (v >= 1 && v <= 7) {
      colIdx = v - 1;
      methodType = 'linear';
      methodName = 'Линейное';
      knuthTheor = 0.5 * (1 + 1 / (1 - alpha_open)); // 1.50
    } else if (v >= 8 && v <= 14) {
      colIdx = v - 8;
      methodType = 'quadratic';
      methodName = 'Квадратичное';
      knuthTheor = 1 - Math.log(1 - alpha_open) - alpha_open / 2; // ~1.44
    } else {
      colIdx = v - 15;
      methodType = 'double';
      methodName = 'Двойное хеширование';
      knuthTheor = (1 / alpha_open) * Math.log(1 / (1 - alpha_open)); // ~1.39
    }

    const table = new Array(M_open).fill(null);
    let collisions = 0;
    let totalProbes = 0;

    rows.forEach((row) => {
      const numKey = extractNumericKey(row[colIdx], colIdx);
      const h1 = knuthMultiplicativeHash(numKey, M_open);
      const h2 = getDoubleHashStep(numKey);

      let probes = 0;
      for (let i = 0; i < M_open; i++) {
        probes++;
        let slot;
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

    const avgProbes = (totalProbes / N).toFixed(2);
    evalRows.push([
      v,
      `Столбец ${colIdx + 1}: ${DATASET_HEADERS[colIdx]}`,
      methodName,
      collisions,
      parseFloat(avgProbes),
      parseFloat(knuthTheor.toFixed(2)),
      Math.abs(avgProbes - knuthTheor).toFixed(2)
    ]);
  }

  // Создание листа
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Оценка_Качества');
  if (!sheet) {
    sheet = ss.insertSheet('Оценка_Качества');
  } else {
    sheet.clear();
  }

  // Заголовок
  sheet.getRange('A1:G1').merge().setValue('📊 СВОДНАЯ ТАБЛИЦА ОЦЕНКИ КАЧЕСТВА ХЕШИРОВАНИЯ (ВСЕ 21 ВАРИАНТ)')
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:G2').merge().setValue(
    'Сравнение эмпирического среднего числа проб (Sn) при вставке 30 записей в M=60 с теоретическими пределами Д. Кнута (Sn ≈ 1/α · ln(1/(1-α)))'
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  const headers = [
    'Вариант', 'Ключевое поле (Столбец)', 'Метод разрешения коллизий',
    'Коллизий при вставке', 'Ср. число проб (Sn факт)', 'Теория Кнута (Sn теор)', 'Отклонение |Факт - Теор|'
  ];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange(5, 1, evalRows.length, headers.length).setValues(evalRows);
  sheet.getRange(5, 1, evalRows.length, 1).setHorizontalAlignment('center');
  sheet.getRange(5, 3, evalRows.length, 5).setHorizontalAlignment('center');

  // Оформление границ и стилей
  sheet.getRange(4, 1, evalRows.length + 1, headers.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 190);
  sheet.setColumnWidth(4, 170);
  sheet.setColumnWidth(5, 170);
  sheet.setColumnWidth(6, 170);
  sheet.setColumnWidth(7, 180);

  // Тепловая раскраска столбца коллизий
  for (let r = 0; r < evalRows.length; r++) {
    const colCount = evalRows[r][3];
    const cell = sheet.getRange(5 + r, 4);
    if (colCount <= 5) {
      cell.setBackground('#dcfce7').setFontColor('#166534'); // отлично
    } else if (colCount <= 9) {
      cell.setBackground('#fef3c7').setFontColor('#b45309'); // нормально
    } else {
      cell.setBackground('#fee2e2').setFontColor('#991b1b'); // много коллизий
    }
  }

  ss.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert(
    '✅ Сводная оценка построена!',
    'Лист: «Оценка_Качества»\nРассчитаны все 21 вариант с сравнением формул Д. Кнута.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 7. Очистить сгенерированные листы
 */
function clearGeneratedSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheetsToKeep = ['Датасет'];
  const sheets = ss.getSheets();

  let removed = 0;
  sheets.forEach(sh => {
    if (!sheetsToKeep.includes(sh.getName())) {
      if (sheets.length - removed > 1) {
        ss.deleteSheet(sh);
        removed++;
      }
    }
  });

  ui.alert('🧹 Очистка завершена', `Удалено сгенерированных листов: ${removed}`, ui.ButtonSet.OK);
}
