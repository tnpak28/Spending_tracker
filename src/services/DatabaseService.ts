import * as SQLite from 'expo-sqlite';
import { Expense, BankAccount, RecurringPattern } from '../types';

class Database {
  private db: SQLite.WebSQLDatabase;

  constructor() {
    this.db = SQLite.openDatabase('spendingTracker.db');
  }

  // Initialize database with tables
  initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          // Create expenses table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS expenses (
              id TEXT PRIMARY KEY,
              amount REAL NOT NULL,
              title TEXT NOT NULL,
              category TEXT,
              date TEXT NOT NULL,
              notes TEXT,
              isRecurring INTEGER DEFAULT 0,
              source TEXT DEFAULT 'manual',
              bankAccountId TEXT,
              bankTransactionId TEXT,
              createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Create bank accounts table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
              id TEXT PRIMARY KEY,
              bankName TEXT NOT NULL,
              accountName TEXT NOT NULL,
              accountNumber TEXT,
              accountType TEXT,
              balance REAL,
              currency TEXT DEFAULT 'HKD',
              lastSyncDate TEXT,
              accessToken TEXT,
              isActive INTEGER DEFAULT 1,
              createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Create recurring patterns table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS recurring_patterns (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              category TEXT,
              averageAmount REAL,
              frequency TEXT,
              confidence REAL,
              lastOccurrence TEXT,
              nextPredicted TEXT,
              isActive INTEGER DEFAULT 1,
              createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Create categories table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              icon TEXT,
              color TEXT,
              isDefault INTEGER DEFAULT 0
            );
          `);

          // Insert default categories
          const defaultCategories = [
            { id: '1', name: 'Food & Dining', icon: 'restaurant', color: '#FF9800', isDefault: 1 },
            { id: '2', name: 'Transportation', icon: 'directions-car', color: '#2196F3', isDefault: 1 },
            { id: '3', name: 'Shopping', icon: 'shopping-bag', color: '#E91E63', isDefault: 1 },
            { id: '4', name: 'Entertainment', icon: 'movie', color: '#9C27B0', isDefault: 1 },
            { id: '5', name: 'Bills & Utilities', icon: 'receipt', color: '#4CAF50', isDefault: 1 },
            { id: '6', name: 'Health & Fitness', icon: 'fitness-center', color: '#F44336', isDefault: 1 },
            { id: '7', name: 'Travel', icon: 'flight', color: '#00BCD4', isDefault: 1 },
            { id: '8', name: 'Education', icon: 'school', color: '#FFC107', isDefault: 1 },
            { id: '9', name: 'Other', icon: 'more-horiz', color: '#9E9E9E', isDefault: 1 },
          ];

          defaultCategories.forEach(category => {
            tx.executeSql(
              'INSERT OR IGNORE INTO categories (id, name, icon, color, isDefault) VALUES (?, ?, ?, ?, ?)',
              [category.id, category.name, category.icon, category.color, category.isDefault]
            );
          });
        },
        (error) => {
          console.error('Database initialization error:', error);
          reject(error);
        },
        () => {
          console.log('Database initialized successfully');
          resolve();
        }
      );
    });
  }

  // Expense operations
  addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36);
      
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT INTO expenses (id, amount, title, category, date, notes, isRecurring, source, bankAccountId, bankTransactionId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              expense.amount,
              expense.title,
              expense.category || null,
              expense.date,
              expense.notes || null,
              expense.isRecurring ? 1 : 0,
              expense.source || 'manual',
              expense.bankAccountId || null,
              expense.bankTransactionId || null,
            ],
            (_, result) => resolve(id),
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  getExpenses(limit?: number, offset?: number): Promise<Expense[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM expenses 
        ORDER BY date DESC, createdAt DESC
        ${limit ? `LIMIT ${limit}` : ''}
        ${offset ? `OFFSET ${offset}` : ''}
      `;

