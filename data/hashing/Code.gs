/**
 * ==============================================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №1: ХЕШИРОВАНИЕ И ХЕШ-ТАБЛИЦЫ (АОД / АиСД, 3 КУРС)
 * Вариант 3: Ключ — Номер телефона (xx-xxx-xx), Линейное пробирование
 * Платформа: Google Sheets + Google Apps Script (GAS)
 *
 * АРХИТЕКТУРА И ВОЗМОЖНОСТИ:
 * R1. Главный лист «Панель_Управления» (setupControlSheet):
 *     - Слева (столбцы A..G): Таблица данных (Столбец III — Телефон xx-xxx-xx, ФИО, Дата, Паспорт, Адрес, Счет, Остаток)
 *     - Справа (столбцы I..N): Блок констант (M=60, step=1, fallback=60, Dropdown: Открытая адресация / Метод цепочек, N=30)
 *     - Редактируемый в ячейке JS-код функции numKey (new Function динамическое исполнение с безопасным fallback)
 *     - Управляющие кнопки и меню: 🎲 Генерация N строк, ⚡ Построение хеш-таблицы, 📈 Стресс-тест
 * R2. Стресс-тест и встроенная гистограмма (runStressTest):
 *     - Генерация N (< 1000) синтетических номеров xx-xxx-xx
 *     - Мультипликативный хеш Кнута: h(k) = floor(M * ((k * A) mod 1)) с защитой диапазона [0, M-1]
 *     - Расчет распределения частот слотов 0..M-1, метрик: среднее N/M, макс. коллизий, число пустых, критерий χ² (Пирсон)
 *     - Автоматическое построение/обновление встроенной столбчатой диаграммы (COLUMN) без накопления дубликатов
 * R3. Шаблонизация и генерация листа хеш-таблицы (buildHashTableFromTemplate):
 *     - Скрытый эталонный лист-шаблон «_Шаблон_Таблицы_»
 *     - Клонирование шаблона в целевой лист (Хеш_Таблица_Линейное_M{M} или Хеш_Таблица_Цепочки_M{M})
 *     - Открытая адресация: статусы EMPTY, OCCUPIED, DELETED, число проб, трасса h(k, i) = (h1(k) + i*step) mod M с fallback
 *     - Метод цепочек: связный список бакетов, подсчет глубины коллизий
 *     - Нативный автофильтр Google Sheets (range.createFilter()) с защитой от повторного создания
 *     - Интерактивные операции: «➕ Добавить запись» (insertRecordInteractive), «🗑️ Удалить запись» (deleteRecordInteractive с tombstone)
 * Дополнительно: Поддержка 21 академического варианта и таблицы оценки качества (buildEvaluationReport).
 * ==============================================================================================
 */

// Константа золотого сечения Кнута: A = (sqrt(5) - 1) / 2
const KNUTH_A = (Math.sqrt(5) - 1) / 2; // ~0.618033988749895

// Числа Эйлера, взаимно простые с M = 60 (gcd(s, 60) = 1)
const COPRIMES_60 = [1, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59];

