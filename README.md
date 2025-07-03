# Spending Tracker HK 🏦💰

A comprehensive React Native spending tracker app designed for Hong Kong users, featuring automatic bank integration via Open Banking APIs, voice input capabilities, and intelligent expense analytics.

## 🌟 Features

### 🏦 **Hong Kong Open Banking Integration**
- Connect multiple bank accounts (HSBC, Bank of China HK, Standard Chartered, etc.)
- Automatic transaction import and categorization
- Real-time balance updates
- Secure OAuth 2.0 authentication with PKCE
- Support for HKD and multi-currency accounts

### �️ **Voice Input & AI Processing**
- Hands-free expense entry using speech recognition
- Natural language processing to extract amounts, descriptions, and categories
- Smart parsing of Hong Kong-specific merchants and locations
- Confidence scoring and automatic form filling
- Text-to-speech feedback for accessibility

### 📊 **Advanced Analytics & Insights**
- Interactive charts showing spending trends
- Month-over-month and year-over-year comparisons
- Category breakdown with customizable pie charts
- Daily, weekly, monthly, and yearly views
- Intelligent spending insights and budget recommendations

### 🔄 **Recurring Expense Detection**
- Automatic identification of subscription services
- Pattern recognition for regular bills and payments
- Confidence-based duplicate detection
- Proactive notifications for upcoming recurring expenses

### 📱 **Modern Cross-Platform UI**
- Built with React Native and Expo for iOS and Android
- Material Design 3 components via React Native Paper
- Dark/light theme support
- Responsive design for phones and tablets
- Smooth animations and transitions

### 💾 **Data Management**
- Local SQLite database for offline functionality
- CSV import/export capabilities
- Data backup and restore
- Seamless sync across devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (macOS) or Android Studio (for emulators)
- Expo Go app on your physical device (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/spending-tracker-hk.git
   cd spending-tracker-hk
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Hong Kong Open Banking credentials:
   ```env
   EXPO_PUBLIC_HK_OPEN_BANKING_CLIENT_ID=your_client_id_here
   EXPO_PUBLIC_HK_OPEN_BANKING_CLIENT_SECRET=your_client_secret_here
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/emulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🏗️ Project Structure

```
spending-tracker-hk/
├── App.tsx                     # Main app entry point
├── app.json                    # Expo configuration
├── package.json               # Dependencies and scripts
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── DashboardScreen.tsx
│   │   ├── AddExpenseScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/             # Business logic and APIs
│   │   ├── DatabaseService.ts
│   │   ├── HKOpenBankingService.ts
│   │   └── VoiceInputService.ts
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   └── theme.ts              # App theming and styles
└── assets/                   # Images, icons, and fonts
```

## 🏦 Hong Kong Open Banking Setup

### Supported Banks
- HSBC Hong Kong
- Bank of China (Hong Kong)
- Standard Chartered Hong Kong
- Hang Seng Bank
- DBS Bank (Hong Kong)
- Citibank Hong Kong

### Getting API Credentials

1. **Register as a Third Party Provider (TPP)**
   - Apply through the Hong Kong Monetary Authority (HKMA)
   - Complete regulatory requirements and testing
   - Obtain API credentials from participating banks

2. **Development & Testing**
   - Use sandbox environments provided by each bank
   - Test with mock accounts and transactions
   - Validate OAuth 2.0 flows and API integrations

3. **Production Deployment**
   - Complete security assessments
   - Obtain production API keys
   - Implement proper error handling and monitoring

### Configuration

Update `src/services/HKOpenBankingService.ts` with your credentials:

```typescript
this.config = {
  clientId: process.env.EXPO_PUBLIC_HK_OPEN_BANKING_CLIENT_ID,
  clientSecret: process.env.EXPO_PUBLIC_HK_OPEN_BANKING_CLIENT_SECRET,
  redirectUri: 'spendingtracker://auth/callback',
  scopes: ['accounts', 'balances', 'transactions'],
  environment: 'sandbox', // Change to 'production' for live
};
```

## 🎙️ Voice Input Configuration

### Speech Recognition Setup

The app uses platform-native speech recognition:

- **iOS**: Apple's SFSpeechRecognizer
- **Android**: Google Speech Recognition API

### Supported Voice Commands

```
"I spent 25 dollars on coffee at Starbucks"
"Paid 150 HKD for groceries at PARKnSHOP"
"Transportation 45 dollars for taxi"
"Netflix subscription 99 dollars monthly"
"Gas station 200 HKD for fuel"
```

### Customization

Modify `src/services/VoiceInputService.ts` to:
- Add Hong Kong-specific merchant recognition
- Support Cantonese voice input
- Integrate with cloud speech APIs for better accuracy

## 📊 Analytics & Insights

### Chart Types
- **Line Charts**: Daily spending trends
- **Pie Charts**: Category breakdowns
- **Bar Charts**: Monthly comparisons
- **Heatmaps**: Spending patterns by day/time

### Smart Insights
- Spending pattern analysis
- Budget recommendations
- Unusual spending alerts
- Recurring expense identification

## 🔧 Customization

### Adding New Categories

Edit the default categories in `src/services/DatabaseService.ts`:

```typescript
const defaultCategories = [
  { id: '10', name: 'Dim Sum', icon: 'restaurant', color: '#FF5722', isDefault: 1 },
  { id: '11', name: 'MTR/Transport', icon: 'train', color: '#607D8B', isDefault: 1 },
  // Add more Hong Kong-specific categories
];
```

### Theme Customization

Modify `src/theme.ts` to match your brand:

```typescript
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',      // Your primary color
    secondary: '#FF9800',    // Your secondary color
    // Customize other colors
  },
};
```

### Language Localization

The app can be extended to support multiple languages:

1. Install react-native-localize
2. Create translation files for English, Traditional Chinese, Simplified Chinese
3. Update UI strings to use translation keys

## 🔒 Security & Privacy

### Data Protection
- All sensitive data encrypted with AES-256
- Bank credentials stored in platform secure storage
- Local SQLite database with encryption
- No sensitive data transmitted to third-party analytics

### Privacy Compliance
- GDPR compliant data handling
- Hong Kong Privacy Ordinance compliance
- User consent for data collection
- Right to data deletion and export

### Security Best Practices
- Certificate pinning for API calls
- Biometric authentication support
- Automatic session timeout
- Secure deep linking for OAuth callbacks

## 🧪 Testing

### Running Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests (requires device/emulator)
npm run test:e2e
```

