import Foundation
import CoreData

class RecurringExpenseDetector: ObservableObject {
    @Published var detectedPatterns: [RecurringPattern] = []
    @Published var suggestions: [RecurringSuggestion] = []
    
    // MARK: - Pattern Detection
    
    func analyzeExpenseForPatterns(_ expense: Expense, allExpenses: [Expense]) async {
        let similarExpenses = findSimilarExpenses(to: expense, in: allExpenses)
        
        if similarExpenses.count >= 2 { // Need at least 3 total (including current)
            let pattern = detectPattern(for: expense, similarExpenses: similarExpenses)
            
            if let pattern = pattern {
                await MainActor.run {
                    if !detectedPatterns.contains(where: { $0.id == pattern.id }) {
                        detectedPatterns.append(pattern)
                    }
                    
                    // Create suggestion if not already marked as recurring
                    if !expense.isRecurring {
                        let suggestion = RecurringSuggestion(
                            expense: expense,
                            pattern: pattern,
                            confidence: pattern.confidence
                        )
                        suggestions.append(suggestion)
                    }
                }
            }
        }
    }
    
    private func findSimilarExpenses(to expense: Expense, in allExpenses: [Expense]) -> [Expense] {
        let threshold: Double = 0.8 // 80% similarity threshold
        
        return allExpenses.filter { otherExpense in
            guard otherExpense.id != expense.id else { return false }
            
            let similarity = calculateSimilarity(expense, otherExpense)
            return similarity >= threshold
        }
    }
    
    private func calculateSimilarity(_ expense1: Expense, _ expense2: Expense) -> Double {
        var similarityScore: Double = 0
        var totalWeight: Double = 0
        
        // Amount similarity (weight: 40%)
        let amountWeight: Double = 0.4
        let amountDifference = abs(expense1.amount - expense2.amount)
        let maxAmount = max(expense1.amount, expense2.amount)
        let amountSimilarity = maxAmount > 0 ? 1 - (amountDifference / maxAmount) : 1
        similarityScore += amountSimilarity * amountWeight
        totalWeight += amountWeight
        
        // Title similarity (weight: 35%)
        let titleWeight: Double = 0.35
        let titleSimilarity = stringSimilarity(expense1.title ?? "", expense2.title ?? "")
        similarityScore += titleSimilarity * titleWeight
        totalWeight += titleWeight
        
        // Category similarity (weight: 25%)
        let categoryWeight: Double = 0.25
        let categorySimilarity = (expense1.category == expense2.category) ? 1.0 : 0.0
        similarityScore += categorySimilarity * categoryWeight
        totalWeight += categoryWeight
        
        return totalWeight > 0 ? similarityScore / totalWeight : 0
    }
    
    private func stringSimilarity(_ str1: String, _ str2: String) -> Double {
        guard !str1.isEmpty && !str2.isEmpty else { return str1.isEmpty && str2.isEmpty ? 1.0 : 0.0 }
        
        let longer = str1.count > str2.count ? str1 : str2
        let shorter = str1.count > str2.count ? str2 : str1
        
        let editDistance = levenshteinDistance(shorter, longer)
        return 1.0 - Double(editDistance) / Double(longer.count)
    }
    
    private func levenshteinDistance(_ str1: String, _ str2: String) -> Int {
        let str1Array = Array(str1)
        let str2Array = Array(str2)
        
        let m = str1Array.count
        let n = str2Array.count
        
        var dp = Array(repeating: Array(repeating: 0, count: n + 1), count: m + 1)
        
        for i in 0...m {
            dp[i][0] = i
        }
        
        for j in 0...n {
            dp[0][j] = j
        }
        
        for i in 1...m {
            for j in 1...n {
                if str1Array[i-1] == str2Array[j-1] {
                    dp[i][j] = dp[i-1][j-1]
                } else {
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
                }
            }
        }
        
        return dp[m][n]
    }
    
    private func detectPattern(for expense: Expense, similarExpenses: [Expense]) -> RecurringPattern? {
        let allExpenses = [expense] + similarExpenses
        let sortedExpenses = allExpenses.sorted { ($0.date ?? Date()) < ($1.date ?? Date()) }
        
        guard sortedExpenses.count >= 2 else { return nil }
        
        let intervals = calculateIntervals(sortedExpenses)
        let (frequency, confidence) = determineFrequency(from: intervals)
        
        guard confidence > 0.6 else { return nil } // Minimum confidence threshold
        
        return RecurringPattern(
            id: UUID(),
            title: expense.title ?? "Unknown",
            category: expense.category ?? "Other",
            averageAmount: calculateAverageAmount(sortedExpenses),
            frequency: frequency,
            confidence: confidence,
            lastOccurrence: sortedExpenses.last?.date ?? Date(),
            nextPredicted: predictNextOccurrence(from: sortedExpenses, frequency: frequency)
        )
    }
    