// Заголовки датасета Таблицы 1
const DATASET_HEADERS = [
  "Ф.И.О.",
  "Дата рождения",
  "Номер телефона",
  "Серия и номер паспорта",
  "Адрес прописки",
  "Номер банковского счета",
  "Остаток денег на счете"
];

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
    "40817810200002837465",
    "112000.00"
  ],
  [
    "Федорова Мария Александровна",
    "05.05.2002",
    "12-678-90",
    "3216 345678",
    "г. Уфа, ул. Ленина, д. 30, кв. 55",
    "40817810300003746582",
    "34500.20"
  ],
  [
    "Лебедев Артем Игоревич",
    "22.02.2001",
    "67-890-12",
    "4510 456789",
    "г. Челябинск, пр-т Победы, д. 150, кв. 42",
    "40817810400004658291",
    "267890.40"
  ],
  [
    "Кузнецов Павел Романович",
    "17.06.2003",
    "33-445-56",
    "5418 567890",
    "г. Красноярск, ул. Мира, д. 85, кв. 19",
    "40817810500005569302",
    "415000.00"
  ],
  [
    "Попова Татьяна Сергеевна",
    "09.10.2002",
    "78-901-23",
    "6519 678901",
    "г. Пермь, Комсомольский пр-т, д. 60, кв. 77",
    "40817810600006478213",
    "95600.60"
  ],
  [
    "Васильев Кирилл Денисович",
    "31.01.2001",
    "89-012-34",
    "7015 789012",
    "г. Волгоград, пр-т Ленина, д. 22, кв. 104",
    "40817810700007389124",
    "182300.15"
  ],
  [
    "Зайцева Елена Владимировна",
    "18.04.2000",
    "45-678-91",
    "4516 890123",
    "г. Воронеж, ул. Плехановская, д. 18, кв. 36",
    "40817810800008291035",
    "67450.00"
  ],
  [
    "Павлов Никита Олегович",
    "07.09.2002",
    "23-789-01",
    "2017 901234",
    "г. Саратов, ул. Чапаева, д. 72, кв. 15",
    "40817810900009102946",
    "340100.80"
  ],
  [
    "Семенов Илья Константинович",
    "24.11.2003",
    "56-123-45",
    "4018 012345",
    "г. Тюмень, ул. Республики, д. 140, кв. 82",
    "40817810000000192837",
    "128900.00"
  ],
  [
    "Голубева Дарья Андреевна",
    "11.03.2001",
    "89-456-78",
    "3314 123456",
    "г. Ижевск, ул. Пушкинская, д. 200, кв. 63",
    "40817810100001283746",
    "54000.50"
  ],
  [
    "Виноградов Денис Юрьевич",
    "29.07.2002",
    "12-901-23",
    "4519 234567",
    "г. Барнаул, пр-т Ленина, д. 45, кв. 91",
    "40817810200002374658",
    "231500.75"
  ],
  [
    "Богданова Алина Евгеньевна",
    "02.12.2000",
    "67-234-56",
    "5215 345678",
    "г. Ульяновск, ул. Гончарова, д. 11, кв. 28",
    "40817810300003465769",
    "475200.00"
  ],
  [
    "Воробьев Вадим Станиславович",
    "16.05.2003",
    "34-890-12",
    "6016 456789",
    "г. Иркутск, ул. Карла Маркса, д. 32, кв. 5",
    "40817810400004576870",
    "83100.25"
  ],
  [
    "Федотов Егор Ильич",
    "20.08.2001",
    "90-123-45",
    "7117 567890",
    "г. Хабаровск, ул. Муравьева-Амурского, д. 19, кв. 44",
    "40817810500005687981",
    "164700.00"
  ],
  [
    "Михайлова Ксения Артемовна",
    "08.01.2002",
    "45-890-23",
    "4513 678901",
    "г. Ярославль, ул. Свободы, д. 55, кв. 73",
    "40817810600006798092",
    "91250.30"
  ],
  [
    "Беляев Виктор Тимофеевич",
    "27.06.2000",
    "78-234-67",
    "2818 789012",
    "г. Владивосток, ул. Светланская, д. 88, кв. 12",
    "40817810700007809103",
    "389000.90"
  ],
  [
    "Тарасова Полина Григорьевна",
    "13.10.2003",
    "23-901-34",
    "3619 890123",
    "г. Томск, пр-т Ленина, д. 70, кв. 115",
    "40817810800008910214",
    "72400.00"
  ],
  [
    "Белов Матвей Валерьевич",
    "04.04.2002",
    "67-345-78",
    "4511 901234",
    "г. Оренбург, ул. Советская, д. 24, кв. 51",
    "40817810900009021325",
    "215600.45"
  ],
  [
    "Комарова Вероника Сергеевна",
    "21.09.2001",
    "12-456-89",
    "5014 012345",
    "г. Кемерово, пр-т Советский, д. 58, кв. 33",
    "40817810000000132436",
    "498000.00"
  ],
  [
    "Орлов Владислав Антонович",
    "10.02.2003",
    "89-567-90",
    "6215 123456",
    "г. Рязань, ул. Почтовая, д. 40, кв. 17",
    "40817810100001243547",
    "63800.70"
  ],
  [
    "Киселева Алена Дмитриевна",
    "26.07.2000",
    "34-901-45",
    "7316 234567",
    "г. Астрахань, ул. Кирова, д. 15, кв. 98",
    "40817810200002354658",
    "176500.00"
  ],
  [
    "Макаров Артур Борисович",
    "15.11.2002",
    "56-234-78",
    "4517 345678",
    "г. Пенза, ул. Московская, д. 82, кв. 6",
    "40817810300003465769",
    "324100.85"
  ],
  [
    "Андреева Юлиана Викторовна",
    "06.03.2001",
    "90-678-12",
    "2418 456789",
    "г. Липецк, ул. Советская, д. 64, кв. 89",
    "40817810400004576870",
    "143200.00"
  ]
];

/**
 * Автоматическое создание нативного меню при открытии таблицы
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
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
 * ==============================================================================================
 * 1. МАТЕМАТИЧЕСКИЙ ДВИЖОК ХЕШИРОВАНИЯ И ДИНАМИЧЕСКИЙ numKey
 * ==============================================================================================
 */

/**
 * Мультипликативное хеширование Д. Кнута
 * h(k) = floor(M * ((k * A) mod 1))
 * Гарантирует строгое попадание в диапазон [0, M-1]
 */
function knuthMultiplicativeHash(numKey, M) {
  const k = Number(numKey) || 0;
  const m = Number(M) || 60;
  const frac = (k * KNUTH_A) % 1;
  const posFrac = frac < 0 ? frac + 1 : frac;
  const slot = Math.floor(m * posFrac);
  if (slot >= m) return m - 1;
  if (slot < 0) return 0;
  return slot;
}

/**
 * Динамическое вычисление числового ключа по коду из ячейки таблицы
 * Поддерживает:
 * - Стрелочные функции: val => parseInt(String(val).replace(/\D/g, ''), 10)
 * - Функции: function(val) { return ... }
 * - Выражения и тела с return
 * При любой синтаксической или runtime ошибке безопасно возвращает цифры ключа (или 0).
 */
