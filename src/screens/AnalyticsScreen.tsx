import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card, SegmentedButtons, Chip } from 'react-native-paper';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, startOfMonth, endOfMonth, subMonths, isThisMonth, isThisYear } from 'date-fns';

import { DatabaseService } from '../services/DatabaseService';
import { Expense, CategorySpending, MonthlyComparison } from '../types';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

interface AnalyticsScreenProps {
  navigation: any;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [timeframe, setTimeframe] = useState('month');
  const [chartType, setChartType] = useState('spending');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const { startDate, endDate } = getDateRange();
      const expenseData = await DatabaseService.getExpensesByDateRange(startDate, endDate);
      setExpenses(expenseData);

      // Category breakdown
      const categoryTotals = await DatabaseService.getCategoryTotals(startDate, endDate);
      const total = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
      
      const categorySpending: CategorySpending[] = categoryTotals.map(cat => ({
        category: cat.category,
        amount: cat.total,
        percentage: total > 0 ? (cat.total / total) * 100 : 0,
        color: getCategoryColor(cat.category),
      }));
      
      setCategoryData(categorySpending);

      // Monthly comparison (if viewing monthly data)
      if (timeframe === 'month') {
        await loadMonthlyComparison();
      }

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyComparison = async () => {
    try {
      const currentMonth = new Date();
      const lastMonth = subMonths(currentMonth, 1);
      const lastYear = subMonths(currentMonth, 12);

      const currentMonthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const currentMonthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      const lastYearStart = format(startOfMonth(lastYear), 'yyyy-MM-dd');
      const lastYearEnd = format(endOfMonth(lastYear), 'yyyy-MM-dd');

      const [currentExpenses, lastMonthExpenses, lastYearExpenses] = await Promise.all([
        DatabaseService.getExpensesByDateRange(currentMonthStart, currentMonthEnd),
        DatabaseService.getExpensesByDateRange(lastMonthStart, lastMonthEnd),
        DatabaseService.getExpensesByDateRange(lastYearStart, lastYearEnd),
      ]);

      const currentTotal = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const lastMonthTotal = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const lastYearTotal = lastYearExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const comparison: MonthlyComparison[] = [
        {
          month: format(currentMonth, 'MMM yyyy'),
          currentYear: currentTotal,
          previousYear: lastYearTotal,
          change: currentTotal - lastMonthTotal,
          changePercentage: lastMonthTotal > 0 ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0,
        },
      ];

      setMonthlyComparison(comparison);
    } catch (error) {
      console.error('Error loading monthly comparison:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6));
        return {
          startDate: format(startOfWeek, 'yyyy-MM-dd'),
          endDate: format(endOfWeek, 'yyyy-MM-dd'),
        };
        
      case 'month':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
        
      case 'year':
        return {
          startDate: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'),
          endDate: format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd'),
        };
        
      default:
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
    }
  };

  const getCategoryColor = (category: string): string => {
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
    return colorMap[category] || '#9E9E9E';
  };

  const renderSummaryCards = () => {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const averagePerDay = expenses.length > 0 ? totalSpent / getDateRange().startDate.split('-').length : 0;
    const transactionCount = expenses.length;

    return (
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryCardContent}>
            <Icon name="account-balance-wallet" size={24} color={theme.colors.primary} />
            <Text style={styles.summaryAmount}>HK${totalSpent.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryCardContent}>
            <Icon name="trending-up" size={24} color={theme.colors.secondary} />
            <Text style={styles.summaryAmount}>HK${averagePerDay.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Daily Average</Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryCardContent}>
            <Icon name="receipt" size={24} color={theme.colors.info} />
            <Text style={styles.summaryAmount}>{transactionCount}</Text>
            <Text style={styles.summaryLabel}>Transactions</Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderSpendingChart = () => {
    if (expenses.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.chartTitle}>Daily Spending Trend</Text>
            <Text style={styles.emptyText}>No data available</Text>
          </Card.Content>
        </Card>
      );
    }

    // Group expenses by date
    const groupedByDate = expenses.reduce((acc, expense) => {
      const date = expense.date.split(' ')[0]; // Get date part only
      acc[date] = (acc[date] || 0) + expense.amount;
      return acc;
    }, {} as { [key: string]: number });

    const sortedDates = Object.keys(groupedByDate).sort();
    const chartData = {
      labels: sortedDates.map(date => format(new Date(date), 'MM/dd')),
      datasets: [{
        data: sortedDates.map(date => groupedByDate[date]),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Daily Spending Trend</Text>
          <LineChart
            data={chartData}
            width={chartWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: theme.colors.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderCategoryChart = () => {
    if (categoryData.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <Text style={styles.emptyText}>No data available</Text>
          </Card.Content>
        </Card>
      );
    }

    const pieData = categoryData.map(cat => ({
      name: cat.category,
      amount: cat.amount,
      color: cat.color,
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    }));

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          <PieChart
            data={pieData}
            width={chartWidth - 32}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
    );
  };

  const renderComparisonChart = () => {
    if (monthlyComparison.length === 0 || timeframe !== 'month') {
      return null;
    }

    const comparison = monthlyComparison[0];
    const isIncrease = comparison.change > 0;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Month-to-Month Comparison</Text>
          
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>This Month</Text>
              <Text style={styles.comparisonAmount}>HK${comparison.currentYear.toFixed(2)}</Text>
            </View>
            
            <View style={styles.comparisonArrow}>
              <Icon 
                name={isIncrease ? 'trending-up' : 'trending-down'} 
                size={32} 
                color={isIncrease ? '#F44336' : '#4CAF50'} 
              />
              <Text style={[
                styles.comparisonChange,
                { color: isIncrease ? '#F44336' : '#4CAF50' }
              ]}>
                {isIncrease ? '+' : ''}{comparison.changePercentage.toFixed(1)}%
              </Text>
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Last Year</Text>
              <Text style={styles.comparisonAmount}>HK${comparison.previousYear.toFixed(2)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderInsights = () => (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Text style={styles.chartTitle}>Insights & Tips</Text>
        
        <View style={styles.insightsList}>
          <View style={styles.insightItem}>
            <Icon name="lightbulb-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.insightText}>
              Your highest spending category is {categoryData[0]?.category || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Icon name="trending-up" size={20} color={theme.colors.info} />
            <Text style={styles.insightText}>
              Consider setting a budget limit for your top spending categories
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Icon name="schedule" size={20} color={theme.colors.success} />
            <Text style={styles.insightText}>
              Track recurring expenses to better manage your monthly budget
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <SegmentedButtons
          value={timeframe}
          onValueChange={setTimeframe}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSummaryCards()}
        {renderSpendingChart()}
        {renderCategoryChart()}
        {renderComparisonChart()}
        {renderInsights()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  controls: {
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  summaryCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
    marginVertical: 40,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  comparisonAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  comparisonArrow: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  comparisonChange: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default AnalyticsScreen;