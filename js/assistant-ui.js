// js/assistant-ui.js - Connects the WebLLM implementation with the UI

import HealthAssistant from './health-assistant.js';

class AssistantUI {
  constructor() {
    this.assistant = new HealthAssistant();
    this.messageContainer = document.getElementById('chat-messages');
    this.userInput = document.getElementById('user-message');
    this.sendButton = document.getElementById('btn-send');
    this.suggestionChips = document.querySelectorAll('.suggestion-chip');
    this.isProcessing = false;
    
    // Initialize UI
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Send button click
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => this.handleSendMessage());
    }
    
    // Enter key in input
    if (this.userInput) {
      this.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }
    
    // Suggestion chips
    if (this.suggestionChips) {
      this.suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const message = chip.textContent.trim();
          this.userInput.value = message;
          this.handleSendMessage();
        });
      });
    }
    
    // Update status indicators
    document.addEventListener('DOMContentLoaded', () => {
      // Add a progress bar for model loading to the UI
      const header = document.querySelector('.chat-header');
      if (header) {
        const statusBar = document.createElement('div');
        statusBar.innerHTML = `
          <div id="assistant-progress-container" class="progress-container">
            <div id="assistant-status" class="status-message">Assistant loading...</div>
            <div class="progress-bar-container">
              <div id="assistant-progress" class="progress-bar"></div>
            </div>
          </div>
        `;
        header.appendChild(statusBar);
      }
    });
  }
  
  handleSendMessage() {
    // Get message from input
    const message = this.userInput.value.trim();
    if (!message || this.isProcessing) return;
    
    // Clear input
    this.userInput.value = '';
    
    // Add user message to UI
    this.addMessageToUI('user', message);
    
    // Show typing indicator
    this.addTypingIndicator();
    
    // Set processing flag
    this.isProcessing = true;
    
    // Disable send button
    if (this.sendButton) {
      this.sendButton.disabled = true;
    }
    
    // Get response from assistant
    this.assistant.sendMessage(message, (partialResponse, isDone) => {
      // Remove typing indicator on first chunk
      if (partialResponse && document.querySelector('.typing-indicator')) {
        this.removeTypingIndicator();
        this.addMessageToUI('assistant', '');
      }
      
      // Update the message with new content
      if (partialResponse) {
        this.updateLastMessage(partialResponse);
      }
      
      // Enable send button when done
      if (isDone) {
        this.isProcessing = false;
        if (this.sendButton) {
          this.sendButton.disabled = false;
        }
        
        // Store conversation in localStorage
        this.saveConversation();
      }
    }).catch(error => {
      console.error('Error getting response:', error);
      this.removeTypingIndicator();
      this.addMessageToUI('assistant', 'Sorry, I encountered an error processing your request. Please try again.');
      this.isProcessing = false;
      if (this.sendButton) {
        this.sendButton.disabled = false;
      }
    });
  }
  
  addMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Format links and health terms in the message
    if (role === 'assistant') {
      messageContent.innerHTML = this.formatMessage(content);
    } else {
      messageContent.textContent = content;
    }
    
    const timestamp = document.createElement('span');
    timestamp.className = 'message-time';
    timestamp.textContent = this.formatTimestamp(new Date());
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(timestamp);
    
    if (this.messageContainer) {
      this.messageContainer.appendChild(messageDiv);
      this.scrollToBottom();
    }
  }
  
  updateLastMessage(newContent) {
    const lastMessage = this.messageContainer.querySelector('.message.assistant:last-child .message-content');
    if (lastMessage) {
      // Append new content
      const currentContent = lastMessage.innerHTML;
      lastMessage.innerHTML = this.formatMessage(currentContent + newContent);
      this.scrollToBottom();
    }
  }
  
  formatMessage(content) {
    // Convert URLs to links
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Highlight health terms (simple example)
    const healthTerms = [
      'blood pressure', 'diabetes', 'cholesterol', 'heart disease', 'hypertension',
      'exercise', 'nutrition', 'sleep', 'stress', 'BMI', 'depression', 'anxiety'
    ];
    
    healthTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      content = content.replace(regex, '<span class="health-term">$1</span>');
    });
    
    // Convert markdown-style formatting
    // Bold
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }
  
  addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.innerHTML = `
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    if (this.messageContainer) {
      this.messageContainer.appendChild(typingDiv);
      this.scrollToBottom();
    }
  }
  
  removeTypingIndicator() {
    const typingIndicator = this.messageContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  scrollToBottom() {
    if (this.messageContainer) {
      this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }
  }
  
  formatTimestamp(date) {
    // Simple time formatter
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  saveConversation() {
    // Get messages from the UI
    const messages = Array.from(this.messageContainer.querySelectorAll('.message')).map(msg => {
      const role = msg.classList.contains('user') ? 'user' : 'assistant';
      const content = msg.querySelector('.message-content').innerText;
      const timestamp = msg.querySelector('.message-time').innerText;
      
      return { role, content, timestamp };
    });
    
    // Store in localStorage
    if (messages.length > 0) {
      localStorage.setItem('assistantConversation', JSON.stringify(messages));
    }
  }
  
  loadConversation() {
    const savedConversation = localStorage.getItem('assistantConversation');
    if (savedConversation) {
      try {
        const messages = JSON.parse(savedConversation);
        
        // Clear existing messages
        if (this.messageContainer) {
          this.messageContainer.innerHTML = '';
        }
        
        // Add saved messages to UI
        messages.forEach(msg => {
          const messageDiv = document.createElement('div');
          messageDiv.className = `message ${msg.role}`;
          
          const messageContent = document.createElement('div');
          messageContent.className = 'message-content';
          messageContent.innerHTML = this.formatMessage(msg.content);
          
          const timestamp = document.createElement('span');
          timestamp.className = 'message-time';
          timestamp.textContent = msg.timestamp;
          
          messageDiv.appendChild(messageContent);
          messageDiv.appendChild(timestamp);
          
          if (this.messageContainer) {
            this.messageContainer.appendChild(messageDiv);
          }
        });
        
        this.scrollToBottom();
        
        // Update assistant's message history
        messages.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            this.assistant.messageHistory.push({
              role: msg.role,
              content: msg.content
            });
          }
        });
        
        return true;
      } catch (error) {
        console.error('Error loading conversation:', error);
        return false;
      }
    }
    
    return false;
  }
}

// Initialize the assistant UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.assistantUI = new AssistantUI();
  
  // Load any previous conversation
  window.assistantUI.loadConversation();
  
  // Add CSS for typing indicator
  const style = document.createElement('style');
  style.textContent = `
    .typing-dots {
      display: flex;
      gap: 4px;
      padding: 8px 0;
    }
    
    .typing-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--text-secondary);
      animation: typing-dot 1.4s infinite ease-in-out both;
    }
    
    .typing-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .typing-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    @keyframes typing-dot {
      0%, 80%, 100% { transform: scale(0.6); }
      40% { transform: scale(1); }
    }
    
    .health-term {
      color: var(--primary);
      font-weight: 500;
    }
    
    .progress-container {
      width: 100%;
      margin-top: 10px;
      font-size: 0.8rem;
    }
    
    .status-message {
      margin-bottom: 5px;
      color: var(--text-secondary);
    }
    
    .progress-bar-container {
      width: 100%;
      height: 4px;
      background-color: var(--bg-secondary);
      border-radius: 2px;
    }
    
    .progress-bar {
      height: 100%;
      background-color: var(--primary);
      border-radius: 2px;
      width: 0;
      transition: width 0.3s ease;
    }
  `;
  document.head.appendChild(style);
});

export default AssistantUI;