function evaluateNumKey(val, codeStr) {
  const defaultFn = (v) => {
    const digits = String(v || '').replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  if (!codeStr || typeof codeStr !== 'string' || !codeStr.trim()) {
    return defaultFn(val);
  }

  const raw = codeStr.trim();
  try {
    let fn;
    if (raw.startsWith('function') || raw.startsWith('(') || raw.includes('=>')) {
      fn = new Function('return (' + raw + ');')();
    } else {
      fn = new Function('val', raw.includes('return') ? raw : 'return (' + raw + ');');
    }
    const res = fn(val);
    const num = Number(res);
    return isNaN(num) ? 0 : Math.floor(Math.abs(num));
  } catch (err) {
    return defaultFn(val);
  }
}

/**
 * Генератор синтетического номера телефона формата xx-xxx-xx
 */
function generateSyntheticPhone(index) {
  const p1 = String((index * 17 + 10) % 90 + 10).padStart(2, '0');
  const p2 = String((index * 31 + 100) % 900 + 100).padStart(3, '0');
  const p3 = String((index * 47 + 10) % 90 + 10).padStart(2, '0');
  return `${p1}-${p2}-${p3}`;
}

/**
 * Расчет статистических метрик равномерности распределения
 */
function computeUniformityStatistics(frequencies, N, M) {
  const mean = N / M;
  let maxCollisions = 0;
  let emptySlots = 0;
  let chiSquare = 0;

  for (let s = 0; s < M; s++) {
    const obs = frequencies[s] || 0;
    if (obs > maxCollisions) maxCollisions = obs;
    if (obs === 0) emptySlots++;
    const diff = obs - mean;
    chiSquare += (diff * diff) / mean;
  }

  return { mean, maxCollisions, emptySlots, chiSquare };
}

/**
 * Вторичная хеш-функция h2(k) для двойного хеширования (для 21 варианта)
 */
function getDoubleHashStep(numKey) {
  const idx = Math.abs(numKey) % COPRIMES_60.length;
  return COPRIMES_60[idx];
}

/**
 * Извлечение числового ключа для 21 академического варианта
 */
function extractNumericKey(val, colIdx) {
  if (val === null || val === undefined) return 0;

  if (colIdx === 6) {
    let num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(num)) return 0;
    return Math.floor(Math.abs(num) * 100);
  }

  if (colIdx === 5) {
    const s = String(val).replace(/\D/g, '');
    if (!s) return 0;
    let acc = 0;
    for (let i = 0; i < s.length; i += 6) {
      acc = (acc * 37 + parseInt(s.substr(i, 6), 10)) % 2147483647;
    }
    return acc;
  }

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

  if (colIdx === 2 || colIdx === 3) {
    const digits = String(val).replace(/\D/g, '');
    if (digits.length > 0) {
      return parseInt(digits.slice(-9), 10);
    }
  }

  const str = String(val).trim();
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * ==============================================================================================
 * 2. R1: НАСТРОЙКА ГЛАВНОГО ЛИСТА («Панель_Управления»)
 * ==============================================================================================
 */

/**
 * Создание и форматирование главного дашборда «Панель_Управления»
 */
function setupControlSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Панель_Управления');
  if (!sheet) {
    sheet = ss.insertSheet('Панель_Управления', 0);
  }

  // --- ЛЕВЫЙ БЛОК: ТАБЛИЦА ИСХОДНЫХ ДАННЫХ (A..G) ---
  // Шапка таблицы A1:G1
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
  const dataRange = sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length);
  dataRange.setFontFamily('Consolas')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  // Зебра строк данных
  for (let r = 2; r <= DEFAULT_DATASET_30.length + 1; r++) {
    sheet.setRowHeight(r, 26);
    if (r % 2 === 1) {
      sheet.getRange(r, 1, 1, DATASET_HEADERS.length).setBackground('#f8fafc');
    } else {
      sheet.getRange(r, 1, 1, DATASET_HEADERS.length).setBackground('#ffffff');
    }
  }

  // Границы
  dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(1, 1, 1, DATASET_HEADERS.length).setBorder(true, true, true, true, true, true, '#0f172a', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Ширина столбцов A..H
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

  // Параметры I3..J7
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
  const rule = SpreadsheetApp.newDataValidation()
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

  // Ширина колонок настроек
  sheet.setColumnWidth(9, 180);  // I
  sheet.setColumnWidth(10, 140); // J
  sheet.setColumnWidth(11, 130); // K
  sheet.setColumnWidth(12, 130); // L
  sheet.setColumnWidth(13, 140); // M
  sheet.setColumnWidth(14, 140); // N

  // Гарантируем наличие скрытого шаблона
  ensureTemplateSheet(ss);

  ss.setActiveSheet(sheet);
  return sheet;
}

/**
 * Генерация N случайных валидных строк данных для датасета
 */
function generateSyntheticRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Панель_Управления');
  if (!sheet) {
    sheet = setupControlSheet();
  }

  const N_raw = parseInt(sheet.getRange('J7').getValue(), 10);
  const N = (!isNaN(N_raw) && N_raw > 0) ? Math.min(999, Math.max(1, N_raw)) : 30;
  sheet.getRange('J7').setValue(N);

  const firstNames = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артем', 'Илья', 'Михаил', 'Кирилл', 'Анна', 'Елена', 'Ольга', 'Татьяна', 'Мария'];
  const lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семенов'];
  const middleNames = ['Иванович', 'Сергеевич', 'Александрович', 'Дмитриевич', 'Андреевич', 'Алексеевич', 'Михайлович', 'Владимирович'];
  const cities = ['г. Москва', 'г. Санкт-Петербург', 'г. Новосибирск', 'г. Екатеринбург', 'г. Казань', 'г. Нижний Новгород', 'г. Самара', 'г. Омск'];
  const streets = ['ул. Ленина', 'ул. Мира', 'пр-т Победы', 'ул. Гагарина', 'ул. Советская', 'ул. Тверская', 'ул. Садовая', 'пр-т Мира'];

  const newRows = [];
  for (let i = 0; i < N; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3 + 1) % lastNames.length];
    const mn = middleNames[(i * 2 + 3) % middleNames.length];
    const fullName = `${ln} ${fn} ${mn}`;

    const day = String((i * 7) % 28 + 1).padStart(2, '0');
    const month = String((i * 3) % 12 + 1).padStart(2, '0');
    const year = 1980 + (i % 25);
    const birthDate = `${day}.${month}.${year}`;

    const phone = generateSyntheticPhone(i);
    const passportSeries = String(1000 + (i * 137) % 9000);
    const passportNumber = String(100000 + (i * 911) % 900000);
    const passport = `${passportSeries} ${passportNumber}`;

    const city = cities[i % cities.length];
    const street = streets[(i * 2) % streets.length];
    const building = (i % 99) + 1;
    const apt = (i * 7) % 200 + 1;
    const address = `${city}, ${street}, д. ${building}, кв. ${apt}`;

    const account = `40817810${String(100000000000 + i * 37913).slice(-12)}`;
    const balance = ((i * 5432.10 + 1250.75) % 900000 + 5000).toFixed(2);

    newRows.push([fullName, birthDate, phone, passport, address, account, balance]);
  }

  // Очищаем старые строки, если их было больше N
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 7).clearContent().clearFormat();
  }

  // Записываем сгенерированные строки
  sheet.getRange(2, 1, N, 7).setValues(newRows);
  const dataRange = sheet.getRange(2, 1, N, 7);
  dataRange.setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');

  for (let r = 2; r <= N + 1; r++) {
    sheet.setRowHeight(r, 26);
    if (r % 2 === 1) {
      sheet.getRange(r, 1, 1, 7).setBackground('#f8fafc');
    } else {
      sheet.getRange(r, 1, 1, 7).setBackground('#ffffff');
    }
  }
  dataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  try {
    SpreadsheetApp.getUi().alert('🎲 Генерация завершена!', `Успешно сгенерировано ${N} строк данных в таблице исходных данных.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * ==============================================================================================
 * 3. R2: СТРЕСС-ТЕСТ И ВСТРОЕННАЯ ДИАГРАММА РАСПРЕДЕЛЕНИЯ (runStressTest)
 * ==============================================================================================
 */

/**
 * Запуск стресс-теста хеш-функции со встроенной диаграммой на листе «Панель_Управления»
 */
function runStressTest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Панель_Управления');
  if (!sheet) {
    sheet = setupControlSheet();
  }

  // Считывание параметров с листа
  const M_raw = parseInt(sheet.getRange('J3').getValue(), 10);
  const M = (!isNaN(M_raw) && M_raw > 0) ? M_raw : 60;

  const N_raw = parseInt(sheet.getRange('J7').getValue(), 10);
  const N = (!isNaN(N_raw) && N_raw > 0) ? Math.min(999, Math.max(1, N_raw)) : 30;

  const numKeyCode = String(sheet.getRange('I10').getValue() || '');

  // 1. Генерация N синтетических телефонов
  const phones = [];
  for (let i = 0; i < N; i++) {
    phones.push(generateSyntheticPhone(i));
  }

  // 2. Хеширование и расчет частот по слотам 0..M-1
  const freqs = new Array(M).fill(0);
  for (let i = 0; i < N; i++) {
    const k = evaluateNumKey(phones[i], numKeyCode);
    const slot = knuthMultiplicativeHash(k, M);
    freqs[slot]++;
  }

  // 3. Расчет статистических метрик
  const stats = computeUniformityStatistics(freqs, N, M);
  const mean = stats.mean;
  const maxCollisions = stats.maxCollisions;
  const emptySlots = stats.emptySlots;
  const chiSquare = stats.chiSquare;

  // 4. Запись карточки сводной статистики
  sheet.getRange('I14:N14').merge().setValue('📊 РЕЗУЛЬТАТЫ СТРЕСС-ТЕСТА РАСПРЕДЕЛЕНИЯ КНУТА')
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('I15:N15').merge().setValue(
    `N = ${N} | M = ${M} | Ср. (N/M): ${mean.toFixed(2)} | Макс. коллизий: ${maxCollisions} | Пустых слотов: ${emptySlots} | χ² (Пирсон): ${chiSquare.toFixed(2)}`
  ).setBackground('#f1f5f9').setFontColor('#0f172a').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  // 5. Запись таблицы частот
  const freqHeaders = ['Слот (0..M-1)', 'Частота попаданий', 'Теоретическое E (N/M)'];
  sheet.getRange(17, 9, 1, 3).setValues([freqHeaders])
    .setBackground('#334155')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const freqRows = [];
  for (let s = 0; s < M; s++) {
    freqRows.push([s, freqs[s], parseFloat(mean.toFixed(2))]);
  }
  sheet.getRange(18, 9, M, 3).setValues(freqRows);
  sheet.getRange(18, 9, M, 3).setFontFamily('Consolas').setHorizontalAlignment('center');
  sheet.getRange(17, 9, M + 1, 3).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // 6. Очистка старых диаграмм для предотвращения наслоения
  sheet.getCharts().forEach(c => sheet.removeChart(c));

  // 7. Построение встроенной диаграммы типа COLUMN
  const dataRange = sheet.getRange(17, 9, M + 1, 2); // Слот (I) и Частота (J)
  const chart = sheet.newChart()
    .asColumnChart()
    .addRange(dataRange)
    .setPosition(17, 12, 10, 0)
    .setTitle(`Гистограмма распределения хеш-значений (N=${N}, M=${M})`)
    .setXAxisTitle('Слот хеш-таблицы (0..M-1)')
    .setYAxisTitle('Частота попаданий')
    .setOption('legend', { position: 'none' })
    .setOption('colors', ['#4f46e5'])
    .build();

  sheet.insertChart(chart);

  try {
    SpreadsheetApp.getUi().alert(
      '📈 Стресс-тест завершен!',
      `Протестировано ${N} номеров на M=${M} слотов.\n` +
      `• Средняя частота (N/M): ${mean.toFixed(2)}\n` +
      `• Макс. коллизий в бакете: ${maxCollisions}\n` +
      `• Пустых слотов: ${emptySlots}\n` +
      `• Критерий согласия χ²: ${chiSquare.toFixed(2)}\n\n` +
      `Гистограмма и таблица частот обновлены на панели управления.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}

/**
 * ==============================================================================================
 * 4. R3: ШАБЛОНИЗАЦИЯ, ГЕНЕРАЦИЯ ХЕШ-ТАБЛИЦЫ И ИНТЕРАКТИВНЫЕ ОПЕРАЦИИ
 * ==============================================================================================
 */

/**
 * Обеспечение наличия скрытого эталонного листа-шаблона «_Шаблон_Таблицы_»
 */
function ensureTemplateSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let template = ss.getSheetByName('_Шаблон_Таблицы_');
  if (!template) {
    template = ss.insertSheet('_Шаблон_Таблицы_');
  }

  const headers = [
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let controlSheet = ss.getSheetByName('Панель_Управления');
  if (!controlSheet) {
    controlSheet = setupControlSheet();
  }

  // Считывание настроек
  const M_raw = parseInt(controlSheet.getRange('J3').getValue(), 10);
  const M = (!isNaN(M_raw) && M_raw > 0) ? M_raw : 60;

  const step_raw = parseInt(controlSheet.getRange('J4').getValue(), 10);
  const step = (!isNaN(step_raw) && step_raw > 0) ? step_raw : 1;

  const fallback_raw = parseInt(controlSheet.getRange('J5').getValue(), 10);
  const fallback = (!isNaN(fallback_raw) && fallback_raw > 0) ? Math.min(M, fallback_raw) : M;

  const method = String(controlSheet.getRange('J6').getValue() || 'Открытая адресация').trim();
  const numKeyCode = String(controlSheet.getRange('I10').getValue() || '');
  const isChaining = method === 'Метод цепочек';

  // Считывание строк исходных данных (A2:G)
  const lastRow = controlSheet.getLastRow();
  let rows = [];
  if (lastRow >= 2) {
    rows = controlSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    rows = rows.filter(r => r[0] || r[2]);
  }
  if (rows.length === 0) {
    rows = DEFAULT_DATASET_30;
  }

  // Целевое имя листа
  const targetName = isChaining ? `Хеш_Таблица_Цепочки_M${M}` : `Хеш_Таблица_Линейное_M${M}`;
  const existing = ss.getSheetByName(targetName);
  if (existing) {
    ss.deleteSheet(existing);
  }

  // Клонирование эталонного шаблона
  const template = ensureTemplateSheet(ss);
  const targetSheet = template.copyTo(ss).setName(targetName).showSheet();

  if (!isChaining) {
    // Режим «Открытая адресация» (Линейное пробирование)
    const table = Array.from({ length: M }, (_, idx) => ({
      slotIndex: idx,
      status: 'EMPTY',
      phone: '',
      name: '',
      rowNum: null,
      h1: null,
      probes: 0,
      trace: []
    }));

    let totalCollisions = 0;
    let totalProbes = 0;
    let maxProbes = 0;

    rows.forEach((row, rowIdx) => {
      const phone = String(row[2] || '').trim();
      const name = String(row[0] || '').trim();
      const k = evaluateNumKey(phone, numKeyCode);
      const h1 = knuthMultiplicativeHash(k, M);

      let placed = false;
      const probeTrace = [];
      for (let i = 0; i < fallback; i++) {
        const slot = (h1 + i * step) % M;
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
        throw new Error(`Переполнение хеш-таблицы при вставке записи #${rowIdx + 1} (${phone}) за ${fallback} проб.`);
      }
    });

    // Запись данных в таблицу
    const outputRows = [];
    for (let s = 0; s < M; s++) {
      const item = table[s];
      const statusLabel = item.status === 'EMPTY' ? 'EMPTY' : (item.status === 'DELETED' ? '🪦 DELETED' : 'OCCUPIED');
      const traceStr = item.trace.length > 0 ? item.trace.join(' ➔ ') : '—';
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

    // Цветовая раскраска статусов и коллизий
    for (let s = 0; s < M; s++) {
      const r = 2 + s;
      const item = table[s];
      if (item.status === 'EMPTY') {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#f8fafc').setFontColor('#94a3b8');
      } else if (item.status === 'DELETED') {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#fee2e2').setFontColor('#991b1b');
        targetSheet.getRange(r, 2).setFontWeight('bold');
      } else {
        if (item.probes === 1) {
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
    // Режим «Метод цепочек»
    const buckets = Array.from({ length: M }, () => []);
    rows.forEach((row, rowIdx) => {
      const phone = String(row[2] || '').trim();
      const name = String(row[0] || '').trim();
      const k = evaluateNumKey(phone, numKeyCode);
      const slot = knuthMultiplicativeHash(k, M);
      buckets[slot].push({ phone, name, rowNum: rowIdx + 1, depth: buckets[slot].length + 1 });
    });

    const outputRows = [];
    for (let s = 0; s < M; s++) {
      const b = buckets[s];
      let statusLabel = b.length === 0 ? 'Пусто (0)' : (b.length === 1 ? '1 элемент' : `${b.length} эл. (КОЛЛИЗИЯ)`);
      let chainStr = b.map((item, idx) => `[#${item.rowNum}] «${item.phone}» (${item.name}) [глуб: ${idx + 1}]`).join(' ➔ ') || '—';
      outputRows.push([
        s,
        statusLabel,
        b.length > 0 ? b[0].phone : '—',
        b.length > 0 ? b[0].name : '—',
        b.length > 0 ? b[0].rowNum : '—',
        s,
        b.length,
        chainStr
      ]);
    }

    targetSheet.getRange(2, 1, M, 8).setValues(outputRows);
    targetSheet.getRange(2, 1, M, 8).setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');

    for (let s = 0; s < M; s++) {
      const r = 2 + s;
      const b = buckets[s];
      if (b.length === 0) {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#f8fafc').setFontColor('#94a3b8');
      } else if (b.length === 1) {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#ffffff').setFontColor('#0f172a');
        targetSheet.getRange(r, 2).setBackground('#dcfce7').setFontColor('#166534').setFontWeight('bold');
      } else {
        targetSheet.getRange(r, 1, 1, 8).setBackground('#fffbeb').setFontColor('#0f172a');
        targetSheet.getRange(r, 2).setBackground('#fef3c7').setFontColor('#b45309').setFontWeight('bold');
        targetSheet.getRange(r, 7).setFontWeight('bold').setFontColor('#dc2626');
      }
    }
  }

  // Границы
  targetSheet.getRange(1, 1, M + 1, 8).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // Нативный автофильтр (с удалением существующего во избежание ошибки)
  const existingFilter = targetSheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  targetSheet.getRange(1, 1, M + 1, 8).createFilter();

  // Сохранение метаданных активной таблицы
  const props = PropertiesService.getDocumentProperties();
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
      `Лист: «${targetName}»\n` +
      `Метод: ${method}\n` +
      `Размер таблицы M: ${M}\n` +
      `Шаг step: ${step} | Fallback: ${fallback}\n` +
      `Автофильтр включен на строке заголовков.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}

  return targetSheet;
}

/**
 * Интерактивное добавление записи в хеш-таблицу открытой адресации
 */
function insertRecordInteractive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  let sheetName = props.getProperty('ACTIVE_TABLE_SHEET');
  let sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();

  if (!sheet || (!sheet.getName().includes('Хеш_Таблица_Линейное_') && !sheet.getName().includes('Открытая_Адресация_'))) {
    ui.alert('⚠️ Ошибка', 'Сначала откройте или постройте лист хеш-таблицы открытой адресации.', ui.ButtonSet.OK);
    return;
  }

  const promptPhone = ui.prompt(
    '➕ Добавить запись',
    'Введите номер телефона (формат xx-xxx-xx):',
    ui.ButtonSet.OK_CANCEL
  );
  if (promptPhone.getSelectedButton() !== ui.Button.OK) return;
  const phone = promptPhone.getResponseText().trim();
  if (!phone) return;

  const promptName = ui.prompt(
    '➕ Добавить запись',
    'Введите Ф.И.О. владельца:',
    ui.ButtonSet.OK_CANCEL
  );
  if (promptName.getSelectedButton() !== ui.Button.OK) return;
  const name = promptName.getResponseText().trim() || 'Новый клиент';

  const M = parseInt(props.getProperty('ACTIVE_M') || '60', 10);
  const step = parseInt(props.getProperty('ACTIVE_STEP') || '1', 10);
  const fallback = parseInt(props.getProperty('ACTIVE_FALLBACK') || '60', 10);
  const numKeyCode = props.getProperty('ACTIVE_NUMKEY_CODE') || '';

  const startRow = sheet.getRange(1, 1).getValue().toString().includes('Слот') ? 2 : 5;
  const tableData = sheet.getRange(startRow, 1, M, 8).getValues();

  const k = evaluateNumKey(phone, numKeyCode);
  const h1 = knuthMultiplicativeHash(k, M);

  let placed = false;
  let probes = 0;
  const probeTrace = [];

  for (let i = 0; i < fallback; i++) {
    probes++;
    const slot = (h1 + i * step) % M;
    probeTrace.push(slot);

    const status = String(tableData[slot][1]);
    if (status.includes('EMPTY') || status.includes('DELETED')) {
      placed = true;
      const targetRow = startRow + slot;
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
        `Телефон: ${phone} (${name})\n` +
        `Размещено в слоте: #${slot}\n` +
        `Первичный хеш h1: ${h1}\n` +
        `Затрачено проб: ${probes}\n` +
        `Трасса: ${probeTrace.join(' ➔ ')}`,
        ui.ButtonSet.OK
      );
      break;
    }
  }

  if (!placed) {
    ui.alert(
      '⚠️ Переполнение хеш-таблицы!',
      `Не удалось вставить запись за ${fallback} проб.\n` +
      `Проверенные слоты: ${probeTrace.join(' ➔ ')}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Интерактивное удаление записи с установкой надгробия Tombstone (🪦 DELETED)
 */
function deleteRecordInteractive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  let sheetName = props.getProperty('ACTIVE_TABLE_SHEET');
  let sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();

  if (!sheet || (!sheet.getName().includes('Хеш_Таблица_Линейное_') && !sheet.getName().includes('Открытая_Адресация_'))) {
    ui.alert('⚠️ Ошибка', 'Сначала откройте или постройте лист хеш-таблицы открытой адресации.', ui.ButtonSet.OK);
    return;
  }

  const promptPhone = ui.prompt(
    '🗑️ Удалить запись',
    'Введите номер телефона для удаления (xx-xxx-xx):',
    ui.ButtonSet.OK_CANCEL
  );
  if (promptPhone.getSelectedButton() !== ui.Button.OK) return;
  const phone = promptPhone.getResponseText().trim();
  if (!phone) return;

  const M = parseInt(props.getProperty('ACTIVE_M') || '60', 10);
  const step = parseInt(props.getProperty('ACTIVE_STEP') || '1', 10);
  const numKeyCode = props.getProperty('ACTIVE_NUMKEY_CODE') || '';

  const startRow = sheet.getRange(1, 1).getValue().toString().includes('Слот') ? 2 : 5;
  const tableData = sheet.getRange(startRow, 1, M, 8).getValues();

  const k = evaluateNumKey(phone, numKeyCode);
  const h1 = knuthMultiplicativeHash(k, M);

  let foundSlot = -1;
  let probes = 0;
  const probeTrace = [];

  for (let i = 0; i < M; i++) {
    probes++;
    const slot = (h1 + i * step) % M;
    probeTrace.push(slot);

    const status = String(tableData[slot][1]);
    const cellPhone = String(tableData[slot][2]);

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
    const targetRow = startRow + foundSlot;
    sheet.getRange(targetRow, 1, 1, 8).setBackground('#fee2e2');
    sheet.getRange(targetRow, 2).setValue('🪦 DELETED').setBackground('#fee2e2').setFontColor('#991b1b').setFontWeight('bold');
    sheet.getRange(targetRow, 3).setValue(`[Удален: ${phone}]`).setFontColor('#94a3b8');
    sheet.getRange(targetRow, 4).setValue('—').setFontColor('#94a3b8');
    sheet.getRange(targetRow, 7).setValue('—').setFontColor('#94a3b8');
    sheet.getRange(targetRow, 8).setValue('🪦 Надгробие').setFontColor('#94a3b8');

    sheet.setActiveRange(sheet.getRange(targetRow, 1, 1, 8));
    ui.alert(
      '🪦 Запись удалена с надгробием (Tombstone)!',
      `Слот #${foundSlot} переведен в статус «🪦 DELETED».\n` +
      `Ключ: ${phone}\n` +
      `Проверено ячеек: ${probes}\n` +
      `Трасса: ${probeTrace.join(' ➔ ')}\n\n` +
      `Важно для защиты работы: Статус DELETED сохраняет целостность последующих поисковых цепочек.`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Запись не найдена',
      `Телефон «${phone}» отсутствует в таблице.\n` +
      `Проверено ячеек: ${probes}\n` +
      `Трасса: ${probeTrace.join(' ➔ ')}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * ==============================================================================================
 * 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И АКАДЕМИЧЕСКИЕ ВАРИАНТЫ 1-21
 * ==============================================================================================
 */

/**
 * Загрузка / восстановление эталонного датасета на лист «Датасет»
 */
function loadDataset() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Датасет');
  if (!sheet) {
    sheet = ss.insertSheet('Датасет', 0);
  } else {
    sheet.clear();
  }

  sheet.getRange(1, 1, 1, DATASET_HEADERS.length).setValues([DATASET_HEADERS]);
  sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length).setValues(DEFAULT_DATASET_30);

  const headerRange = sheet.getRange(1, 1, 1, DATASET_HEADERS.length);
  headerRange.setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle')
             .setWrap(true);
  sheet.setRowHeight(1, 40);

  const dataRange = sheet.getRange(2, 1, DEFAULT_DATASET_30.length, DATASET_HEADERS.length);
  dataRange.setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');

  for (let r = 2; r <= DEFAULT_DATASET_30.length + 1; r++) {
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
 * Считывание данных (с листа «Панель_Управления», либо «Датасет», либо загрузка эталона)
 */
function getDatasetRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let control = ss.getSheetByName('Панель_Управления');
  if (control && control.getLastRow() >= 2) {
    const vals = control.getRange(2, 1, control.getLastRow() - 1, 7).getValues();
    const filtered = vals.filter(r => r[0] || r[2]);
    if (filtered.length > 0) return filtered;
  }

  let sheet = ss.getSheetByName('Датасет');
  if (!sheet || sheet.getLastRow() < 2) {
    loadDataset();
    sheet = ss.getSheetByName('Датасет');
  }
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

/**
 * Диалог запуска Метода цепочек (M=30)
 */
function buildChainingTablePrompt() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    '🔗 Метод цепочек (M = 30)',
    'Введите номер ключевого столбца (1–7):\n' +
    '1: Ф.И.О. | 2: Дата | 3: Телефон | 4: Паспорт | 5: Адрес | 6: Счет | 7: Остаток\n' +
    '(по умолчанию 3 — Номер телефона):',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  let text = prompt.getResponseText().trim();
  let colIdx = 2; // Вариант 3 по умолчанию (Телефон)
  if (text) {
    let parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
      colIdx = parsed - 1;
    }
  }
  buildChainingTable(colIdx);
}

/**
 * Построение хеш-таблицы методом цепочек (M = 30)
 */
function buildChainingTable(colIdx) {
  colIdx = (colIdx !== undefined && colIdx >= 0 && colIdx < 7) ? colIdx : 2;
  const M = 30;
  const rows = getDatasetRows();
  const colName = DATASET_HEADERS[colIdx];

  const buckets = Array.from({ length: M }, () => []);
  let totalCollisions = 0;
  let maxChainLength = 0;

  rows.forEach((row, rowIdx) => {
    const rawVal = row[colIdx];
    const numKey = extractNumericKey(rawVal, colIdx);
    const hash = knuthMultiplicativeHash(numKey, M);

    const item = {
      rowNum: rowIdx + 1,
      rawKey: rawVal,
      fullName: row[0],
      numKey: numKey,
      hash: hash,
      depth: buckets[hash].length + 1
    };

    if (buckets[hash].length > 0) {
      totalCollisions++;
    }
    buckets[hash].push(item);
    if (buckets[hash].length > maxChainLength) {
      maxChainLength = buckets[hash].length;
    }
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Метод_Цепочек_M30');
  if (!sheet) {
    sheet = ss.insertSheet('Метод_Цепочек_M30');
  } else {
    sheet.clear();
  }

  sheet.getRange('A1:G1').merge().setValue('🔗 ХЕШ-ТАБЛИЦА: МЕТОД ЦЕПОЧЕК (SEPARATE CHAINING)')
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:G2').merge().setValue(
    `Ключ: Столбец ${colIdx + 1} (${colName}) | N = ${rows.length}, M = ${M}, α = ${(rows.length / M).toFixed(2)} | ` +
    `Коллизий: ${totalCollisions} | Макс. глубина: ${maxChainLength}`
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  const headers = ['Слот (0..29)', 'Статус', 'Хеш h(k)', 'Длина цепочки', 'Элементы цепочки (Связный список)', '', ''];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
       .setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  const outputRows = [];
  for (let s = 0; s < M; s++) {
    const b = buckets[s];
    let status = b.length === 0 ? 'Пусто (0)' : (b.length === 1 ? '1 элемент' : `${b.length} эл. (КОЛЛИЗИЯ)`);
    let chainStr = b.map((item, idx) => `[#${item.rowNum}] «${item.rawKey}» (${item.fullName}) [глуб: ${idx + 1}]`).join(' ➔ ') || '—';
    outputRows.push([s, status, s, b.length, chainStr, '', '']);
  }

  sheet.getRange(5, 1, M, headers.length).setValues(outputRows);
  sheet.getRange(5, 1, M, headers.length).setFontFamily('Consolas').setFontSize(10).setVerticalAlignment('middle');
  sheet.getRange(4, 1, M + 1, headers.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  for (let s = 0; s < M; s++) {
    const r = 5 + s;
    const b = buckets[s];
    if (b.length === 0) {
      sheet.getRange(r, 1, 1, headers.length).setBackground('#f8fafc').setFontColor('#94a3b8');
    } else if (b.length === 1) {
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
    '(по умолчанию Вариант 3 — Номер телефона):',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  let text = prompt.getResponseText().trim();
  let variant = 3;
  if (text) {
    let parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 21) {
      variant = parsed;
    }
  }
  buildOpenAddressingTable(variant);
}

/**
 * Построение хеш-таблицы методом открытой адресации (M = 60) для 21 варианта
 */
function buildOpenAddressingTable(variant) {
  variant = (variant !== undefined && variant >= 1 && variant <= 21) ? variant : 3;
  const M = 60;
  const rows = getDatasetRows();

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
        if (probes > 1) totalInsertCollisions++;
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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Открытая_Адресация_M60');
  if (!sheet) {
    sheet = ss.insertSheet('Открытая_Адресация_M60');
  } else {
    sheet.clear();
  }

  sheet.getRange('A1:H1').merge().setValue(`🎯 ХЕШ-ТАБЛИЦА: ОТКРЫТАЯ АДРЕСАЦИЯ — ВАРИАНТ ${variant}`)
       .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

  sheet.getRange('A2:H2').merge().setValue(
    `Метод: ${methodName} | Ключ: Столбец ${colIdx + 1} (${colName}) | ` +
    `N = ${rows.length}, M = ${M}, α = ${loadFactor} | Коллизий: ${totalInsertCollisions} | Макс. проб: ${maxProbes} | Ср. число проб (Sn): ${avgProbes}`
  ).setBackground('#f1f5f9').setFontColor('#334155').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  PropertiesService.getDocumentProperties().setProperty('ACTIVE_VARIANT', String(variant));
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_COL_IDX', String(colIdx));
  PropertiesService.getDocumentProperties().setProperty('ACTIVE_METHOD', methodType);

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

/**
 * Интерактивный поиск по ключу в таблице открытой адресации
 */
function searchKeyInteractive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Открытая_Адресация_M60') || ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  const savedVariant = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_VARIANT') || '3', 10);
  const savedColIdx = parseInt(PropertiesService.getDocumentProperties().getProperty('ACTIVE_COL_IDX') || '2', 10);
  const savedMethod = PropertiesService.getDocumentProperties().getProperty('ACTIVE_METHOD') || 'linear';
  const colName = DATASET_HEADERS[savedColIdx];

  const prompt = ui.prompt(
    '🔍 Поиск ключа в хеш-таблице',
    `Введите искомое значение ключа [Столбец ${savedColIdx + 1}: ${colName}]:`,
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const searchVal = prompt.getResponseText().trim();
  if (!searchVal) return;

  const M = 60;
  const numKey = extractNumericKey(searchVal, savedColIdx);
  const h1 = knuthMultiplicativeHash(numKey, M);
  const h2 = getDoubleHashStep(numKey);

  const startRow = sheet.getRange(1, 1).getValue().toString().includes('Слот') ? 2 : 5;
  const tableData = sheet.getRange(startRow, 1, M, 4).getValues();

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

  if (found) {
    sheet.setActiveRange(sheet.getRange(startRow + foundSlot, 1, 1, 8));
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
 * Удаление ключа с установкой надгробия для листа Открытая_Адресация_M60
 */
function deleteKeyInteractive() {
  deleteRecordInteractive();
}

/**
 * Построение сводной таблицы оценки качества (все 21 вариант vs Кнут)
 */
function buildEvaluationReport() {
  const rows = getDatasetRows();
  const N = rows.length;
  const M_open = 60;
  const alpha_open = N / M_open;

  const evalRows = [];

  for (let v = 1; v <= 21; v++) {
    let colIdx, methodType, methodName, knuthTheor;
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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Оценка_Качества');
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

  const headers = [
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

  for (let r = 0; r < evalRows.length; r++) {
    const colCount = evalRows[r][3];
    const cell = sheet.getRange(5 + r, 4);
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
 * Очистка всех сгенерированных рабочих листов
 * Защищает от удаления: «Панель_Управления», «Датасет», «_Шаблон_Таблицы_»
 */
function clearGeneratedSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToKeep = ['Панель_Управления', 'Датасет', '_Шаблон_Таблицы_'];
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

  try {
    SpreadsheetApp.getUi().alert('🧹 Очистка завершена', `Удалено сгенерированных листов: ${removed}`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

// Псевдоним для генератора записей
function generateDatasetRows() {
  generateSyntheticRows();
}

/**
 * ==============================================================================================
 * 6. ЭКСПОРТ ДЛЯ ТЕСТОВОГО СТЕНДА NODE.JS
 * ==============================================================================================
 */
if (typeof global !== 'undefined') {
  global.KNUTH_A = KNUTH_A;
  global.knuthMultiplicativeHash = knuthMultiplicativeHash;
  global.evaluateNumKey = evaluateNumKey;
  global.generateSyntheticPhone = generateSyntheticPhone;
  global.computeUniformityStatistics = computeUniformityStatistics;
  global.setupControlSheet = setupControlSheet;
  global.runStressTest = runStressTest;
  global.buildHashTableFromTemplate = buildHashTableFromTemplate;
  global.insertRecordInteractive = insertRecordInteractive;
  global.deleteRecordInteractive = deleteRecordInteractive;
  global.generateSyntheticRows = generateSyntheticRows;
  global.generateDatasetRows = generateSyntheticRows;
  global.ensureTemplateSheet = ensureTemplateSheet;
}
