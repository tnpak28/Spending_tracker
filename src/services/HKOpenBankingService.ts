import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import { 
  HKOpenBankingConfig, 
  OAuthTokenResponse, 
  AccountInfo, 
  BalanceInfo, 
  BankTransaction,
  BankAccount 
} from '../types';

class HKOpenBanking {
  private config: HKOpenBankingConfig;
  private apiClient: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;

  constructor() {
    // Default configuration - replace with actual values
    this.config = {
      clientId: process.env.EXPO_PUBLIC_HK_OPEN_BANKING_CLIENT_ID || 'your-client-id',
      clientSecret: process.env.EXPO_PUBLIC_HK_OPEN_BANKING_CLIENT_SECRET || 'your-client-secret',
      redirectUri: 'spendingtracker://auth/callback',
      scopes: ['accounts', 'balances', 'transactions'],
      environment: 'sandbox' // Change to 'production' for live environment
    };

    // Initialize API client
    this.apiClient = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use(
      async (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry original request with new token
            return this.apiClient.request(error.config);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens();
            throw refreshError;
          }
        }
        return Promise.reject(error);
      }
    );

    // Load stored tokens on initialization
    this.loadStoredTokens();
  }

  private getBaseUrl(): string {
    if (this.config.environment === 'production') {
      return 'https://api.openbanking.hk/v1'; // Replace with actual production URL
    }
    return 'https://sandbox.api.openbanking.hk/v1'; // Replace with actual sandbox URL
  }

  // OAuth 2.0 Authorization Flow
  getAuthorizationUrl(): string {
    const state = this.generateRandomString(32);
    const codeChallenge = this.generateCodeChallenge();
    
    // Store state and code verifier for later verification
    SecureStore.setItemAsync('oauth_state', state);
    SecureStore.setItemAsync('code_verifier', codeChallenge.verifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge.challenge,
      code_challenge_method: 'S256',
    });

    return `${this.getBaseUrl()}/auth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, state: string): Promise<OAuthTokenResponse> {
    // Verify state parameter
    const storedState = await SecureStore.getItemAsync('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    const codeVerifier = await SecureStore.getItemAsync('code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    try {
      const response = await this.apiClient.post('/auth/token', {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      });

      const tokenData: OAuthTokenResponse = response.data;
      
      // Store tokens securely
      await this.storeTokens(tokenData);
      
      // Clean up temporary storage
      await SecureStore.deleteItemAsync('oauth_state');
      await SecureStore.deleteItemAsync('code_verifier');

      return tokenData;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  private async storeTokens(tokenData: OAuthTokenResponse): Promise<void> {
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;

    // Store tokens securely
    await SecureStore.setItemAsync('access_token', tokenData.access_token);
    await SecureStore.setItemAsync('refresh_token', tokenData.refresh_token);
    await SecureStore.setItemAsync('token_expires_at', 
      (Date.now() + tokenData.expires_in * 1000).toString()
    );
  }

  private async loadStoredTokens(): Promise<void> {
    try {
      this.accessToken = await SecureStore.getItemAsync('access_token') || undefined;
      this.refreshToken = await SecureStore.getItemAsync('refresh_token') || undefined;
      
      const expiresAt = await SecureStore.getItemAsync('token_expires_at');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        // Token expired, try to refresh
        if (this.refreshToken) {
          await this.refreshAccessToken();
        } else {
          this.clearTokens();
        }
      }
    } catch (error) {
      console.error('Error loading stored tokens:', error);
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.apiClient.post('/auth/token', {
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.refreshToken,
      });

      const tokenData: OAuthTokenResponse = response.data;
      await this.storeTokens(tokenData);
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  async clearTokens(): Promise<void> {
    this.accessToken = undefined;
    this.refreshToken = undefined;

    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('token_expires_at');
  }

  // Account Management
  async getAccounts(): Promise<AccountInfo[]> {
    try {
      const response = await this.apiClient.get('/accounts');
      return response.data.Data?.Account || [];
    } catch (error) {
      console.error('Get accounts error:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  async getAccountBalances(accountId: string): Promise<BalanceInfo[]> {
    try {
      const response = await this.apiClient.get(`/accounts/${accountId}/balances`);
      return response.data.Data?.Balance || [];
    } catch (error) {
      console.error('Get balances error:', error);
      throw new Error('Failed to fetch account balances');
    }
  }

  // Transaction Management
  async getTransactions(
    accountId: string, 
    fromDate?: string, 
    toDate?: string,
    limit: number = 100
  ): Promise<BankTransaction[]> {
    try {
      const params: any = { limit };
      if (fromDate) params.fromBookingDateTime = fromDate;
      if (toDate) params.toBookingDateTime = toDate;

      const response = await this.apiClient.get(`/accounts/${accountId}/transactions`, {
        params
      });

      const transactions = response.data.Data?.Transaction || [];
      
      // Convert to our internal format
      return transactions.map((tx: any) => ({
        id: tx.TransactionId,
        accountId: accountId,
        amount: parseFloat(tx.Amount.Amount),
        currency: tx.Amount.Currency,
        description: tx.TransactionInformation || tx.TransactionReference,
        date: tx.BookingDateTime,
        category: this.mapTransactionCategory(tx.TransactionCode),
        merchantName: tx.MerchantDetails?.MerchantName,
        reference: tx.TransactionReference,
        type: tx.CreditDebitIndicator === 'Debit' ? 'debit' : 'credit',
        status: tx.Status || 'completed',
      }));
    } catch (error) {
      console.error('Get transactions error:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  // Convert bank accounts to our internal format
  async getBankAccounts(): Promise<BankAccount[]> {
    try {
      const accounts = await this.getAccounts();
      const bankAccounts: BankAccount[] = [];

      for (const account of accounts) {
        const balances = await this.getAccountBalances(account.accountId);
        const currentBalance = balances.find(b => b.type === 'ClosingAvailable');

        bankAccounts.push({
          id: account.accountId,
          bankName: account.servicer?.identification || 'Unknown Bank',
          accountName: account.nickname || account.account.name || 'Account',
          accountNumber: account.account.identification,
          accountType: this.mapAccountType(account.accountSubType),
          balance: currentBalance ? parseFloat(currentBalance.amount.amount) : 0,
          currency: account.currency,
          lastSyncDate: new Date().toISOString(),
          accessToken: this.accessToken,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }

      return bankAccounts;
    } catch (error) {
      console.error('Get bank accounts error:', error);
      throw new Error('Failed to fetch bank accounts');
    }
  }

  // Utility methods
  private mapAccountType(subType: string): 'checking' | 'savings' | 'credit' | 'other' {
    const type = subType.toLowerCase();
    if (type.includes('current') || type.includes('checking')) return 'checking';
    if (type.includes('savings')) return 'savings';
    if (type.includes('credit')) return 'credit';
    return 'other';
  }

  private mapTransactionCategory(transactionCode: any): string {
    // Map bank transaction codes to our categories
    const code = transactionCode?.Code || '';
    
    if (code.includes('ATM') || code.includes('CASH')) return 'Other';
    if (code.includes('TRANSFER')) return 'Other';
    if (code.includes('PAYMENT')) return 'Bills & Utilities';
    if (code.includes('RETAIL')) return 'Shopping';
    if (code.includes('RESTAURANT') || code.includes('FOOD')) return 'Food & Dining';
    if (code.includes('TRANSPORT')) return 'Transportation';
    if (code.includes('FUEL') || code.includes('GAS')) return 'Transportation';
    if (code.includes('ENTERTAINMENT')) return 'Entertainment';
    if (code.includes('HEALTH') || code.includes('MEDICAL')) return 'Health & Fitness';
    
    return 'Other';
  }

  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  private generateCodeChallenge(): { verifier: string; challenge: string } {
    const verifier = this.generateRandomString(128);
    const challenge = CryptoJS.SHA256(verifier).toString(CryptoJS.enc.Base64url);
    return { verifier, challenge };
  }

  // Connection status
  isConnected(): boolean {
    return !!this.accessToken;
  }

  // Disconnect
  async disconnect(): Promise<void> {
    await this.clearTokens();
  }
}

export const HKOpenBankingService = new HKOpenBanking();