export class AssistantUI {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.inputField = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
    }

    init() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.handleSend());
        }
        if (this.inputField) {
            this.inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSend();
                }
            });
        }
    }

    handleSend() {
        const message = this.inputField.value.trim();
        if (message) {
            this.addMessage(message, 'user');
            this.inputField.value = '';
            // Here you would typically send the message to your backend
            // and handle the response
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
} 