### Test Coverage
- Unit tests for all services and utilities
- Integration tests for database operations
- E2E tests for critical user flows
- Mock implementations for external APIs

## 📦 Building & Deployment

### Building for Production

1. **iOS Build**
   ```bash
   eas build --platform ios
   ```

2. **Android Build**
   ```bash
   eas build --platform android
   ```

3. **Web Build**
   ```bash
   npx expo export:web
   ```

### App Store Deployment

1. Configure app.json with store metadata
2. Generate app icons and splash screens
3. Set up EAS Build and Submit
4. Follow platform-specific review guidelines

### Environment Configuration

Create environment-specific configurations:

```bash
# Development
npx expo start --dev-client

# Staging
npx expo start --config app.staging.json

# Production
npx expo start --config app.production.json
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Architecture Guide](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🐛 Troubleshooting

### Common Issues

**Voice Input Not Working**
- Check microphone permissions in device settings
- Ensure internet connection for cloud speech recognition
- Try restarting the app

**Bank Connection Failed**
- Verify API credentials are correct
- Check if bank's API service is operational
- Ensure redirect URI matches configuration

**App Crashes on Start**
- Clear app data and cache
- Reinstall the app
- Check device compatibility

### Debug Mode

Enable debug logging:

```typescript
// In App.tsx
if (__DEV__) {
  console.log('Debug mode enabled');
  // Enable additional logging
}
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Hong Kong Monetary Authority for Open Banking standards
- Expo team for the excellent development platform
- React Native Paper for beautiful UI components
- The open-source community for amazing libraries

## 📞 Support

- **Email**: support@spendingtracker-hk.com
- **GitHub Issues**: [Create an issue](https://github.com/yourusername/spending-tracker-hk/issues)
- **Discord**: [Join our community](https://discord.gg/spendingtracker)
- **Documentation**: [Full docs](https://docs.spendingtracker-hk.com)

---

**Made with ❤️ for Hong Kong** 🇭🇰

*Spending Tracker HK - Take control of your finances with the power of Open Banking and AI*