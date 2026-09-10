/*
  Лабораторная работа №1: Хеширование данных (АОД / ПИ)
  Методы: Метод цепочек (M=30) и Открытая адресация (M=60)
  Хеш-функция: Мультипликативный метод Кнута (A = (sqrt(5)-1)/2)
  Состояния ячеек: EMPTY, OCCUPIED, DELETED (Tombstone)
*/

#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <cmath>
#include <iomanip>
#include <numeric>

using namespace std;

const double A_CONST = (sqrt(5.0) - 1.0) / 2.0; // ~0.6180339887
const int COPRIMES_60[16] = {1, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59};

struct Record {
    string fio;
    string birth_date;
    string phone;
    string passport;
    string address;
    string account;
    double balance;
};

// Функция преобразования значения выбранного столбца в 64-битный целочисленный ключ
uint64_t keyToInt(const Record& r, int col) {
    if (col == 0) { // ФИО (полиномиальный хеш)
        uint64_t h = 0;
        for (char c : r.fio) h = (h * 31 + (unsigned char)c) & 0x7FFFFFFF;
        return h;
    } else if (col == 1) { // Дата рождения (дд.мм.гггг -> ггггммдд)
        int d, m, y;
        char dot;
        stringstream ss(r.birth_date);
        ss >> d >> dot >> m >> dot >> y;
        return (uint64_t)y * 10000 + m * 100 + d;
    } else if (col == 2) { // Телефон (только цифры)
        uint64_t num = 0;
        for (char c : r.phone) if (isdigit(c)) num = num * 10 + (c - '0');
        return num;
    } else if (col == 3) { // Паспорт
        uint64_t h = 0;
        for (char c : r.passport) {
            if (isdigit(c)) h = (h * 10 + (c - '0')) & 0x7FFFFFFF;
            else h = (h * 31 + (unsigned char)c) & 0x7FFFFFFF;
        }
        return h;
    } else if (col == 4) { // Адрес
        uint64_t h = 0;
        for (char c : r.address) h = (h * 37 + (unsigned char)c) & 0x7FFFFFFF;
        return h;
    } else if (col == 5) { // Номер счета
        uint64_t h = 0;
        for (char c : r.account) if (isdigit(c)) h = (h * 10 + (c - '0')) & 0x7FFFFFFF;
        return h;
    } else if (col == 6) { // Остаток (копейки)
        return (uint64_t)round(r.balance * 100.0);
    }
    return 0;
}

// Мультипликативная хеш-функция Кнута
int multHash(uint64_t k, int M) {
    double val = (double)k * A_CONST;
    double frac = val - floor(val);
    return (int)floor(M * frac);
}

// --- ЧАСТЬ 1: МЕТОД ЦЕПОЧЕК (M = 30) ---
struct ChainNode {
    uint64_t key;
    Record data;
    ChainNode* next;
    ChainNode(uint64_t k, const Record& d) : key(k), data(d), next(nullptr) {}
};

class ChainingHashTable {
    int M;
    vector<ChainNode*> table;
public:
    ChainingHashTable(int m = 30) : M(m), table(m, nullptr) {}
    ~ChainingHashTable() {
        for (int i = 0; i < M; i++) {
            ChainNode* cur = table[i];
            while (cur) {
                ChainNode* tmp = cur;
                cur = cur->next;
                delete tmp;
            }
        }
    }

    int insert(uint64_t key, const Record& rec) {
        int idx = multHash(key, M);
        int probes = 1;
        if (!table[idx]) {
            table[idx] = new ChainNode(key, rec);
            return probes;
        }
        ChainNode* cur = table[idx];
        while (cur->next) {
            cur = cur->next;
            probes++;
        }
        cur->next = new ChainNode(key, rec);
        return probes + 1;
    }

    bool search(uint64_t key, Record& found, int& probes) {
        int idx = multHash(key, M);
        probes = 0;
        ChainNode* cur = table[idx];
        while (cur) {
            probes++;
            if (cur->key == key) {
                found = cur->data;
                return true;
            }
            cur = cur->next;
        }
        return false;
    }

    bool remove(uint64_t key) {
        int idx = multHash(key, M);
        ChainNode* cur = table[idx];
        ChainNode* prev = nullptr;
        while (cur) {
            if (cur->key == key) {
                if (prev) prev->next = cur->next;
                else table[idx] = cur->next;
                delete cur;
                return true;
            }
            prev = cur;
            cur = cur->next;
        }
        return false;
    }

    void print() {
        cout << "\n=== ХЕШ-ТАБЛИЦА: МЕТОД ЦЕПОЧЕК (M = " << M << ") ===" << endl;
        for (int i = 0; i < M; i++) {
            cout << "[" << setw(2) << i << "]: ";
            ChainNode* cur = table[i];
            if (!cur) {
                cout << "<ПУСТО>" << endl;
            } else {
                while (cur) {
                    cout << "-> (Ключ:" << cur->key << " | " << cur->data.fio << ") ";
                    cur = cur->next;
                }
                cout << endl;
            }
        }
    }
};

// --- ЧАСТЬ 2: ОТКРЫТАЯ АДРЕСАЦИЯ (M = 60) ---
enum CellStatus { EMPTY = 0, OCCUPIED = 1, DELETED = 2 };

struct OpenCell {
    uint64_t key;
    Record data;
    CellStatus status = EMPTY;
};

class OpenAddressingHashTable {
    int M;
    string probeType; // "linear", "quadratic", "double"
    vector<OpenCell> table;
public:
    OpenAddressingHashTable(string pType, int m = 60) : probeType(pType), M(m), table(m) {}