    private func calculateIntervals(_ expenses: [Expense]) -> [TimeInterval] {
        var intervals: [TimeInterval] = []
        
        for i in 1..<expenses.count {
            if let prevDate = expenses[i-1].date, let currentDate = expenses[i].date {
                intervals.append(currentDate.timeIntervalSince(prevDate))
            }
        }
        
        return intervals
    }
    
    private func determineFrequency(from intervals: [TimeInterval]) -> (RecurringFrequency, Double) {
        guard !intervals.isEmpty else { return (.unknown, 0.0) }
        
        let averageInterval = intervals.reduce(0, +) / Double(intervals.count)
        let dayInterval = averageInterval / (24 * 60 * 60) // Convert to days
        
        // Calculate variance to determine confidence
        let variance = intervals.map { pow($0 - averageInterval, 2) }.reduce(0, +) / Double(intervals.count)
        let standardDeviation = sqrt(variance)
        let coefficientOfVariation = standardDeviation / averageInterval
        
        // Lower coefficient of variation = higher confidence
        let confidence = max(0.0, 1.0 - coefficientOfVariation)
        
        // Determine frequency based on average interval
        let frequency: RecurringFrequency
        
        switch dayInterval {
        case 0..<2:
            frequency = .daily
        case 6...8:
            frequency = .weekly
        case 13...17:
            frequency = .biweekly
        case 28...32:
            frequency = .monthly
        case 88...95:
            frequency = .quarterly
        case 360...370:
            frequency = .yearly
        default:
            frequency = .unknown
        }
        
        return (frequency, confidence)
    }
    
    private func calculateAverageAmount(_ expenses: [Expense]) -> Double {
        let total = expenses.reduce(0) { $0 + $1.amount }
        return total / Double(expenses.count)
    }
    
    private func predictNextOccurrence(from expenses: [Expense], frequency: RecurringFrequency) -> Date? {
        guard let lastDate = expenses.last?.date else { return nil }
        
        let calendar = Calendar.current
        
        switch frequency {
        case .daily:
            return calendar.date(byAdding: .day, value: 1, to: lastDate)
        case .weekly:
            return calendar.date(byAdding: .day, value: 7, to: lastDate)
        case .biweekly:
            return calendar.date(byAdding: .day, value: 14, to: lastDate)
        case .monthly:
            return calendar.date(byAdding: .month, value: 1, to: lastDate)
        case .quarterly:
            return calendar.date(byAdding: .month, value: 3, to: lastDate)
        case .yearly:
            return calendar.date(byAdding: .year, value: 1, to: lastDate)
        case .unknown:
            return nil
        }
    }
    
    // MARK: - Public Methods
    
    func getSuggestedRecurring(from expenses: [Expense]) -> [Expense] {
        return suggestions.map { $0.expense }
    }
    
    func markAsRecurring(_ expense: Expense) {
        // Remove from suggestions
        suggestions.removeAll { $0.expense.id == expense.id }
        
        // Mark the expense as recurring
        expense.isRecurring = true
    }
    
    func dismissSuggestion(_ suggestion: RecurringSuggestion) {
        suggestions.removeAll { $0.id == suggestion.id }
    }
    
    func getUpcomingRecurring() -> [RecurringPattern] {
        let now = Date()
        let nextWeek = Calendar.current.date(byAdding: .day, value: 7, to: now) ?? now
        
        return detectedPatterns.filter { pattern in
            guard let nextDate = pattern.nextPredicted else { return false }
            return nextDate >= now && nextDate <= nextWeek
        }.sorted { pattern1, pattern2 in
            (pattern1.nextPredicted ?? Date.distantFuture) < (pattern2.nextPredicted ?? Date.distantFuture)
        }
    }
}

// MARK: - Supporting Models

struct RecurringPattern: Identifiable {
    let id: UUID
    let title: String
    let category: String
    let averageAmount: Double
    let frequency: RecurringFrequency
    let confidence: Double
    let lastOccurrence: Date
    let nextPredicted: Date?
}

struct RecurringSuggestion: Identifiable {
    let id = UUID()
    let expense: Expense
    let pattern: RecurringPattern
    let confidence: Double
}

enum RecurringFrequency: String, CaseIterable {
    case daily = "Daily"
    case weekly = "Weekly"
    case biweekly = "Bi-weekly"
    case monthly = "Monthly"
    case quarterly = "Quarterly"
    case yearly = "Yearly"
    case unknown = "Unknown"
    
    var description: String {
        return rawValue
    }
}