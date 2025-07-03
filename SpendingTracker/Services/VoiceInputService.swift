import Foundation
import Speech
import AVFoundation
import Combine

class VoiceInputService: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var transcribedText = ""
    @Published var isAvailable = false
    
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    override init() {
        super.init()
        setupSpeechRecognizer()
    }
    
    private func setupSpeechRecognizer() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechRecognizer?.delegate = self
        
        checkAuthorizationStatus()
    }
    
    private func checkAuthorizationStatus() {
        Task { @MainActor in
            switch SFSpeechRecognizer.authorizationStatus() {
            case .authorized:
                self.isAvailable = true
            case .denied, .restricted, .notDetermined:
                await self.requestSpeechAuthorization()
            @unknown default:
                self.isAvailable = false
            }
        }
    }
    
    private func requestSpeechAuthorization() async {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async {
                    self.isAvailable = status == .authorized
                    continuation.resume()
                }
            }
        }
    }
    
    func startRecording() {
        guard isAvailable && !isRecording else { return }
        
        // Cancel any existing task
        recognitionTask?.cancel()
        recognitionTask = nil
        
        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("Audio session error: \(error)")
            return
        }
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        
        recognitionRequest.shouldReportPartialResults = true
        
        // Configure audio input
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        // Start audio engine
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            print("Audio engine error: \(error)")
            return
        }
        
        // Start recognition
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            DispatchQueue.main.async {
                if let result = result {
                    self?.transcribedText = result.bestTranscription.formattedString
                }
                
                if error != nil || result?.isFinal == true {
                    self?.stopRecording()
                }
            }
        }
        
        isRecording = true
    }
    
    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        
        recognitionTask?.cancel()
        recognitionTask = nil
        
        isRecording = false
        
        // Reset audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("Error resetting audio session: \(error)")
        }
    }
    
    func clearTranscription() {
        transcribedText = ""
    }
    
    // MARK: - Text Processing
    
    func extractExpenseInfo(from text: String) -> (amount: Double?, description: String?, category: String?) {
        let lowercased = text.lowercased()
        
        // Extract amount
        let amount = extractAmount(from: lowercased)
        
        // Extract description
        let description = extractDescription(from: text, originalAmount: amount)
        
        // Extract/guess category
        let category = guessCategory(from: lowercased)
        
        return (amount, description, category)
    }
    
    private func extractAmount(from text: String) -> Double? {
        // Regex patterns for different amount formats
        let patterns = [
            #/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/#,  // "25 dollars", "25.50 bucks", "25 $"
            #/\$\s*(\d+(?:\.\d{1,2})?)/#,                       // "$25", "$ 25.50"
            #/(\d+(?:\.\d{1,2})?)\s*(?:dollar|buck)/#           // "25 dollar", "25.50 buck"
        ]
        
        for pattern in patterns {
            if let match = text.firstMatch(of: pattern) {
                return Double(String(match.1))
            }
        }
        
        return nil
    }
    
    private func extractDescription(from text: String, originalAmount: Double?) -> String? {
        var cleanedText = text
        
        // Remove amount mentions
        if let amount = originalAmount {
            let amountPatterns = [
                "\(amount) dollars?",
                "\(amount) bucks?",
                "$\(amount)",
                "\(amount)"
            ]
            
            for pattern in amountPatterns {
                cleanedText = cleanedText.replacingOccurrences(
                    of: pattern,
                    with: "",
                    options: [.caseInsensitive, .regularExpression]
                )
            }
        }
        
        // Remove common phrases
        let commonPhrases = [
            "i spent",
            "i bought",
            "i paid",
            "spent on",
            "paid for",
            "bought",
            "for",
            "on",
            "at"
        ]
        
        for phrase in commonPhrases {
            cleanedText = cleanedText.replacingOccurrences(
                of: phrase,
                with: "",
                options: .caseInsensitive
            )
        }
        
        // Clean up and return
        let result = cleanedText
            .trimmingCharacters(in: .whitespacesAndPunctuation)
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        
        return result.isEmpty ? nil : result
    }
    
    private func guessCategory(from text: String) -> String? {
        let categoryKeywords: [String: [String]] = [
            "Food & Dining": ["coffee", "restaurant", "food", "lunch", "dinner", "breakfast", "cafe", "starbucks", "mcdonald", "pizza"],
            "Transportation": ["gas", "fuel", "uber", "lyft", "taxi", "train", "bus", "parking", "metro"],
            "Shopping": ["store", "shopping", "mall", "amazon", "target", "walmart", "clothes", "shirt"],
            "Entertainment": ["movie", "cinema", "theater", "netflix", "spotify", "game", "concert"],
            "Health & Fitness": ["gym", "doctor", "pharmacy", "medicine", "hospital", "fitness"],
            "Bills & Utilities": ["bill", "electric", "water", "internet", "phone", "rent", "mortgage"]
        ]
        
        for (category, keywords) in categoryKeywords {
            for keyword in keywords {
                if text.contains(keyword) {
                    return category
                }
            }
        }
        
        return nil
    }
}

// MARK: - SFSpeechRecognizerDelegate

extension VoiceInputService: SFSpeechRecognizerDelegate {
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        DispatchQueue.main.async {
            self.isAvailable = available
        }
    }
}