import { StorageManager } from './storage-manager.js';

export class AIAssistant {
    constructor() {
        this.storageManager = new StorageManager();
        this.initializeAssistant();
    }

    initializeAssistant() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
        if (chatInput && sendButton) {
            sendButton.addEventListener('click', () => this.handleUserMessage(chatInput.value));
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleUserMessage(chatInput.value);
                }
            });
        }
    }

    async handleUserMessage(message) {
        if (!message.trim()) return;

        // Add user message to chat
        this.addMessageToChat('user', message);

        // Get relevant test results
        const testResults = this.storageManager.getTestResults();
        const userProfile = this.storageManager.getUserProfile();

        // Generate AI response
        const response = await this.generateResponse(message, testResults, userProfile);
        
        // Add AI response to chat
        this.addMessageToChat('assistant', response);
    }

    addMessageToChat(sender, message) {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.innerHTML = `
            <div class="message-content">
                ${message}
            </div>
        `;

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async generateResponse(message, testResults, userProfile) {
        // Analyze message intent
        const intent = this.analyzeIntent(message);
        
        // Generate appropriate response based on intent
        switch (intent) {
            case 'health_summary':
                return this.generateHealthSummary(testResults);
            case 'test_analysis':
                return this.analyzeTestResults(message, testResults);
            case 'recommendations':
                return this.generateRecommendations(testResults, userProfile);
            default:
                return this.generateGeneralResponse(message, testResults);
        }
    }

    analyzeIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
            return 'health_summary';
        } else if (lowerMessage.includes('analyze') || lowerMessage.includes('results')) {
            return 'test_analysis';
        } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggestion')) {
            return 'recommendations';
        }
        
        return 'general';
    }

    generateHealthSummary(testResults) {
        if (testResults.length === 0) {
            return "I don't have any test results to analyze yet. Please complete some health tests first.";
        }

        const summary = [];
        const latestResults = {};

        // Get latest result for each test type
        testResults.forEach(result => {
            if (!latestResults[result.testType] || 
                new Date(result.timestamp) > new Date(latestResults[result.testType].timestamp)) {
                latestResults[result.testType] = result;
            }
        });

        // Generate summary for each test
        Object.entries(latestResults).forEach(([testType, result]) => {
            summary.push(this.formatTestSummary(testType, result));
        });

        return `Here's a summary of your recent health tests:\n\n${summary.join('\n\n')}`;
    }

    formatTestSummary(testType, result) {
        switch (testType) {
            case 'respiratory':
                return `Respiratory Rate: ${result.result.breathingRate} breaths/min (${this.getTrendIndicator(result)})`;
            case 'reaction':
                return `Reaction Time: ${result.result.averageReactionTime}ms (${this.getTrendIndicator(result)})`;
            case 'tremor':
                return `Tremor Analysis: Score of ${result.result.tremorScore}% (${this.getTrendIndicator(result)})`;
            case 'balance':
                return `Balance Test: Score of ${result.result.balanceScore}% (${this.getTrendIndicator(result)})`;
            default:
                return `${testType}: ${JSON.stringify(result.result)}`;
        }
    }

    getTrendIndicator(result) {
        // Simple trend analysis based on the result value
        if (result.result.alertLevel === 'normal') return 'Normal range';
        if (result.result.alertLevel === 'warning') return 'Slightly elevated';
        if (result.result.alertLevel === 'critical') return 'Needs attention';
        return 'No trend data';
    }

    analyzeTestResults(message, testResults) {
        // Implement specific test analysis based on the message
        return "I'm analyzing your test results. This feature is coming soon!";
    }

    generateRecommendations(testResults, userProfile) {
        // Generate personalized recommendations based on test results and user profile
        return "Based on your test results, I recommend regular exercise and maintaining a balanced diet. This feature is being enhanced!";
    }

    generateGeneralResponse(message, testResults) {
        return "I'm here to help you understand your health test results. You can ask me for a summary of your tests, analysis of specific results, or recommendations for improvement.";
    }
}

// Initialize AI Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIAssistant();
}); 