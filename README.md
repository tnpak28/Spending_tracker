# Spending Tracker iOS App

A comprehensive iOS application for tracking personal expenses with advanced features including bank integration, voice input, analytics, and recurring expense detection.

## Features

### 🏦 Bank Integration
- Connect multiple bank accounts using Plaid API
- Automatic transaction synchronization
- Real-time balance updates
- Secure data handling

### 🎤 Voice Input
- Add expenses using voice commands
- Natural language processing for expense details
- Automatic category detection
- Hands-free expense entry

### 📊 Analytics & Insights
- Interactive charts and visualizations
- Month-to-month and year-to-year comparisons
- Spending trends and patterns
- Smart recommendations and insights

### 🔄 Recurring Expense Detection
- Automatic detection of recurring patterns
- Subscription and bill tracking
- Smart suggestions for recurring expenses
- Pattern confidence scoring

### 📱 Modern UI/UX
- SwiftUI-based modern interface
- Dark mode support
- Accessible design
- Intuitive navigation

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/spending-tracker.git
cd spending-tracker
```

2. Open the project in Xcode:
```bash
open SpendingTracker.xcodeproj
```

3. Install dependencies (if using SPM):
   - Charts framework is used for analytics visualizations
   - Core frameworks: SwiftUI, CoreData, Speech, AVFoundation

4. Configure Plaid API:
   - Sign up for a Plaid developer account at https://plaid.com/
   - Replace `your-plaid-api-key` in `BankAPIService.swift` with your actual API key
   - Update the base URL for sandbox/production environment

5. Build and run the project

## Configuration

### Plaid Integration
1. Create a Plaid developer account
2. Get your API keys (sandbox for development, production for release)
3. Update `BankAPIService.swift`:
```swift
private let apiKey = "your-actual-plaid-api-key"
private let baseURL = "https://sandbox.plaid.com" // or production.plaid.com
```

### Permissions
The app requires the following permissions:
- **Microphone**: For voice input functionality
- **Speech Recognition**: For converting speech to text

These permissions are already configured in `Info.plist` with appropriate usage descriptions.

## Architecture

### MVVM Pattern
- **Views**: SwiftUI views for UI components
- **ViewModels**: Business logic and state management
- **Models**: Core Data models and data structures
- **Services**: External API integrations and utilities

### Core Components

#### Views
- `ContentView.swift`: Main tab-based navigation
- `AddExpenseView.swift`: Expense entry with voice input
- `AnalyticsView.swift`: Charts and spending insights
- `DashboardView.swift`: Home screen with summaries

#### ViewModels
- `ExpenseViewModel.swift`: Manages expense data and operations

#### Services
- `BankAPIService.swift`: Plaid integration for bank connectivity
- `VoiceInputService.swift`: Speech recognition and processing
- `RecurringExpenseDetector.swift`: Pattern detection algorithms

#### Models
- Core Data model with `Expense` entity
- Supporting structures for charts and analytics

## Features in Detail

### Voice Input
The app supports natural language voice input for adding expenses:

Examples:
- "I spent 25 dollars on coffee at Starbucks"
- "Paid 67 bucks for gas at Shell"
- "Netflix subscription 15.99"

The system automatically extracts:
- Amount
- Description/Title
- Category (based on keywords)

### Recurring Expense Detection
The app uses advanced algorithms to detect recurring patterns:
- String similarity analysis (Levenshtein distance)
- Temporal pattern recognition
- Confidence scoring
- Smart suggestions

### Analytics
Comprehensive spending analysis including:
- Daily/Weekly/Monthly/Yearly views
- Category breakdowns
- Spending trends
- Comparison charts
- Smart insights and recommendations

### Bank Integration
Secure bank connectivity through Plaid:
- OAuth-based authentication
- Read-only access to transaction data
- Automatic categorization
- Multiple account support

## Data Security

- All sensitive data is stored locally using Core Data
- Bank credentials are handled securely through Plaid
- Voice data is processed locally and not stored
- No personal data is transmitted to external servers (except Plaid for bank integration)

## Development

### Adding New Features
1. Create feature branch
2. Implement following MVVM pattern
3. Add appropriate tests
4. Update documentation
5. Submit pull request

### Code Style
- Follow Swift API Design Guidelines
- Use SwiftLint for code formatting
- Maintain consistent naming conventions
- Document public APIs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## Roadmap

### Upcoming Features
- [ ] Budget setting and tracking
- [ ] Bill payment reminders
- [ ] Receipt photo capture and OCR
- [ ] Multi-currency support
- [ ] Export to various formats (PDF, Excel)
- [ ] Apple Watch integration
- [ ] Shared expense tracking
- [ ] Machine learning for better categorization

### Known Issues
- Mock bank data is used for development
- Some edge cases in voice processing may need refinement
- Pattern detection may require tuning for different users

## Acknowledgments

- Plaid for banking API integration
- Apple for SwiftUI and Core frameworks
- Community contributors and testers