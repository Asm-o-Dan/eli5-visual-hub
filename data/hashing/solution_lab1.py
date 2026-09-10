"""
Лабораторная работа №1: Хеширование данных (АОД / ПИ)
Методы: Метод цепочек (M=30) и Открытая адресация (M=60)
Хеш-функция: Мультипликативный метод Кнута (A = (sqrt(5)-1)/2)
"""

import math
import csv

A_CONST = (math.sqrt(5) - 1) / 2 # ~0.6180339887
COPRIMES_60 = [1, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59]

EMPTY, OCCUPIED, DELETED = 0, 1, 2

def key_to_int(r, col):
    val = r[col].strip()
    if col == 0: # ФИО
        h = 0
        for ch in val: h = (h * 31 + ord(ch)) % (2**31 - 1)
        return h
    elif col == 1: # Дата дд.мм.гггг
        d, m, y = map(int, val.split('.'))
        return y * 10000 + m * 100 + d
    elif col == 2: # Телефон
        return int(''.join(c for c in val if c.isdigit()))
    elif col == 3: # Паспорт
        h = 0
        for ch in val:
            if ch.isdigit(): h = (h * 10 + int(ch)) % (2**31 - 1)
            else: h = (h * 31 + ord(ch)) % (2**31 - 1)
        return h
    elif col == 4: # Адрес
        h = 0
        for ch in val: h = (h * 37 + ord(ch)) % (2**31 - 1)
        return h
    elif col == 5: # Номер счета
        return int(''.join(c for c in val if c.isdigit())) % (2**31 - 1)
    elif col == 6: # Остаток денег
        return int(round(float(val.replace(',', '.')) * 100)) % (2**31 - 1)
    return 0

def mult_hash(k, M):
    val = (k * A_CONST) % 1.0
    return int(math.floor(M * val))

class ChainingHashTable:
    def __init__(self, M=30):
        self.M = M
        self.table = [[] for _ in range(M)]

    def insert(self, key, record):
        idx = mult_hash(key, self.M)
        probes = len(self.table[idx]) + 1
        self.table[idx].append((key, record))
        return probes

    def search(self, key):
        idx = mult_hash(key, self.M)
        for i, (k, rec) in enumerate(self.table[idx]):
            if k == key:
                return rec, i + 1
        return None, len(self.table[idx])

    def delete(self, key):
        idx = mult_hash(key, self.M)
        for i, (k, rec) in enumerate(self.table[idx]):
            if k == key:
                del self.table[idx][i]
                return True
        return False

class OpenAddressingHashTable:
    def __init__(self, probe_type='linear', M=60):
        self.M = M
        self.probe_type = probe_type
        self.table = [None] * M
        self.states = [EMPTY] * M

    def insert(self, key, record):
        h0 = mult_hash(key, self.M)
        h2 = COPRIMES_60[key % 16]
        for i in range(self.M):
            if self.probe_type == 'linear': idx = (h0 + i) % self.M
            elif self.probe_type == 'quadratic': idx = (h0 + i + i*i) % self.M
            else: idx = (h0 + i * h2) % self.M # Double

            if self.states[idx] in (EMPTY, DELETED):
                self.table[idx] = (key, record)
                self.states[idx] = OCCUPIED
                return i + 1
        raise Exception("Table overflow")

    def search(self, key):
        h0 = mult_hash(key, self.M)
        h2 = COPRIMES_60[key % 16]
        for i in range(self.M):
            if self.probe_type == 'linear': idx = (h0 + i) % self.M
            elif self.probe_type == 'quadratic': idx = (h0 + i + i*i) % self.M
            else: idx = (h0 + i * h2) % self.M

            if self.states[idx] == EMPTY:
                return None, i + 1
            if self.states[idx] == OCCUPIED and self.table[idx][0] == key:
                return self.table[idx][1], i + 1
        return None, self.M

    def delete(self, key):
        h0 = mult_hash(key, self.M)
        h2 = COPRIMES_60[key % 16]
        for i in range(self.M):
            if self.probe_type == 'linear': idx = (h0 + i) % self.M
            elif self.probe_type == 'quadratic': idx = (h0 + i + i*i) % self.M
            else: idx = (h0 + i * h2) % self.M

            if self.states[idx] == EMPTY:
                return False
            if self.states[idx] == OCCUPIED and self.table[idx][0] == key:
                self.states[idx] = DELETED
                return True
        return False
