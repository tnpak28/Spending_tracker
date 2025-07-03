import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  List,
  Switch,
  Button,
  Divider,
  Card,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { showMessage } from 'react-native-flash-message';

import { DatabaseService } from '../services/DatabaseService';
import { HKOpenBankingService } from '../services/HKOpenBankingService';
import { VoiceInputService } from '../services/VoiceInputService';
import { BankAccount } from '../types';
import { theme } from '../theme';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [connectedAccounts, setConnectedAccounts] = useState<BankAccount[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState('');

  // App settings
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    loadConnectedAccounts();
    loadSettings();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      const accounts = await DatabaseService.getBankAccounts();
      setConnectedAccounts(accounts);
    } catch (error) {
      console.error('Error loading connected accounts:', error);
    }
  };

  const loadSettings = async () => {
    // Load app settings from storage
    // This would typically come from AsyncStorage or SecureStore
    try {
      setVoiceEnabled(VoiceInputService.isAvailable());
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleConnectBank = async () => {
    try {
      setIsConnecting(true);

      // Check if already connected
      if (HKOpenBankingService.isConnected()) {
        Alert.alert(
          'Already Connected',
          'You already have bank accounts connected. Would you like to add another account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Account', onPress: initiateConnection },
          ]
        );
        return;
      }

      await initiateConnection();
    } catch (error) {
      console.error('Bank connection error:', error);
      showMessage({
        message: 'Connection Failed',
        description: 'Could not connect to bank. Please try again.',
        type: 'danger',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const initiateConnection = async () => {
    try {
      // In a real app, this would open a WebView or browser for OAuth
      const authUrl = HKOpenBankingService.getAuthorizationUrl();
      
      Alert.alert(
        'Bank Authorization',
        'You will be redirected to your bank to authorize access to your account data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              // For demo purposes, simulate successful connection
              simulateBankConnection();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error initiating connection:', error);
    }
  };

  const simulateBankConnection = async () => {
    try {
      // Simulate OAuth callback with mock data
      const mockCode = 'mock_auth_code';
      const mockState = 'mock_state';

      // In real app, this would be handled by the OAuth callback
      await HKOpenBankingService.exchangeCodeForTokens(mockCode, mockState);
      
      // Load mock bank accounts
      const mockAccounts: BankAccount[] = [
        {
          id: `mock-${Date.now()}`,
          bankName: 'HSBC Hong Kong',
          accountName: 'Current Account',
          accountNumber: '****1234',
          accountType: 'checking',
          balance: 12543.67,
          currency: 'HKD',
          lastSyncDate: new Date().toISOString(),
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: `mock-${Date.now() + 1}`,
          bankName: 'Bank of China (Hong Kong)',
          accountName: 'Savings Account',
          accountNumber: '****5678',
          accountType: 'savings',
          balance: 45678.90,
          currency: 'HKD',
          lastSyncDate: new Date().toISOString(),
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // Save to database
      for (const account of mockAccounts) {
        await DatabaseService.addBankAccount(account);
      }

      await loadConnectedAccounts();

      showMessage({
        message: 'Bank Connected!',
        description: `Successfully connected to ${mockAccounts.length} accounts`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error simulating bank connection:', error);
      showMessage({
        message: 'Connection Failed',
        description: 'Could not connect to bank. Please try again.',
        type: 'danger',
      });
    }
  };

  const handleDisconnectBank = async (accountId: string) => {
    Alert.alert(
      'Disconnect Bank Account',
      'This will remove the account from the app. Your existing expenses will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from database (mark as inactive)
              const accounts = await DatabaseService.getBankAccounts();
              const account = accounts.find(acc => acc.id === accountId);
              if (account) {
                await DatabaseService.updateExpense(accountId, { isActive: false });
              }

              await loadConnectedAccounts();

              showMessage({
                message: 'Account Disconnected',
                description: 'Bank account has been removed from the app',
                type: 'info',
              });
            } catch (error) {
              console.error('Error disconnecting bank:', error);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const csvData = await DatabaseService.exportExpensesToCSV();
      setCsvData(csvData);
      setShowExportModal(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      showMessage({
        message: 'Export Failed',
        description: 'Could not export data. Please try again.',
        type: 'danger',
      });
    }
  };

  const handleImportData = async () => {
    if (!csvData.trim()) {
      Alert.alert('No Data', 'Please paste CSV data to import.');
      return;
    }

    try {
      await DatabaseService.importExpensesFromCSV(csvData);
      setShowImportModal(false);
      setCsvData('');

      showMessage({
        message: 'Import Successful',
        description: 'Data has been imported successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error importing data:', error);
      showMessage({
        message: 'Import Failed',
        description: 'Could not import data. Please check the format.',
        type: 'danger',
      });
    }
  };

  const handleSyncNow = async () => {
    try {
      if (!HKOpenBankingService.isConnected()) {
        Alert.alert('Not Connected', 'Please connect a bank account first.');
        return;
      }

      showMessage({
        message: 'Syncing...',
        description: 'Fetching latest transactions',
        type: 'info',
      });

      // This would trigger the sync process
      // Implementation would be similar to the one in DashboardScreen
      
      showMessage({
        message: 'Sync Complete',
        description: 'Latest transactions have been fetched',
        type: 'success',
      });
    } catch (error) {
      console.error('Sync error:', error);
      showMessage({
        message: 'Sync Failed',
        description: 'Could not sync with bank. Please try again.',
        type: 'danger',
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Bank Integration Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Bank Integration</Text>
            
            {connectedAccounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="account-balance" size={48} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>No bank accounts connected</Text>
                <Button
                  mode="contained"
                  onPress={handleConnectBank}
                  loading={isConnecting}
                  style={styles.connectButton}
                >
                  Connect Bank Account
                </Button>
              </View>
            ) : (
              <View>
                {connectedAccounts.map((account) => (
                  <List.Item
                    key={account.id}
                    title={account.accountName}
                    description={`${account.bankName} • ${account.currency} ${account.balance?.toFixed(2) || '0.00'}`}
                    left={() => <List.Icon icon="account-balance" />}
                    right={() => (
                      <Button
                        mode="text"
                        onPress={() => handleDisconnectBank(account.id)}
                        textColor={theme.colors.error}
                      >
                        Disconnect
                      </Button>
                    )}
                    style={styles.accountItem}
                  />
                ))}
                
                <View style={styles.bankActions}>
                  <Button
                    mode="outlined"
                    onPress={handleConnectBank}
                    loading={isConnecting}
                    style={styles.actionButton}
                  >
                    Add Account
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSyncNow}
                    style={styles.actionButton}
                  >
                    Sync Now
                  </Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Data Management Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Data Management</Text>
            
            <List.Item
              title="Export Data"
              description="Export your expenses to CSV format"
              left={() => <List.Icon icon="download" />}
              onPress={handleExportData}
            />
            
            <List.Item
              title="Import Data"
              description="Import expenses from CSV file"
              left={() => <List.Icon icon="upload" />}
              onPress={() => setShowImportModal(true)}
            />
          </Card.Content>
        </Card>

        {/* App Settings Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>App Settings</Text>
            
            <List.Item
              title="Notifications"
              description="Enable spending alerts and reminders"
              left={() => <List.Icon icon="notifications" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                />
              )}
            />
            
            <List.Item
              title="Auto Sync"
              description="Automatically sync with connected banks"
              left={() => <List.Icon icon="sync" />}
              right={() => (
                <Switch
                  value={autoSync}
                  onValueChange={setAutoSync}
                />
              )}
            />
            
            <List.Item
              title="Voice Input"
              description="Enable voice recognition for expense entry"
              left={() => <List.Icon icon="mic" />}
              right={() => (
                <Switch
                  value={voiceEnabled}
                  onValueChange={setVoiceEnabled}
                  disabled={!VoiceInputService.isAvailable()}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* About Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>About</Text>
            
            <List.Item
              title="Version"
              description="1.0.0"
              left={() => <List.Icon icon="info" />}
            />
            
            <List.Item
              title="Privacy Policy"
              description="View our privacy policy"
              left={() => <List.Icon icon="privacy-tip" />}
              onPress={() => {
                // Open privacy policy URL
                Linking.openURL('https://yourapp.com/privacy');
              }}
            />
            
            <List.Item
              title="Terms of Service"
              description="View terms and conditions"
              left={() => <List.Icon icon="description" />}
              onPress={() => {
                // Open terms URL
                Linking.openURL('https://yourapp.com/terms');
              }}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Export Modal */}
      <Portal>
        <Modal
          visible={showExportModal}
          onDismiss={() => setShowExportModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Export Data</Text>
          <Text style={styles.modalDescription}>
            Your expense data has been exported to CSV format. Copy the data below:
          </Text>
          
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={8}
            value={csvData}
            style={styles.csvInput}
            editable={false}
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowExportModal(false)}
            >
              Close
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                // Copy to clipboard or share
                showMessage({
                  message: 'Copied!',
                  description: 'Data copied to clipboard',
                  type: 'success',
                });
              }}
            >
              Copy
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Import Modal */}
      <Portal>
        <Modal
          visible={showImportModal}
          onDismiss={() => setShowImportModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Import Data</Text>
          <Text style={styles.modalDescription}>
            Paste your CSV data below. The format should include: Amount, Title, Category, Date, Notes
          </Text>
          
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={8}
            value={csvData}
            onChangeText={setCsvData}
            placeholder="Amount,Title,Category,Date,Notes&#10;25.50,Coffee,Food & Dining,2024-01-15,Starbucks"
            style={styles.csvInput}
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setShowImportModal(false);
                setCsvData('');
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleImportData}
              disabled={!csvData.trim()}
            >
              Import
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginVertical: 16,
    textAlign: 'center',
  },
  connectButton: {
    marginTop: 16,
  },
  accountItem: {
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  bankActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
    lineHeight: 20,
  },
  csvInput: {
    marginBottom: 16,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default SettingsScreen;