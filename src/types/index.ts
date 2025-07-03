// Expense types
export interface Expense {
  id: string;
  amount: number;
  title: string;
  category?: string;
  date: string;
  notes?: string;
  isRecurring: boolean;
  source: 'manual' | 'voice' | 'bank' | 'import';
  bankAccountId?: string;
  bankTransactionId?: string;
  createdAt: string;
}

// Bank account types
export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber?: string;
  accountType: 'checking' | 'savings' | 'credit' | 'other';
  balance?: number;
  currency: string;
  lastSyncDate?: string;
  accessToken?: string;
  isActive: boolean;
  createdAt: string;
}

// Bank transaction from Open Banking API
export interface BankTransaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  category?: string;
  merchantName?: string;
  reference?: string;
  type: 'debit' | 'credit';
  status: 'pending' | 'completed' | 'failed';
}

// Recurring pattern detection
export interface RecurringPattern {
  id: string;
  title: string;
  category?: string;
  averageAmount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  confidence: number; // 0-1
  lastOccurrence: string;
  nextPredicted?: string;
  isActive: boolean;
  createdAt: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

// Voice input types
export interface VoiceExpenseData {
  amount?: number;
  description?: string;
  category?: string;
  confidence: number;
  rawText: string;
}

// Analytics types
export interface SpendingData {
  date: string;
  amount: number;
  category?: string;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyComparison {
  month: string;
  currentYear: number;
  previousYear: number;
  change: number;
  changePercentage: number;
}

// Hong Kong Open Banking API types
export interface HKOpenBankingConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  environment: 'sandbox' | 'production';
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface AccountInfo {
  accountId: string;
  accountType: string;
  accountSubType: string;
  currency: string;
  nickname?: string;
  account: {
    schemeName: string;
    identification: string;
    name?: string;
  };
  servicer?: {
    schemeName: string;
    identification: string;
  };
}

export interface BalanceInfo {
  accountId: string;
  amount: {
    amount: string;
    currency: string;
  };
  creditDebitIndicator: 'Credit' | 'Debit';
  type: 'ClosingAvailable' | 'ForwardAvailable' | 'Information' | 'InterimAvailable' | 'OpeningAvailable';
  dateTime: string;
}

// Navigation types
export type RootTabParamList = {
  Dashboard: undefined;
  AddExpense: undefined;
  Analytics: undefined;
  Settings: undefined;
};

// Component props types
export interface ExpenseItemProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    colors?: string[];
  }[];
}

// Settings types
export interface AppSettings {
  currency: string;
  dateFormat: string;
  darkMode: boolean;
  notifications: {
    enabled: boolean;
    spendingAlerts: boolean;
    recurringReminders: boolean;
  };
  sync: {
    autoSync: boolean;
    syncFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  };
}