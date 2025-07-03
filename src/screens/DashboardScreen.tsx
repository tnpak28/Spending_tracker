import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card, FAB, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { DatabaseService } from '../services/DatabaseService';
import { HKOpenBankingService } from '../services/HKOpenBankingService';
import { Expense, BankAccount } from '../types';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      // Load recent expenses
      const recentExpenses = await DatabaseService.getExpenses(10);
      setExpenses(recentExpenses);

      // Calculate today's total
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayExpenses = recentExpenses.filter(expense => 
        expense.date.startsWith(today)
      );
      const todaySum = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      setTodayTotal(todaySum);

      // Calculate month's total
      const startOfMonth = format(new Date(), 'yyyy-MM-01');
      const endOfMonth = format(new Date(), 'yyyy-MM-dd');
      const monthExpenses = await DatabaseService.getExpensesByDateRange(startOfMonth, endOfMonth);
      const monthSum = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      setMonthTotal(monthSum);

      // Load bank accounts
      const accounts = await DatabaseService.getBankAccounts();
      setBankAccounts(accounts);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Sync with bank if connected
      if (HKOpenBankingService.isConnected()) {
        await syncBankTransactions();
      }
      
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const syncBankTransactions = async () => {
    try {
      const bankAccounts = await HKOpenBankingService.getBankAccounts();
      
      for (const account of bankAccounts) {
        // Save bank account to local database
        await DatabaseService.addBankAccount(account);
        
        // Get recent transactions
        const transactions = await HKOpenBankingService.getTransactions(
          account.id,
          format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          format(new Date(), 'yyyy-MM-dd')
        );
        
        // Convert and save transactions as expenses
        for (const transaction of transactions) {
          if (transaction.type === 'debit' && transaction.amount > 0) {
            const expense = {
              amount: transaction.amount,
              title: transaction.description,
              category: transaction.category || 'Other',
              date: transaction.date,
              notes: `Bank: ${account.bankName}`,
              isRecurring: false,
              source: 'bank' as const,
              bankAccountId: account.id,
              bankTransactionId: transaction.id,
            };
            
            await DatabaseService.addExpense(expense);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing bank transactions:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const renderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryAmount}>HK${todayTotal.toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>
              {expenses.filter(e => e.date.startsWith(format(new Date(), 'yyyy-MM-dd'))).length} transactions
            </Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryAmount}>HK${monthTotal.toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>
              {format(new Date(), 'MMM yyyy')}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Icon name="add" size={24} color={theme.colors.primary} />
        <Text style={styles.quickActionText}>Add Expense</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('AddExpense', { voiceMode: true })}
      >
        <Icon name="mic" size={24} color={theme.colors.secondary} />
        <Text style={styles.quickActionText}>Voice Input</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={handleRefresh}
      >
        <Icon name="sync" size={24} color={theme.colors.info} />
        <Text style={styles.quickActionText}>Sync Banks</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBankAccounts = () => {
    if (bankAccounts.length === 0) {
      return (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Icon name="account-balance" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Bank Accounts</Text>
            </View>
            <Text style={styles.emptyText}>No bank accounts connected</Text>
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.connectButtonText}>Connect Bank Account</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Icon name="account-balance" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
          </View>
          {bankAccounts.map((account) => (
            <View key={account.id} style={styles.bankAccountItem}>
              <Avatar.Icon 
                size={40} 
                icon="account-balance" 
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.bankAccountInfo}>
                <Text style={styles.bankAccountName}>{account.accountName}</Text>
                <Text style={styles.bankAccountBank}>{account.bankName}</Text>
              </View>
              <View style={styles.bankAccountBalance}>
                <Text style={styles.bankAccountAmount}>
                  {account.currency} {account.balance?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.bankAccountSync}>
                  {account.lastSyncDate ? format(new Date(account.lastSyncDate), 'MMM dd') : 'Never'}
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderRecentExpenses = () => (
    <Card style={styles.sectionCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <Icon name="receipt" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet</Text>
        ) : (
          expenses.slice(0, 5).map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseIcon}>
                <Icon 
                  name={getCategoryIcon(expense.category)} 
                  size={20} 
                  color={getCategoryColor(expense.category)} 
                />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseTitle}>{expense.title}</Text>
                <Text style={styles.expenseCategory}>{expense.category}</Text>
              </View>
              <View style={styles.expenseAmount}>
                <Text style={styles.expensePrice}>HK${expense.amount.toFixed(2)}</Text>
                <Text style={styles.expenseDate}>
                  {format(new Date(expense.date), 'MMM dd')}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );

  const getCategoryIcon = (category?: string): string => {
    const iconMap: { [key: string]: string } = {
      'Food & Dining': 'restaurant',
      'Transportation': 'directions-car',
      'Shopping': 'shopping-bag',
      'Entertainment': 'movie',
      'Bills & Utilities': 'receipt',
      'Health & Fitness': 'fitness-center',
      'Travel': 'flight',
      'Education': 'school',
    };
    return iconMap[category || 'Other'] || 'attach-money';
  };

  const getCategoryColor = (category?: string): string => {
    const colorMap: { [key: string]: string } = {
      'Food & Dining': '#FF9800',
      'Transportation': '#2196F3',
      'Shopping': '#E91E63',
      'Entertainment': '#9C27B0',
      'Bills & Utilities': '#4CAF50',
      'Health & Fitness': '#F44336',
      'Travel': '#00BCD4',
      'Education': '#FFC107',
    };
    return colorMap[category || 'Other'] || '#9E9E9E';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderSummaryCard()}
        {renderQuickActions()}
        {renderBankAccounts()}
        {renderRecentExpenses()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="add"
        onPress={() => navigation.navigate('AddExpense')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: theme.colors.outline,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    elevation: 1,
    minWidth: (width - 64) / 3,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginLeft: 8,
    flex: 1,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    marginVertical: 20,
  },
  connectButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 12,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  bankAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  bankAccountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bankAccountName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  bankAccountBank: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  bankAccountBalance: {
    alignItems: 'flex-end',
  },
  bankAccountAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  bankAccountSync: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  expenseCategory: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  expensePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  expenseDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  bottomSpacing: {
    height: 80,
  },
});

export default DashboardScreen;