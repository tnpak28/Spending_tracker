import SwiftUI
import CoreData

struct ContentView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @StateObject private var expenseViewModel = ExpenseViewModel()
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home/Dashboard Tab
            DashboardView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
            
            // Add Expense Tab
            AddExpenseView()
                .tabItem {
                    Image(systemName: "plus.circle.fill")
                    Text("Add")
                }
                .tag(1)
            
            // Analytics Tab
            AnalyticsView()
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("Analytics")
                }
                .tag(2)
            
            // Settings Tab
            SettingsView()
                .tabItem {
                    Image(systemName: "gear.circle.fill")
                    Text("Settings")
                }
                .tag(3)
        }
        .environmentObject(expenseViewModel)
        .onAppear {
            expenseViewModel.managedObjectContext = viewContext
        }
    }
}

struct DashboardView: View {
    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Expense.date, ascending: false)],
        predicate: NSPredicate(format: "date >= %@", Calendar.current.startOfDay(for: Date()) as NSDate)
    ) private var todayExpenses: FetchedResults<Expense>
    
    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Expense.date, ascending: false)],
        animation: .default
    ) private var recentExpenses: FetchedResults<Expense>
    
    var todayTotal: Double {
        todayExpenses.reduce(0) { $0 + $1.amount }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Today's Summary Card
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Today's Spending")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(Date(), style: .date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("$\(todayTotal, specifier: "%.2f")")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        Text("\(todayExpenses.count) transactions")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                    
                    // Quick Actions
                    HStack(spacing: 15) {
                        QuickActionButton(
                            title: "Add Expense",
                            icon: "plus.circle",
                            color: .blue
                        ) {
                            // Handle add expense
                        }
                        
                        QuickActionButton(
                            title: "Voice Input",
                            icon: "mic.circle",
                            color: .green
                        ) {
                            // Handle voice input
                        }
                        
                        QuickActionButton(
                            title: "Sync Banks",
                            icon: "arrow.triangle.2.circlepath",
                            color: .orange
                        ) {
                            // Handle bank sync
                        }
                    }
                    
                    // Recent Expenses
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Expenses")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        LazyVStack(spacing: 8) {
                            ForEach(Array(recentExpenses.prefix(5)), id: \.id) { expense in
                                ExpenseRowView(expense: expense)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding()
            }
            .navigationTitle("Spending Tracker")
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
    }
}

struct ExpenseRowView: View {
    let expense: Expense
    
    var body: some View {
        HStack {
            // Category Icon
            Image(systemName: categoryIcon(for: expense.category ?? "other"))
                .font(.title2)
                .foregroundColor(categoryColor(for: expense.category ?? "other"))
                .frame(width: 40, height: 40)
                .background(categoryColor(for: expense.category ?? "other").opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(expense.title ?? "Unknown")
                    .font(.body)
                    .fontWeight(.medium)
                
                HStack {
                    Text(expense.category ?? "Other")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if expense.isRecurring {
                        Image(systemName: "repeat")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    Spacer()
                    
                    Text(expense.date ?? Date(), style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Text("$\(expense.amount, specifier: "%.2f")")
                .font(.body)
                .fontWeight(.semibold)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
    
    private func categoryIcon(for category: String) -> String {
        switch category.lowercased() {
        case "food & dining", "food":
            return "fork.knife"
        case "transportation", "transport":
            return "car.fill"
        case "shopping":
            return "bag.fill"
        case "entertainment":
            return "tv.fill"
        case "health & fitness", "health":
            return "heart.fill"
        case "bills & utilities", "bills":
            return "doc.text.fill"
        default:
            return "dollarsign.circle.fill"
        }
    }
    
    private func categoryColor(for category: String) -> Color {
        switch category.lowercased() {
        case "food & dining", "food":
            return .orange
        case "transportation", "transport":
            return .blue
        case "shopping":
            return .pink
        case "entertainment":
            return .purple
        case "health & fitness", "health":
            return .red
        case "bills & utilities", "bills":
            return .green
        default:
            return .gray
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var expenseViewModel: ExpenseViewModel
    
    var body: some View {
        NavigationView {
            List {
                Section("Bank Integration") {
                    Button("Connect Bank Account") {
                        // Handle bank connection
                    }
                    
                    Button("Sync Transactions") {
                        // Handle sync
                    }
                }
                
                Section("Data Management") {
                    Button("Import from CSV") {
                        // Handle CSV import
                    }
                    
                    Button("Export Data") {
                        // Handle data export
                    }
                }
                
                Section("Notifications") {
                    Toggle("Spending Alerts", isOn: .constant(true))
                    Toggle("Weekly Reports", isOn: .constant(false))
                }
                
                Section("About") {
                    Text("Version 1.0")
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    ContentView().environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}