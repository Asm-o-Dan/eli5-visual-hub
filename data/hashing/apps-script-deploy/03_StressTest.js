/**
 * ==============================================================================================
 * 03_StressTest.js - СТРЕСС-ТЕСТ И ВСТРОЕННАЯ ГИСТОГРАММА РАСПРЕДЕЛЕНИЯ
 * ==============================================================================================
 */

/**
 * Запуск стресс-теста хеш-функции со встроенной диаграммой на листе «Панель_Управления»
 */
function runStressTest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Панель_Управления');
  if (!sheet) {
    sheet = setupControlSheet();
  }

  var M_raw = parseInt(sheet.getRange('J3').getValue(), 10);
  var M = (!isNaN(M_raw) && M_raw > 0) ? M_raw : 60;

  var N_raw = parseInt(sheet.getRange('J7').getValue(), 10);
  var N = (!isNaN(N_raw) && N_raw > 0) ? Math.min(999, Math.max(1, N_raw)) : 30;

  var numKeyCode = String(sheet.getRange('I10').getValue() || '');

  // 1. Генерация N синтетических телефонов
  var phones = [];
  for (var i = 0; i < N; i++) {
    phones.push(generateSyntheticPhone(i));
  }

  // 2. Хеширование и сбор частот по слотам
  var freqs = new Array(M).fill(0);
  for (var j = 0; j < N; j++) {
    var k = evaluateNumKey(phones[j], numKeyCode);
    var slot = knuthMultiplicativeHash(k, M);
    freqs[slot]++;
  }

  // 3. Статистические метрики
  var stats = computeUniformityStatistics(freqs, N, M);
  var mean = stats.mean;
  var maxCollisions = stats.maxCollisions;
  var emptySlots = stats.emptySlots;
  var chiSquare = stats.chiSquare;

  // 4. Сводная карточка
  sheet.getRange('I14:N14').merge().setValue('📊 РЕЗУЛЬТАТЫ СТРЕСС-ТЕСТА РАСПРЕДЕЛЕНИЯ КНУТА')
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('I15:N15').merge().setValue(
    'N = ' + N + ' | M = ' + M + ' | Ср. (N/M): ' + mean.toFixed(2) + ' | Макс. коллизий: ' + maxCollisions + ' | Пустых слотов: ' + emptySlots + ' | χ² (Пирсон): ' + chiSquare.toFixed(2)
  ).setBackground('#f1f5f9').setFontColor('#0f172a').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  // 5. Таблица частот
  var freqHeaders = ['Слот (0..M-1)', 'Частота попаданий', 'Теоретическое E (N/M)'];
  sheet.getRange(17, 9, 1, 3).setValues([freqHeaders])
    .setBackground('#334155')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  var freqRows = [];
  for (var s = 0; s < M; s++) {
    freqRows.push([s, freqs[s], parseFloat(mean.toFixed(2))]);
  }
  sheet.getRange(18, 9, M, 3).setValues(freqRows);
  sheet.getRange(18, 9, M, 3).setFontFamily('Consolas').setHorizontalAlignment('center');
  sheet.getRange(17, 9, M + 1, 3).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // 6. Очистка старых графиков
  sheet.getCharts().forEach(function(c) {
    sheet.removeChart(c);
  });

  // 7. Построение EmbeddedChart типа COLUMN
  var dataRange = sheet.getRange(17, 9, M + 1, 2);
  var chart = sheet.newChart()
    .asColumnChart()
    .addRange(dataRange)
    .setPosition(17, 12, 10, 0)
    .setTitle('Гистограмма распределения хеш-значений (N=' + N + ', M=' + M + ')')
    .setXAxisTitle('Слот хеш-таблицы (0..M-1)')
    .setYAxisTitle('Частота попаданий')
    .setOption('legend', { position: 'none' })
    .setOption('colors', ['#4f46e5'])
    .build();

  sheet.insertChart(chart);

  try {
    SpreadsheetApp.getUi().alert(
      '📈 Стресс-тест завершен!',
      'Протестировано ' + N + ' номеров на M=' + M + ' слотов.\n' +
      '• Средняя частота (N/M): ' + mean.toFixed(2) + '\n' +
      '• Макс. коллизий в бакете: ' + maxCollisions + '\n' +
      '• Пустых слотов: ' + emptySlots + '\n' +
      '• Критерий согласия χ²: ' + chiSquare.toFixed(2) + '\n\n' +
      'Гистограмма и таблица частот обновлены на панели управления.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}