      this.db.transaction(
        (tx) => {
          tx.executeSql(
            query,
            [],
            (_, { rows: { _array } }) => {
              const expenses = _array.map(row => ({
                ...row,
                isRecurring: Boolean(row.isRecurring),
              }));
              resolve(expenses);
            },
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt');
      const values = fields.map(field => {
        if (field === 'isRecurring') {
          return updates[field] ? 1 : 0;
        }
        return updates[field as keyof Expense];
      });
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `UPDATE expenses SET ${setClause} WHERE id = ?`,
            [...values, id],
            () => resolve(),
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  deleteExpense(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'DELETE FROM expenses WHERE id = ?',
            [id],
            () => resolve(),
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  // Bank account operations
  addBankAccount(account: Omit<BankAccount, 'id' | 'createdAt'>): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36);
      
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT INTO bank_accounts (id, bankName, accountName, accountNumber, accountType, balance, currency, lastSyncDate, accessToken, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              account.bankName,
              account.accountName,
              account.accountNumber || null,
              account.accountType,
              account.balance || 0,
              account.currency || 'HKD',
              account.lastSyncDate || null,
              account.accessToken || null,
              account.isActive ? 1 : 0,
            ],
            (_, result) => resolve(id),
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  getBankAccounts(): Promise<BankAccount[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM bank_accounts WHERE isActive = 1 ORDER BY createdAt DESC',
            [],
            (_, { rows: { _array } }) => {
              const accounts = _array.map(row => ({
                ...row,
                isActive: Boolean(row.isActive),
              }));
              resolve(accounts);
            },
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  // Analytics queries
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC',
            [startDate, endDate],
            (_, { rows: { _array } }) => {
              const expenses = _array.map(row => ({
                ...row,
                isRecurring: Boolean(row.isRecurring),
              }));
              resolve(expenses);
            },
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  getExpensesByCategory(category: string): Promise<Expense[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM expenses WHERE category = ? ORDER BY date DESC',
            [category],
            (_, { rows: { _array } }) => {
              const expenses = _array.map(row => ({
                ...row,
                isRecurring: Boolean(row.isRecurring),
              }));
              resolve(expenses);
            },
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  getCategoryTotals(startDate?: string, endDate?: string): Promise<{ category: string; total: number }[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT category, SUM(amount) as total FROM expenses';
      const params: string[] = [];

      if (startDate && endDate) {
        query += ' WHERE date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      query += ' GROUP BY category ORDER BY total DESC';

      this.db.transaction(
        (tx) => {
          tx.executeSql(
            query,
            params,
            (_, { rows: { _array } }) => resolve(_array),
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  // Categories
  getCategories(): Promise<{ id: string; name: string; icon: string; color: string }[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM categories ORDER BY isDefault DESC, name ASC',
            [],
            (_, { rows: { _array } }) => resolve(_array),
            (_, error) => {
              reject(error);
              return true;
            }
          );
        }
      );
    });
  }

  // CSV Import/Export
  async exportExpensesToCSV(): Promise<string> {
    try {
      const expenses = await this.getExpenses();
      
      // CSV Header
      let csv = 'Amount,Title,Category,Date,Notes,Source\n';
      
      // Add data rows
      expenses.forEach(expense => {
        const row = [
          expense.amount.toString(),
          `"${expense.title.replace(/"/g, '""')}"`,
          `"${expense.category || ''}"`,
          expense.date,
          `"${(expense.notes || '').replace(/"/g, '""')}"`,
          expense.source
        ].join(',');
        csv += row + '\n';
      });
      
      return csv;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error('Failed to export data');
    }
  }

  async importExpensesFromCSV(csvData: string): Promise<void> {
    try {
      const lines = csvData.trim().split('\n');
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      for (const line of dataLines) {
        const values = this.parseCSVLine(line);
        
        if (values.length >= 4) {
          const expense = {
            amount: parseFloat(values[0]) || 0,
            title: values[1] || 'Imported Expense',
            category: values[2] || 'Other',
            date: values[3] || new Date().toISOString(),
            notes: values[4] || undefined,
            isRecurring: false,
            source: 'import' as const,
          };
          
          if (expense.amount > 0) {
            await this.addExpense(expense);
          }
        }
      }
    } catch (error) {
      console.error('Error importing from CSV:', error);
      throw new Error('Failed to import data');
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}

export const DatabaseService = new Database();