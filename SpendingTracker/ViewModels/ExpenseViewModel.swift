import Foundation
import CoreData
import Combine

@MainActor
class ExpenseViewModel: ObservableObject {
    @Published var expenses: [Expense] = []
    @Published var recurringExpenseDetector = RecurringExpenseDetector()
    
    var managedObjectContext: NSManagedObjectContext?
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Initialize with empty state
    }
    
    func loadExpenses() {
        guard let context = managedObjectContext else { return }
        
        let request: NSFetchRequest<Expense> = Expense.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(keyPath: \Expense.date, ascending: false)]
        
        do {
            expenses = try context.fetch(request)
        } catch {
            print("Error loading expenses: \(error)")
        }
    }
    
    func addExpense(amount: Double, title: String, category: String, date: Date, notes: String?, isRecurring: Bool, source: String) {
        guard let context = managedObjectContext else { return }
        
        let expense = Expense(context: context)
        expense.id = UUID()
        expense.amount = amount
        expense.title = title
        expense.category = category
        expense.date = date
        expense.notes = notes
        expense.isRecurring = isRecurring
        expense.source = source
        
        do {
            try context.save()
            loadExpenses()
            
            // Check for recurring patterns
            Task {
                await checkForRecurringPattern(expense: expense)
            }
        } catch {
            print("Error saving expense: \(error)")
        }
    }
    
    func deleteExpense(_ expense: Expense) {
        guard let context = managedObjectContext else { return }
        
        context.delete(expense)
        
        do {
            try context.save()
            loadExpenses()
        } catch {
            print("Error deleting expense: \(error)")
        }
    }
    
    func updateExpense(_ expense: Expense) {
        guard let context = managedObjectContext else { return }
        
        do {
            try context.save()
            loadExpenses()
        } catch {
            print("Error updating expense: \(error)")
        }
    }
    
    // MARK: - Analytics
    
    func getTotalSpending(for timeframe: Calendar.Component, count: Int = 1) -> Double {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: timeframe, value: -count, to: Date()) ?? Date()
        
        return expenses
            .filter { ($0.date ?? Date()) >= startDate }
            .reduce(0) { $0 + $1.amount }
    }
    
    func getSpendingByCategory(for timeframe: Calendar.Component, count: Int = 1) -> [String: Double] {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: timeframe, value: -count, to: Date()) ?? Date()
        
        let filteredExpenses = expenses.filter { ($0.date ?? Date()) >= startDate }
        
        return Dictionary(grouping: filteredExpenses) { $0.category ?? "Other" }
            .mapValues { $0.reduce(0) { $0 + $1.amount } }
    }
    
    func getDailySpending(for days: Int = 30) -> [Date: Double] {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        
        let filteredExpenses = expenses.filter { ($0.date ?? Date()) >= startDate }
        
        return Dictionary(grouping: filteredExpenses) { expense in
            calendar.startOfDay(for: expense.date ?? Date())
        }.mapValues { $0.reduce(0) { $0 + $1.amount } }
    }
    
    func getAverageSpending(for timeframe: Calendar.Component, count: Int = 1) -> Double {
        let total = getTotalSpending(for: timeframe, count: count)
        
        switch timeframe {
        case .day:
            return total / Double(count)
        case .weekOfYear:
            return total / Double(count * 7)
        case .month:
            return total / Double(count * 30) // Approximate
        case .year:
            return total / Double(count * 365)
        default:
            return total
        }
    }
    
    // MARK: - Recurring Expense Detection
    
    func checkForRecurringPattern(expense: Expense) async {
        await recurringExpenseDetector.analyzeExpenseForPatterns(expense, allExpenses: expenses)
    }
    
    func getRecurringExpenses() -> [Expense] {
        return expenses.filter { $0.isRecurring }
    }
    
    func getSuggestedRecurringExpenses() -> [Expense] {
        return recurringExpenseDetector.getSuggestedRecurring(from: expenses)
    }
    
    // MARK: - Import/Export
    
    func importExpensesFromCSV(_ csvContent: String) {
        guard let context = managedObjectContext else { return }
        
        let lines = csvContent.components(separatedBy: .newlines)
        guard lines.count > 1 else { return }
        
        // Skip header row
        for line in lines.dropFirst() {
            let components = line.components(separatedBy: ",")
            guard components.count >= 4 else { continue }
            
            let expense = Expense(context: context)
            expense.id = UUID()
            expense.amount = Double(components[0]) ?? 0.0
            expense.title = components[1]
            expense.category = components[2]
            expense.date = ISO8601DateFormatter().date(from: components[3]) ?? Date()
            expense.notes = components.count > 4 ? components[4] : nil
            expense.isRecurring = false
            expense.source = "import"
        }
        
        do {
            try context.save()
            loadExpenses()
        } catch {
            print("Error importing expenses: \(error)")
        }
    }
    
    func exportExpensesToCSV() -> String {
        var csv = "Amount,Title,Category,Date,Notes\n"
        
        for expense in expenses {
            let dateString = ISO8601DateFormatter().string(from: expense.date ?? Date())
            let notes = expense.notes?.replacingOccurrences(of: ",", with: ";") ?? ""
            csv += "\(expense.amount),\(expense.title ?? ""),\(expense.category ?? ""),\(dateString),\(notes)\n"
        }
        
        return csv
    }
    
    // MARK: - Search and Filter
    
    func searchExpenses(query: String) -> [Expense] {
        guard !query.isEmpty else { return expenses }
        
        return expenses.filter { expense in
            let titleMatch = expense.title?.localizedCaseInsensitiveContains(query) ?? false
            let categoryMatch = expense.category?.localizedCaseInsensitiveContains(query) ?? false
            let notesMatch = expense.notes?.localizedCaseInsensitiveContains(query) ?? false
            
            return titleMatch || categoryMatch || notesMatch
        }
    }
    
    func filterExpenses(category: String?, minAmount: Double?, maxAmount: Double?, startDate: Date?, endDate: Date?) -> [Expense] {
        return expenses.filter { expense in
            if let category = category, expense.category != category {
                return false
            }
            
            if let minAmount = minAmount, expense.amount < minAmount {
                return false
            }
            
            if let maxAmount = maxAmount, expense.amount > maxAmount {
                return false
            }
            
            if let startDate = startDate, let expenseDate = expense.date, expenseDate < startDate {
                return false
            }
            
            if let endDate = endDate, let expenseDate = expense.date, expenseDate > endDate {
                return false
            }
            
            return true
        }
    }
}