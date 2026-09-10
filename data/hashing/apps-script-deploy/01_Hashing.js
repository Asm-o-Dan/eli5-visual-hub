/**
 * ==============================================================================================
 * 01_Hashing.js - МАТЕМАТИЧЕСКИЙ ДВИЖОК ХЕШИРОВАНИЯ И ДИНАМИЧЕСКИЙ numKey
 * ==============================================================================================
 */

/**
 * Мультипликативный метод Кнута
 * h(k) = floor(M * ((k * A) mod 1))
 * Защита от IEEE-754 переполнения: строго в диапазоне [0, M-1]
 */
function knuthMultiplicativeHash(numKey, M) {
  var k = Number(numKey) || 0;
  var m = Number(M) || 60;
  var frac = (k * KNUTH_A) % 1;
  var posFrac = frac < 0 ? frac + 1 : frac;
  var slot = Math.floor(m * posFrac);
  if (slot >= m) return m - 1;
  if (slot < 0) return 0;
  return slot;
}

/**
 * Динамическое исполнение кода numKey из ячейки через new Function()
 * Поддерживает:
 * - Стрелочные функции: val => parseInt(String(val).replace(/\D/g, ''), 10)
 * - Обычные функции: function(val) { ... }
 * - Выражения без обертки
 * При синтаксических или runtime ошибках безопасно возвращает цифры ключа (или 0).
 */
function evaluateNumKey(val, codeStr) {
  var defaultFn = function(v) {
    var digits = String(v || '').replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  if (!codeStr || typeof codeStr !== 'string' || !codeStr.trim()) {
    return defaultFn(val);
  }

  var raw = codeStr.trim();
  try {
    var fn;
    if (raw.startsWith('function') || raw.startsWith('(') || raw.includes('=>')) {
      fn = new Function('return (' + raw + ');')();
    } else {
      fn = new Function('val', raw.includes('return') ? raw : 'return (' + raw + ');');
    }
    var res = fn(val);
    var num = Number(res);
    return isNaN(num) ? 0 : Math.floor(Math.abs(num));
  } catch (err) {
    return defaultFn(val);
  }
}

/**
 * Генератор синтетического телефонного номера xx-xxx-xx
 */
function generateSyntheticPhone(index) {
  var p1 = String((index * 17 + 10) % 90 + 10).padStart(2, '0');
  var p2 = String((index * 31 + 100) % 900 + 100).padStart(3, '0');
  var p3 = String((index * 47 + 10) % 90 + 10).padStart(2, '0');
  return p1 + '-' + p2 + '-' + p3;
}

/**
 * Расчет статистических показателей равномерности распределения
 */
function computeUniformityStatistics(frequencies, N, M) {
  var mean = N / M;
  var maxCollisions = 0;
  var emptySlots = 0;
  var chiSquare = 0;

  for (var s = 0; s < M; s++) {
    var obs = frequencies[s] || 0;
    if (obs > maxCollisions) maxCollisions = obs;
    if (obs === 0) emptySlots++;
    var diff = obs - mean;
    chiSquare += (diff * diff) / mean;
  }

  return { mean: mean, maxCollisions: maxCollisions, emptySlots: emptySlots, chiSquare: chiSquare };
}

/**
 * Вторичный шаг для двойного хеширования (для 21 варианта)
 */
function getDoubleHashStep(numKey) {
  var idx = Math.abs(numKey) % COPRIMES_60.length;
  return COPRIMES_60[idx];
}

/**
 * Извлечение числового ключа для любого из 7 полей таблицы методички
 */
function extractNumericKey(val, colIdx) {
  if (val === null || val === undefined) return 0;

  if (colIdx === 6) {
    var num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(num)) return 0;
    return Math.floor(Math.abs(num) * 100);
  }

  if (colIdx === 5) {
    var s = String(val).replace(/\D/g, '');
    if (!s) return 0;
    var acc = 0;
    for (var i = 0; i < s.length; i += 6) {
      acc = (acc * 37 + parseInt(s.substr(i, 6), 10)) % 2147483647;
    }
    return acc;
  }

  if (colIdx === 1) {
    if (val instanceof Date) {
      return val.getFullYear() * 10000 + (val.getMonth() + 1) * 100 + val.getDate();
    }
    var strDate = String(val).trim();
    var m = strDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      return parseInt(m[3], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[1], 10);
    }
  }

  if (colIdx === 2 || colIdx === 3) {
    var digits = String(val).replace(/\D/g, '');
    if (digits.length > 0) {
      return parseInt(digits.slice(-9), 10);
    }
  }

  var str = String(val).trim();
  var h = 0;
  for (var j = 0; j < str.length; j++) {
    h = (h * 31 + str.charCodeAt(j)) >>> 0;
  }
  return h;
}
