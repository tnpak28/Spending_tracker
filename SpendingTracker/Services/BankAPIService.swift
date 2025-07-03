import Foundation
import Combine

// MARK: - Models

struct BankAccount: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    let balance: Double
    let currency: String
    let lastSyncDate: Date?
}

struct BankTransaction: Codable, Identifiable {
    let id: String
    let accountId: String
    let amount: Double
    let description: String
    let date: Date
    let category: String?
    let merchantName: String?
    let pending: Bool
}

struct PlaidLinkToken: Codable {
    let linkToken: String
    let expiration: Date
}

// MARK: - Bank API Service

class BankAPIService: ObservableObject {
    @Published var connectedAccounts: [BankAccount] = []
    @Published var isConnecting = false
    @Published var lastSyncDate: Date?
    
    private let apiKey = "your-plaid-api-key" // In real app, store securely
    private let baseURL = "https://production.plaid.com" // Use sandbox for testing
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Account Connection
    
    func createLinkToken() async throws -> PlaidLinkToken {
        let url = URL(string: "\(baseURL)/link/token/create")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(apiKey, forHTTPHeaderField: "Authorization")
        
        let body = [
            "client_name": "Spending Tracker",
            "country_codes": ["US"],
            "language": "en",
            "user": [
                "client_user_id": "user-\(UUID().uuidString)"
            ],
            "products": ["transactions"]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(PlaidLinkToken.self, from: data)
        
        return response
    }
    
    func exchangePublicToken(_ publicToken: String) async throws -> String {
        let url = URL(string: "\(baseURL)/item/public_token/exchange")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(apiKey, forHTTPHeaderField: "Authorization")
        
        let body = [
            "public_token": publicToken
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
           let accessToken = json["access_token"] as? String {
            return accessToken
        }
        
        throw BankAPIError.invalidResponse
    }
    
    func connectBank(accessToken: String) async throws {
        DispatchQueue.main.async {
            self.isConnecting = true
        }
        
        defer {
            DispatchQueue.main.async {
                self.isConnecting = false
            }
        }
        
        // Fetch accounts
        let accounts = try await fetchAccounts(accessToken: accessToken)
        
        DispatchQueue.main.async {
            self.connectedAccounts = accounts
        }
        
        // Store access token securely (use Keychain in real app)
        UserDefaults.standard.set(accessToken, forKey: "bank_access_token")
    }
    
    // MARK: - Account Management
    
    func fetchAccounts(accessToken: String) async throws -> [BankAccount] {
        let url = URL(string: "\(baseURL)/accounts/get")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(apiKey, forHTTPHeaderField: "Authorization")
        
        let body = [
            "access_token": accessToken
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
           let accountsData = json["accounts"] as? [[String: Any]] {
            
            return accountsData.compactMap { accountData in
                guard let accountId = accountData["account_id"] as? String,
                      let name = accountData["name"] as? String,
                      let type = accountData["type"] as? String,
                      let balances = accountData["balances"] as? [String: Any],
                      let current = balances["current"] as? Double else {
                    return nil
                }
                
                return BankAccount(
                    id: accountId,
                    name: name,
                    type: type,
                    balance: current,
                    currency: "USD",
                    lastSyncDate: Date()
                )
            }
        }
        
        throw BankAPIError.invalidResponse
    }
    
    // MARK: - Transaction Sync
    
    func syncTransactions() async throws -> [BankTransaction] {
        guard let accessToken = UserDefaults.standard.string(forKey: "bank_access_token") else {
            throw BankAPIError.noAccessToken
        }
        
        let transactions = try await fetchTransactions(accessToken: accessToken)
        
        DispatchQueue.main.async {
            self.lastSyncDate = Date()
        }
        
        return transactions
    }
    
    func fetchTransactions(accessToken: String, startDate: Date? = nil, endDate: Date? = nil) async throws -> [BankTransaction] {
        let url = URL(string: "\(baseURL)/transactions/get")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(apiKey, forHTTPHeaderField: "Authorization")
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        let start = startDate ?? Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        let end = endDate ?? Date()
        
        let body: [String: Any] = [
            "access_token": accessToken,
            "start_date": formatter.string(from: start),
            "end_date": formatter.string(from: end)
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
           let transactionsData = json["transactions"] as? [[String: Any]] {
            
            return transactionsData.compactMap { transactionData in
                guard let transactionId = transactionData["transaction_id"] as? String,
                      let accountId = transactionData["account_id"] as? String,
                      let amount = transactionData["amount"] as? Double,
                      let name = transactionData["name"] as? String,
                      let dateString = transactionData["date"] as? String else {
                    return nil
                }
                
                let date = formatter.date(from: dateString) ?? Date()
                let categories = transactionData["category"] as? [String]
                let merchantName = transactionData["merchant_name"] as? String
                let pending = transactionData["pending"] as? Bool ?? false
                
                return BankTransaction(
                    id: transactionId,
                    accountId: accountId,
                    amount: abs(amount), // Plaid returns negative amounts for expenses
                    description: name,
                    date: date,
                    category: categories?.first,
                    merchantName: merchantName,
                    pending: pending
                )
            }
        }
        
        throw BankAPIError.invalidResponse
    }
    
    // MARK: - Category Mapping
    
    func mapPlaidCategoryToApp(_ plaidCategory: String?) -> String {
        guard let category = plaidCategory?.lowercased() else { return "Other" }
        
        let categoryMappings: [String: String] = [
            "food and drink": "Food & Dining",
            "restaurants": "Food & Dining",
            "fast food": "Food & Dining",
            "coffee shops": "Food & Dining",
            
            "transportation": "Transportation",
            "gas stations": "Transportation",
            "taxi": "Transportation",
            "public transportation": "Transportation",
            
            "shops": "Shopping",
            "department stores": "Shopping",
            "clothing stores": "Shopping",
            "online marketplaces": "Shopping",
            
            "entertainment": "Entertainment",
            "movie theaters": "Entertainment",
            "music": "Entertainment",
            "gyms and fitness centers": "Health & Fitness",
            
            "healthcare": "Health & Fitness",
            "pharmacies": "Health & Fitness",
            
            "utilities": "Bills & Utilities",
            "telecommunication services": "Bills & Utilities",
            "internet": "Bills & Utilities"
        ]
        
        for (plaidCat, appCat) in categoryMappings {
            if category.contains(plaidCat) {
                return appCat
            }
        }
        
        return "Other"
    }
    
    // MARK: - Account Disconnection
    
    func disconnectAccount(_ accountId: String) async throws {
        // In a real app, you would call Plaid's remove endpoint
        DispatchQueue.main.async {
            self.connectedAccounts.removeAll { $0.id == accountId }
        }
    }
    
    func disconnectAllAccounts() async throws {
        // Remove stored access token
        UserDefaults.standard.removeObject(forKey: "bank_access_token")
        
        DispatchQueue.main.async {
            self.connectedAccounts.removeAll()
            self.lastSyncDate = nil
        }
    }
}

// MARK: - Errors

enum BankAPIError: LocalizedError {
    case noAccessToken
    case invalidResponse
    case networkError
    case authenticationFailed
    
    var errorDescription: String? {
        switch self {
        case .noAccessToken:
            return "No bank account connected"
        case .invalidResponse:
            return "Invalid response from bank API"
        case .networkError:
            return "Network connection error"
        case .authenticationFailed:
            return "Bank authentication failed"
        }
    }
}

// MARK: - Mock Implementation for Development

extension BankAPIService {
    func loadMockData() {
        let mockAccounts = [
            BankAccount(
                id: "mock-checking-1",
                name: "Chase Checking",
                type: "checking",
                balance: 2456.78,
                currency: "USD",
                lastSyncDate: Date()
            ),
            BankAccount(
                id: "mock-savings-1",
                name: "Chase Savings",
                type: "savings",
                balance: 15234.50,
                currency: "USD",
                lastSyncDate: Date()
            )
        ]
        
        DispatchQueue.main.async {
            self.connectedAccounts = mockAccounts
            self.lastSyncDate = Date()
        }
    }
    
    func getMockTransactions() -> [BankTransaction] {
        return [
            BankTransaction(
                id: "mock-1",
                accountId: "mock-checking-1",
                amount: 4.95,
                description: "Starbucks Coffee",
                date: Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date(),
                category: "Food & Dining",
                merchantName: "Starbucks",
                pending: false
            ),
            BankTransaction(
                id: "mock-2",
                accountId: "mock-checking-1",
                amount: 67.43,
                description: "Shell Gas Station",
                date: Calendar.current.date(byAdding: .day, value: -2, to: Date()) ?? Date(),
                category: "Transportation",
                merchantName: "Shell",
                pending: false
            ),
            BankTransaction(
                id: "mock-3",
                accountId: "mock-checking-1",
                amount: 23.99,
                description: "Netflix Subscription",
                date: Calendar.current.date(byAdding: .day, value: -3, to: Date()) ?? Date(),
                category: "Entertainment",
                merchantName: "Netflix",
                pending: false
            )
        ]
    }
}