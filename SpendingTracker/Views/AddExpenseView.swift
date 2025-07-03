import SwiftUI
import Speech
import AVFoundation

struct AddExpenseView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @EnvironmentObject var expenseViewModel: ExpenseViewModel
    @StateObject private var voiceInputService = VoiceInputService()
    
    @State private var amount: String = ""
    @State private var title: String = ""
    @State private var selectedCategory = "Food & Dining"
    @State private var date = Date()
    @State private var notes: String = ""
    @State private var isRecurring = false
    
    @State private var showingVoiceInput = false
    @State private var showingSuccessAlert = false
    @State private var showingErrorAlert = false
    @State private var errorMessage = ""
    
    private let categories = [
        "Food & Dining",
        "Transportation",
        "Shopping",
        "Entertainment",
        "Health & Fitness",
        "Bills & Utilities",
        "Travel",
        "Education",
        "Other"
    ]
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Expense Details")) {
                    // Amount Input
                    HStack {
                        Text("$")
                            .font(.title2)
                            .foregroundColor(.secondary)
                        TextField("0.00", text: $amount)
                            .keyboardType(.decimalPad)
                            .font(.title2)
                            .fontWeight(.semibold)
                    }
                    
                    // Title Input
                    TextField("What did you spend on?", text: $title)
                    
                    // Category Picker
                    Picker("Category", selection: $selectedCategory) {
                        ForEach(categories, id: \.self) { category in
                            HStack {
                                Image(systemName: categoryIcon(for: category))
                                    .foregroundColor(categoryColor(for: category))
                                Text(category)
                            }
                            .tag(category)
                        }
                    }
                    
                    // Date Picker
                    DatePicker("Date", selection: $date, displayedComponents: [.date, .hourAndMinute])
                }
                
                Section(header: Text("Additional Options")) {
                    // Notes
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                    
                    // Recurring Toggle
                    Toggle("Recurring Expense", isOn: $isRecurring)
                }
                
                Section(header: Text("Quick Input")) {
                    // Voice Input Button
                    Button(action: startVoiceInput) {
                        HStack {
                            Image(systemName: voiceInputService.isRecording ? "mic.fill" : "mic")
                                .foregroundColor(voiceInputService.isRecording ? .red : .blue)
                            Text(voiceInputService.isRecording ? "Recording..." : "Voice Input")
                            Spacer()
                            if voiceInputService.isRecording {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                        }
                    }
                    .disabled(!voiceInputService.isAvailable)
                    
                    if !voiceInputService.transcribedText.isEmpty {
                        Text("Voice: \(voiceInputService.transcribedText)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 4)
                    }
                }
                
                Section {
                    Button("Add Expense") {
                        saveExpense()
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .font(.headline)
                    .foregroundColor(.white)
                    .listRowBackground(Color.blue)
                    .disabled(amount.isEmpty || title.isEmpty)
                }
            }
            .navigationTitle("Add Expense")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Clear") {
                        clearForm()
                    }
                }
            }
            .alert("Success!", isPresented: $showingSuccessAlert) {
                Button("OK") { }
            } message: {
                Text("Expense added successfully!")
            }
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .onReceive(voiceInputService.$transcribedText) { text in
                if !text.isEmpty {
                    parseVoiceInput(text)
                }
            }
        }
    }
    
    private func startVoiceInput() {
        if voiceInputService.isRecording {
            voiceInputService.stopRecording()
        } else {
            voiceInputService.startRecording()
        }
    }
    
    private func parseVoiceInput(_ text: String) {
        // Simple parsing logic for voice input
        // Example: "I spent 25 dollars on coffee at Starbucks"
        let lowercased = text.lowercased()
        
        // Extract amount
        let amountRegex = #/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/
        if let match = lowercased.firstMatch(of: amountRegex) {
            amount = String(match.1)
        }
        
        // Extract potential title
        if title.isEmpty {
            // Remove amount and common words
            var cleanedText = text
            if let match = text.firstMatch(of: #/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/) {
                cleanedText = cleanedText.replacingOccurrences(of: String(match.0), with: "")
            }
            cleanedText = cleanedText.replacingOccurrences(of: "I spent", with: "", options: .caseInsensitive)
            cleanedText = cleanedText.replacingOccurrences(of: "on", with: "", options: .caseInsensitive)
            title = cleanedText.trimmingCharacters(in: .whitespacesAndPunctuation)
        }
        
        // Auto-detect category based on keywords
        if lowercased.contains("coffee") || lowercased.contains("restaurant") || lowercased.contains("food") {
            selectedCategory = "Food & Dining"
        } else if lowercased.contains("gas") || lowercased.contains("uber") || lowercased.contains("taxi") {
            selectedCategory = "Transportation"
        } else if lowercased.contains("store") || lowercased.contains("shopping") {
            selectedCategory = "Shopping"
        }
    }
    
    private func saveExpense() {
        guard let amountValue = Double(amount), !title.isEmpty else {
            errorMessage = "Please enter a valid amount and title"
            showingErrorAlert = true
            return
        }
        
        let expense = Expense(context: viewContext)
        expense.id = UUID()
        expense.amount = amountValue
        expense.title = title
        expense.category = selectedCategory
        expense.date = date
        expense.notes = notes.isEmpty ? nil : notes
        expense.isRecurring = isRecurring
        expense.source = voiceInputService.transcribedText.isEmpty ? "manual" : "voice"
        
        do {
            try viewContext.save()
            showingSuccessAlert = true
            clearForm()
            
            // Check for recurring patterns
            Task {
                await expenseViewModel.checkForRecurringPattern(expense: expense)
            }
        } catch {
            errorMessage = "Failed to save expense: \(error.localizedDescription)"
            showingErrorAlert = true
        }
    }
    
    private func clearForm() {
        amount = ""
        title = ""
        selectedCategory = "Food & Dining"
        date = Date()
        notes = ""
        isRecurring = false
        voiceInputService.transcribedText = ""
    }
    
    private func categoryIcon(for category: String) -> String {
        switch category {
        case "Food & Dining":
            return "fork.knife"
        case "Transportation":
            return "car.fill"
        case "Shopping":
            return "bag.fill"
        case "Entertainment":
            return "tv.fill"
        case "Health & Fitness":
            return "heart.fill"
        case "Bills & Utilities":
            return "doc.text.fill"
        case "Travel":
            return "airplane"
        case "Education":
            return "book.fill"
        default:
            return "dollarsign.circle.fill"
        }
    }
    
    private func categoryColor(for category: String) -> Color {
        switch category {
        case "Food & Dining":
            return .orange
        case "Transportation":
            return .blue
        case "Shopping":
            return .pink
        case "Entertainment":
            return .purple
        case "Health & Fitness":
            return .red
        case "Bills & Utilities":
            return .green
        case "Travel":
            return .cyan
        case "Education":
            return .yellow
        default:
            return .gray
        }
    }
}

#Preview {
    AddExpenseView()
        .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
        .environmentObject(ExpenseViewModel())
}