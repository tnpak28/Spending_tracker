import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Chip,
  Portal,
  Modal,
  List,
  Switch,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { showMessage } from 'react-native-flash-message';

import { DatabaseService } from '../services/DatabaseService';
import { VoiceInputService } from '../services/VoiceInputService';
import { Expense, Category } from '../types';
import { theme } from '../theme';

interface AddExpenseScreenProps {
  navigation: any;
  route: any;
}

const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({ navigation, route }) => {
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Food & Dining');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Voice input states
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  
  // UI states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    
    // Check if launched in voice mode
    if (route.params?.voiceMode) {
      setIsVoiceMode(true);
    }
  }, [route.params]);

  const loadCategories = async () => {
    try {
      const cats = await DatabaseService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsProcessing(true);
      
      try {
        const transcription = await VoiceInputService.stopRecording();
        if (transcription) {
          setVoiceText(transcription);
          const expenseData = VoiceInputService.parseExpenseFromText(transcription);
          
          // Auto-fill form with extracted data
          if (expenseData.amount) {
            setAmount(expenseData.amount.toString());
          }
          if (expenseData.description) {
            setTitle(expenseData.description);
          }
          if (expenseData.category) {
            setSelectedCategory(expenseData.category);
          }
          
          // Provide feedback
          showMessage({
            message: 'Voice input processed!',
            description: `Confidence: ${Math.round(expenseData.confidence * 100)}%`,
            type: 'success',
            duration: 3000,
          });
          
          if (expenseData.confidence > 0.8) {
            VoiceInputService.speak('Expense details extracted successfully');
          } else {
            VoiceInputService.speak('Please review the extracted details');
          }
        } else {
          showMessage({
            message: 'Could not process voice input',
            description: 'Please try again or enter manually',
            type: 'warning',
          });
        }
      } catch (error) {
        console.error('Voice input error:', error);
        showMessage({
          message: 'Voice input failed',
          description: 'Please try again',
          type: 'danger',
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      const started = await VoiceInputService.startRecording();
      if (started) {
        setIsRecording(true);
        setVoiceText('');
        VoiceInputService.speak('Listening for expense details');
      } else {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice input.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSave = async () => {
    if (!amount || !title) {
      Alert.alert('Missing Information', 'Please enter both amount and description.');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setIsSaving(true);

    try {
      const expense: Omit<Expense, 'id' | 'createdAt'> = {
        amount: amountValue,
        title: title.trim(),
        category: selectedCategory,
        date: format(date, 'yyyy-MM-dd HH:mm:ss'),
        notes: notes.trim() || undefined,
        isRecurring,
        source: isVoiceMode ? 'voice' : 'manual',
      };

      await DatabaseService.addExpense(expense);

      showMessage({
        message: 'Expense Added!',
        description: `${expense.title} - HK$${expense.amount.toFixed(2)}`,
        type: 'success',
      });

      // Clear form
      setAmount('');
      setTitle('');
      setNotes('');
      setIsRecurring(false);
      setVoiceText('');
      setIsVoiceMode(false);

      // Navigate back or stay for more entries
      if (route.params?.returnAfterSave !== false) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      showMessage({
        message: 'Save Failed',
        description: 'Could not save expense. Please try again.',
        type: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderVoiceControls = () => (
    <Card style={styles.voiceCard}>
      <Card.Content>
        <View style={styles.voiceHeader}>
          <Icon name="mic" size={24} color={theme.colors.primary} />
          <Text style={styles.voiceTitle}>Voice Input</Text>
          <Switch
            value={isVoiceMode}
            onValueChange={setIsVoiceMode}
            color={theme.colors.primary}
          />
        </View>

        {isVoiceMode && (
          <View style={styles.voiceControls}>
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && styles.voiceButtonRecording,
                isProcessing && styles.voiceButtonProcessing,
              ]}
              onPress={handleVoiceInput}
              disabled={isProcessing}
            >
              <Icon
                name={isProcessing ? 'hourglass-empty' : isRecording ? 'stop' : 'mic'}
                size={32}
                color="white"
              />
            </TouchableOpacity>

            <Text style={styles.voiceStatus}>
              {isProcessing
                ? 'Processing...'
                : isRecording
                ? 'Recording... Tap to stop'
                : 'Tap to start recording'}
            </Text>

            {voiceText && (
              <View style={styles.voiceTextContainer}>
                <Text style={styles.voiceTextLabel}>Transcribed:</Text>
                <Text style={styles.voiceText}>{voiceText}</Text>
              </View>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderAmountInput = () => (
    <Card style={styles.inputCard}>
      <Card.Content>
        <Text style={styles.inputLabel}>Amount (HKD)</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>HK$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            mode="flat"
            dense
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderDescriptionInput = () => (
    <Card style={styles.inputCard}>
      <Card.Content>
        <TextInput
          label="Description"
          value={title}
          onChangeText={setTitle}
          placeholder="What did you spend on?"
          mode="outlined"
          dense
        />
      </Card.Content>
    </Card>
  );

  const renderCategorySelector = () => (
    <Card style={styles.inputCard}>
      <Card.Content>
        <Text style={styles.inputLabel}>Category</Text>
        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryModal(true)}
        >
          <View style={styles.categoryDisplay}>
            <Icon
              name={getCategoryIcon(selectedCategory)}
              size={24}
              color={getCategoryColor(selectedCategory)}
            />
            <Text style={styles.categoryText}>{selectedCategory}</Text>
          </View>
          <Icon name="keyboard-arrow-down" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  const renderNotesInput = () => (
    <Card style={styles.inputCard}>
      <Card.Content>
        <TextInput
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional details..."
          mode="outlined"
          multiline
          numberOfLines={3}
          dense
        />
      </Card.Content>
    </Card>
  );

  const renderOptionsCard = () => (
    <Card style={styles.inputCard}>
      <Card.Content>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Recurring Expense</Text>
            <Text style={styles.optionSubtitle}>
              Mark if this is a regular expense (subscription, bill, etc.)
            </Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            color={theme.colors.primary}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const getCategoryIcon = (category: string): string => {
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
    return iconMap[category] || 'attach-money';
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderVoiceControls()}
        {renderAmountInput()}
        {renderDescriptionInput()}
        {renderCategorySelector()}
        {renderNotesInput()}
        {renderOptionsCard()}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || !amount || !title}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          {isSaving ? 'Saving...' : 'Add Expense'}
        </Button>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Category Selection Modal */}
      <Portal>
        <Modal
          visible={showCategoryModal}
          onDismiss={() => setShowCategoryModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Select Category</Text>
          <ScrollView style={styles.categoryList}>
            {categories.map((category) => (
              <List.Item
                key={category.id}
                title={category.name}
                left={() => (
                  <Icon
                    name={category.icon}
                    size={24}
                    color={category.color}
                    style={styles.categoryIcon}
                  />
                )}
                onPress={() => {
                  setSelectedCategory(category.name);
                  setShowCategoryModal(false);
                }}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.name && styles.selectedCategoryItem,
                ]}
              />
            ))}
          </ScrollView>
          <Button
            onPress={() => setShowCategoryModal(false)}
            style={styles.modalCloseButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
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
  voiceCard: {
    marginBottom: 16,
    elevation: 2,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginLeft: 8,
  },
  voiceControls: {
    alignItems: 'center',
    marginTop: 16,
  },
  voiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  voiceButtonRecording: {
    backgroundColor: '#F44336',
  },
  voiceButtonProcessing: {
    backgroundColor: '#FF9800',
  },
  voiceStatus: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  voiceTextContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    width: '100%',
  },
  voiceTextLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  voiceText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontStyle: 'italic',
  },
  inputCard: {
    marginBottom: 16,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 8,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    marginLeft: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  optionSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  bottomSpacing: {
    height: 40,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedCategoryItem: {
    backgroundColor: theme.colors.primaryContainer,
  },
  categoryIcon: {
    marginLeft: 8,
  },
  modalCloseButton: {
    marginTop: 16,
  },
});

export default AddExpenseScreen;