    int insert(uint64_t key, const Record& rec) {
        int h0 = multHash(key, M);
        int h2 = COPRIMES_60[key % 16]; // Шаг, взаимно простой с 60

        for (int i = 0; i < M; i++) {
            int idx;
            if (probeType == "linear") idx = (h0 + i) % M;
            else if (probeType == "quadratic") idx = (h0 + i + i * i) % M;
            else idx = (h0 + i * h2) % M; // Double hashing

            if (table[idx].status == EMPTY || table[idx].status == DELETED) {
                table[idx].key = key;
                table[idx].data = rec;
                table[idx].status = OCCUPIED;
                return i + 1; // Количество попыток
            }
        }
        return -1; // Переполнение
    }

    bool search(uint64_t key, Record& found, int& probes) {
        int h0 = multHash(key, M);
        int h2 = COPRIMES_60[key % 16];
        probes = 0;

        for (int i = 0; i < M; i++) {
            probes++;
            int idx;
            if (probeType == "linear") idx = (h0 + i) % M;
            else if (probeType == "quadratic") idx = (h0 + i + i * i) % M;
            else idx = (h0 + i * h2) % M;

            if (table[idx].status == EMPTY) return false; // Цепочка оборвалась
            if (table[idx].status == OCCUPIED && table[idx].key == key) {
                found = table[idx].data;
                return true;
            }
            // Если DELETED - продолжаем поиск
        }
        return false;
    }

    bool remove(uint64_t key) {
        int h0 = multHash(key, M);
        int h2 = COPRIMES_60[key % 16];

        for (int i = 0; i < M; i++) {
            int idx;
            if (probeType == "linear") idx = (h0 + i) % M;
            else if (probeType == "quadratic") idx = (h0 + i + i * i) % M;
            else idx = (h0 + i * h2) % M;

            if (table[idx].status == EMPTY) return false;
            if (table[idx].status == OCCUPIED && table[idx].key == key) {
                table[idx].status = DELETED; // Маркируем как удалено
                return true;
            }
        }
        return false;
    }

    void print() {
        cout << "\n=== ХЕШ-ТАБЛИЦА: ОТКРЫТАЯ АДРЕСАЦИЯ (" << probeType << ", M = " << M << ") ===" << endl;
        for (int i = 0; i < M; i++) {
            cout << "[" << setw(2) << i << "] ";
            if (table[i].status == EMPTY) cout << "[EMPTY]" << endl;
            else if (table[i].status == DELETED) cout << "[DELETED / TOMBSTONE]" << endl;
            else {
                cout << "[OCCUPIED] Ключ: " << table[i].key << " | " << table[i].data.fio
                     << " | Тел: " << table[i].data.phone << " | Баланс: " << table[i].data.balance << endl;
            }
        }
    }
};

int main() {
    ifstream file("data_30_records.csv");
    if (!file.is_open()) {
        cerr << "Ошибка: не удалось открыть файл data_30_records.csv" << endl;
        return 1;
    }

    string line;
    getline(file, line); // Заголовок CSV
    vector<Record> records;
    while (getline(file, line)) {
        if (line.empty()) continue;
        stringstream ss(line);
        Record r;
        string bal_str;
        getline(ss, r.fio, ';');
        getline(ss, r.birth_date, ';');
        getline(ss, r.phone, ';');
        getline(ss, r.passport, ';');
        getline(ss, r.address, ';');
        getline(ss, r.account, ';');
        getline(ss, bal_str, ';');
        r.balance = stod(bal_str);
        records.push_back(r);
    }

    cout << "Успешно загружено " << records.size() << " записей из CSV." << endl;

    int colChoice = 0; // 0 = ФИО (столбец I)
    cout << "\nХеширование по столбцу: " << colChoice + 1 << endl;

    // Метод цепочек
    ChainingHashTable chainTable(30);
    int totalChainProbes = 0;
    cout << "\nВставка в метод цепочек:" << endl;
    for (size_t i = 0; i < records.size(); i++) {
        uint64_t k = keyToInt(records[i], colChoice);
        int p = chainTable.insert(k, records[i]);
        totalChainProbes += p;
        cout << "Запись " << setw(2) << i + 1 << ": попыток = " << p << endl;
    }
    cout << "ИТОГО попыток (цепочки): " << totalChainProbes << endl;
    chainTable.print();

    // Открытая адресация (линейное опробование)
    OpenAddressingHashTable openTable("linear", 60);
    int totalOpenProbes = 0;
    cout << "\nВставка в открытую адресацию (линейное):" << endl;
    for (size_t i = 0; i < records.size(); i++) {
        uint64_t k = keyToInt(records[i], colChoice);
        int p = openTable.insert(k, records[i]);
        totalOpenProbes += p;
        cout << "Запись " << setw(2) << i + 1 << ": попыток = " << p << endl;
    }
    cout << "ИТОГО попыток (открытая адресация): " << totalOpenProbes << endl;
    openTable.print();

    // Демонстрация поиска и удаления
    uint64_t testKey = keyToInt(records[5], colChoice);
    cout << "\n--- ТЕСТ: Поиск записи '" << records[5].fio << "' ---" << endl;
    Record found;
    int searchProbes = 0;
    if (openTable.search(testKey, found, searchProbes)) {
        cout << "Найдено за " << searchProbes << " попыток: " << found.fio << " (" << found.address << ")" << endl;
    }

    cout << "\n--- ТЕСТ: Удаление записи '" << records[5].fio << "' ---" << endl;
    if (openTable.remove(testKey)) {
        cout << "Запись успешно удалена (ячейка помечена DELETED)." << endl;
    }

    cout << "\n--- ТЕСТ: Повторный поиск удаленной записи ---" << endl;
    if (!openTable.search(testKey, found, searchProbes)) {
        cout << "Запись корректно НЕ найдена (проверено " << searchProbes << " ячеек до конца цепочки)." << endl;
    }

    return 0;
}
