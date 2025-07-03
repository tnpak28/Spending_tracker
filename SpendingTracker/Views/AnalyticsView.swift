import SwiftUI
import Charts
import CoreData

struct AnalyticsView: View {
    @Environment(\.managedObjectContext) private var viewContext
    
    @State private var selectedTimeframe: Timeframe = .month
    @State private var selectedChart: ChartType = .spending
    
    enum Timeframe: String, CaseIterable {
        case week = "Week"
        case month = "Month"
        case year = "Year"
    }
    
    enum ChartType: String, CaseIterable {
        case spending = "Spending"
        case category = "Categories"
        case trends = "Trends"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Time Period Selector
                    Picker("Timeframe", selection: $selectedTimeframe) {
                        ForEach(Timeframe.allCases, id: \.self) { timeframe in
                            Text(timeframe.rawValue).tag(timeframe)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)
                    
                    // Chart Type Selector
                    Picker("Chart Type", selection: $selectedChart) {
                        ForEach(ChartType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)
                    
                    // Summary Cards
                    SummaryCardsView(timeframe: selectedTimeframe)
                    
                    // Main Chart
                    Group {
                        switch selectedChart {
                        case .spending:
                            SpendingChartView(timeframe: selectedTimeframe)
                        case .category:
                            CategoryChartView(timeframe: selectedTimeframe)
                        case .trends:
                            TrendsChartView(timeframe: selectedTimeframe)
                        }
                    }
                    .frame(height: 300)
                    .padding(.horizontal)
                    
                    // Insights
                    InsightsView(timeframe: selectedTimeframe)
                }
                .padding(.vertical)
            }
            .navigationTitle("Analytics")
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct SummaryCardsView: View {
    let timeframe: AnalyticsView.Timeframe
    
    @FetchRequest private var expenses: FetchedResults<Expense>
    
    init(timeframe: AnalyticsView.Timeframe) {
        self.timeframe = timeframe
        
        let startDate: Date
        let calendar = Calendar.current
        
        switch timeframe {
        case .week:
            startDate = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        case .month:
            startDate = calendar.dateInterval(of: .month, for: Date())?.start ?? Date()
        case .year:
            startDate = calendar.dateInterval(of: .year, for: Date())?.start ?? Date()
        }
        
        _expenses = FetchRequest(
            sortDescriptors: [NSSortDescriptor(keyPath: \Expense.date, ascending: false)],
            predicate: NSPredicate(format: "date >= %@", startDate as NSDate)
        )
    }
    
    var totalSpent: Double {
        expenses.reduce(0) { $0 + $1.amount }
    }
    
    var averagePerDay: Double {
        let days = Calendar.current.dateComponents([.day], from: startDate, to: Date()).day ?? 1
        return totalSpent / Double(max(days, 1))
    }
    
    var transactionCount: Int {
        expenses.count
    }
    
    private var startDate: Date {
        let calendar = Calendar.current
        switch timeframe {
        case .week:
            return calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        case .month:
            return calendar.dateInterval(of: .month, for: Date())?.start ?? Date()
        case .year:
            return calendar.dateInterval(of: .year, for: Date())?.start ?? Date()
        }
    }
    
    var body: some View {
        HStack(spacing: 15) {
            SummaryCard(
                title: "Total Spent",
                value: "$\(totalSpent, specifier: "%.2f")",
                icon: "dollarsign.circle.fill",
                color: .blue
            )
            
            SummaryCard(
                title: "Daily Average",
                value: "$\(averagePerDay, specifier: "%.2f")",
                icon: "calendar.circle.fill",
                color: .green
            )
            
            SummaryCard(
                title: "Transactions",
                value: "\(transactionCount)",
                icon: "list.number",
                color: .orange
            )
        }
        .padding(.horizontal)
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

struct SpendingChartView: View {
    let timeframe: AnalyticsView.Timeframe
    
    @FetchRequest private var expenses: FetchedResults<Expense>
    
    init(timeframe: AnalyticsView.Timeframe) {
        self.timeframe = timeframe
        
        let startDate: Date
        let calendar = Calendar.current
        
        switch timeframe {
        case .week:
            startDate = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        case .month:
            startDate = calendar.dateInterval(of: .month, for: Date())?.start ?? Date()
        case .year:
            startDate = calendar.dateInterval(of: .year, for: Date())?.start ?? Date()
        }
        
        _expenses = FetchRequest(
            sortDescriptors: [NSSortDescriptor(keyPath: \Expense.date, ascending: true)],
            predicate: NSPredicate(format: "date >= %@", startDate as NSDate)
        )
    }
    
    private var chartData: [DailySpending] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: expenses) { expense in
            calendar.startOfDay(for: expense.date ?? Date())
        }
        
        return grouped.map { date, expenses in
            DailySpending(
                date: date,
                amount: expenses.reduce(0) { $0 + $1.amount }
            )
        }.sorted { $0.date < $1.date }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Daily Spending Trend")
                .font(.headline)
                .padding(.horizontal)
            
            Chart(chartData) { item in
                LineMark(
                    x: .value("Date", item.date),
                    y: .value("Amount", item.amount)
                )
                .foregroundStyle(.blue)
                .interpolationMethod(.catmullRom)
                
                AreaMark(
                    x: .value("Date", item.date),
                    y: .value("Amount", item.amount)
                )
                .foregroundStyle(.blue.opacity(0.1))
                .interpolationMethod(.catmullRom)
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisValueLabel(format: .dateTime.month().day())
                    AxisGridLine()
                    AxisTick()
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisValueLabel()
                    AxisGridLine()
                    AxisTick()
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

struct CategoryChartView: View {
    let timeframe: AnalyticsView.Timeframe
    
    @FetchRequest private var expenses: FetchedResults<Expense>
    
    init(timeframe: AnalyticsView.Timeframe) {
        self.timeframe = timeframe
        
        let startDate: Date
        let calendar = Calendar.current
        
        switch timeframe {
        case .week:
            startDate = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        case .month:
            startDate = calendar.dateInterval(of: .month, for: Date())?.start ?? Date()
        case .year:
            startDate = calendar.dateInterval(of: .year, for: Date())?.start ?? Date()
        }
        
        _expenses = FetchRequest(
            sortDescriptors: [NSSortDescriptor(keyPath: \Expense.amount, ascending: false)],
            predicate: NSPredicate(format: "date >= %@", startDate as NSDate)
        )
    }
    
    private var categoryData: [CategorySpending] {
        let grouped = Dictionary(grouping: expenses) { expense in
            expense.category ?? "Other"
        }
        
        return grouped.map { category, expenses in
            CategorySpending(
                category: category,
                amount: expenses.reduce(0) { $0 + $1.amount }
            )
        }.sorted { $0.amount > $1.amount }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Spending by Category")
                .font(.headline)
                .padding(.horizontal)
            
            Chart(categoryData) { item in
                SectorMark(
                    angle: .value("Amount", item.amount),
                    innerRadius: .ratio(0.6),
                    angularInset: 2
                )
                .foregroundStyle(categoryColor(for: item.category))
            }
            .chartLegend(position: .bottom, alignment: .center)
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    private func categoryColor(for category: String) -> Color {
        switch category.lowercased() {
        case "food & dining":
            return .orange
        case "transportation":
            return .blue
        case "shopping":
            return .pink
        case "entertainment":
            return .purple
        case "health & fitness":
            return .red
        case "bills & utilities":
            return .green
        default:
            return .gray
        }
    }
}

struct TrendsChartView: View {
    let timeframe: AnalyticsView.Timeframe
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Spending Trends")
                .font(.headline)
                .padding(.horizontal)
            
            VStack(spacing: 20) {
                // Placeholder for trend analysis
                HStack {
                    Image(systemName: "arrow.up.circle.fill")
                        .foregroundColor(.red)
                        .font(.title2)
                    
                    VStack(alignment: .leading) {
                        Text("Spending increased 15% this month")
                            .font(.body)
                        Text("Compared to last month")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                HStack {
                    Image(systemName: "repeat.circle.fill")
                        .foregroundColor(.orange)
                        .font(.title2)
                    
                    VStack(alignment: .leading) {
                        Text("3 recurring expenses detected")
                            .font(.body)
                        Text("Consider setting up auto-tracking")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.yellow)
                        .font(.title2)
                    
                    VStack(alignment: .leading) {
                        Text("High spending in Entertainment")
                            .font(.body)
                        Text("Consider budget adjustments")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

struct InsightsView: View {
    let timeframe: AnalyticsView.Timeframe
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Insights & Recommendations")
                .font(.headline)
                .padding(.horizontal)
            
            VStack(spacing: 12) {
                InsightCard(
                    icon: "lightbulb.fill",
                    title: "Smart Tip",
                    description: "You spend 40% more on weekends. Consider meal planning to reduce food expenses.",
                    color: .blue
                )
                
                InsightCard(
                    icon: "target",
                    title: "Goal Progress",
                    description: "You're 23% over your monthly budget. Try reducing entertainment spending.",
                    color: .orange
                )
                
                InsightCard(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Trend Alert",
                    description: "Transportation costs increased by 30% this month due to gas price changes.",
                    color: .green
                )
            }
            .padding(.horizontal)
        }
    }
}

struct InsightCard: View {
    let icon: String
    let title: String
    let description: String
    let color: Color
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.body)
                    .fontWeight(.semibold)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// Data Models for Charts
struct DailySpending: Identifiable {
    let id = UUID()
    let date: Date
    let amount: Double
}

struct CategorySpending: Identifiable {
    let id = UUID()
    let category: String
    let amount: Double
}

#Preview {
    AnalyticsView()
        .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}