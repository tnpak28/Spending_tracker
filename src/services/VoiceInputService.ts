import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { VoiceExpenseData } from '../types';

class VoiceInput {
  private recording?: Audio.Recording;
  private isRecording = false;
  private isProcessing = false;

  constructor() {
    this.setupAudio();
  }

  private async setupAudio() {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio recording permission not granted');
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Audio setup error:', error);
    }
  }

  async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      console.warn('Already recording');
      return false;
    }

    try {
      // Create recording instance
      this.recording = new Audio.Recording();
      
      // Configure recording options
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      
      this.isRecording = true;
      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Start recording error:', error);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.isRecording || !this.recording) {
      console.warn('Not currently recording');
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isRecording = false;
      this.recording = undefined;
      
      console.log('Recording stopped, URI:', uri);
      
      // Process the audio file to text
      if (uri) {
        return await this.processAudioToText(uri);
      }
      
      return null;
    } catch (error) {
      console.error('Stop recording error:', error);
      return null;
    }
  }

  private async processAudioToText(audioUri: string): Promise<string | null> {
    if (this.isProcessing) {
      console.warn('Already processing audio');
      return null;
    }

    this.isProcessing = true;

    try {
      // Note: Expo doesn't have built-in speech-to-text
      // In a real app, you would integrate with services like:
      // - Google Cloud Speech-to-Text
      // - Azure Speech Services
      // - AWS Transcribe
      // - Apple's SFSpeechRecognizer (iOS only)
      
      // For demo purposes, we'll simulate the response
      // In production, replace this with actual speech recognition
      return await this.simulateSpeechRecognition(audioUri);
      
    } catch (error) {
      console.error('Speech recognition error:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  // Simulate speech recognition for demo
  private async simulateSpeechRecognition(audioUri: string): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock transcription
    const mockTranscriptions = [
      "I spent 25 dollars on coffee at Starbucks",
      "Paid 150 HKD for groceries at PARKnSHOP",
      "Transportation 45 dollars for taxi",
      "Lunch at McDonald's cost 80 HKD",
      "Netflix subscription 99 dollars monthly",
      "Gas station 200 HKD for fuel",
      "Movie tickets 120 HKD entertainment",
      "Gym membership 500 HKD fitness"
    ];
    
    return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
  }

  // Parse voice input to extract expense data
  parseExpenseFromText(text: string): VoiceExpenseData {
    const lowercaseText = text.toLowerCase();
    
    // Extract amount
    const amount = this.extractAmount(lowercaseText);
    
    // Extract description
    const description = this.extractDescription(text, amount);
    
    // Detect category
    const category = this.detectCategory(lowercaseText);
    
    // Calculate confidence based on extracted data
    const confidence = this.calculateConfidence(amount, description, category);
    
    return {
      amount,
      description,
      category,
      confidence,
      rawText: text,
    };
  }

  private extractAmount(text: string): number | undefined {
    // Patterns for HKD and USD amounts
    const patterns = [
      /(\d+(?:\.\d{1,2})?)\s*(?:hkd|hk\$|hong kong dollars?)/g,
      /(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd|bucks?)/g,
      /hk?\$\s*(\d+(?:\.\d{1,2})?)/g,
      /\$\s*(\d+(?:\.\d{1,2})?)/g,
      /(\d+(?:\.\d{1,2})?)\s*(?:dollar|buck)/g,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    // Fallback: look for any number that might be an amount
    const numberMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    if (numberMatch) {
      const amount = parseFloat(numberMatch[1]);
      if (!isNaN(amount) && amount > 0 && amount < 100000) { // Reasonable range
        return amount;
      }
    }

    return undefined;
  }

  private extractDescription(text: string, amount?: number): string | undefined {
    let cleanText = text;

    // Remove amount references
    if (amount) {
      const amountPatterns = [
        new RegExp(`${amount}\\s*(?:hkd|hk\\$|dollars?|usd|bucks?)`, 'gi'),
        new RegExp(`hk?\\$\\s*${amount}`, 'gi'),
        new RegExp(`\\$\\s*${amount}`, 'gi'),
        new RegExp(`${amount}`, 'g'),
      ];

      amountPatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, '');
      });
    }

    // Remove common phrases
    const commonPhrases = [
      /i\s+spent/gi,
      /i\s+paid/gi,
      /i\s+bought/gi,
      /paid\s+for/gi,
      /spent\s+on/gi,
      /cost\s+me/gi,
      /\bfor\b/gi,
      /\bon\b/gi,
      /\bat\b/gi,
      /\bcost\b/gi,
    ];

    commonPhrases.forEach(phrase => {
      cleanText = cleanText.replace(phrase, ' ');
    });

    // Clean up whitespace and extract meaningful content
    const words = cleanText
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 1 && !/^\d+$/.test(word));

    if (words.length > 0) {
      return words.join(' ').trim();
    }

    return undefined;
  }

  private detectCategory(text: string): string | undefined {
    const categoryKeywords = {
      'Food & Dining': [
        'coffee', 'starbucks', 'mcdonald', 'restaurant', 'lunch', 'dinner', 
        'breakfast', 'food', 'cafe', 'pizza', 'burger', 'meal', 'eat',
        'parknshop', 'wellcome', 'groceries', 'supermarket'
      ],
      'Transportation': [
        'taxi', 'uber', 'bus', 'mtr', 'train', 'transport', 'fuel', 
        'gas', 'petrol', 'octopus', 'travel', 'car', 'parking'
      ],
      'Shopping': [
        'shopping', 'mall', 'store', 'buy', 'purchase', 'clothes',
        'shirt', 'shoes', 'amazon', 'online', 'retail'
      ],
      'Entertainment': [
        'movie', 'cinema', 'theater', 'netflix', 'spotify', 'game',
        'entertainment', 'concert', 'show', 'ticket'
      ],
      'Health & Fitness': [
        'gym', 'fitness', 'doctor', 'hospital', 'medicine', 'pharmacy',
        'health', 'medical', 'dentist', 'clinic'
      ],
      'Bills & Utilities': [
        'electricity', 'water', 'gas', 'internet', 'phone', 'mobile',
        'bill', 'utility', 'subscription', 'monthly', 'service'
      ],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return undefined;
  }

  private calculateConfidence(
    amount?: number, 
    description?: string, 
    category?: string
  ): number {
    let confidence = 0;

    // Amount contributes 40% to confidence
    if (amount !== undefined) {
      confidence += 0.4;
    }

    // Description contributes 35% to confidence
    if (description && description.length > 2) {
      confidence += 0.35;
    }

    // Category contributes 25% to confidence
    if (category) {
      confidence += 0.25;
    }

    return Math.min(confidence, 1.0);
  }

  // Check if recording is supported
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  // Get recording status
  getRecordingStatus(): {
    isRecording: boolean;
    isProcessing: boolean;
  } {
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
    };
  }

  // Speak text (for feedback)
  async speak(text: string): Promise<void> {
    try {
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  }
}

export const VoiceInputService = new VoiceInput();