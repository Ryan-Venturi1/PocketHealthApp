// js/ai-assistant.js
import HealthAssistant from './health-assistant.js';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Create status elements if they don't exist
  ensureStatusElements();
  
  // Initialize the Health Assistant
  const assistant = new HealthAssistant();
  
  // Store assistant in window for debugging
  window.healthAssistant = assistant;
  
  // Start loading the model
  initializeAssistant(assistant);
});

// Function to ensure status elements exist
function ensureStatusElements() {
  const chatHeader = document.querySelector('.chat-header');
  
  // Check if status container exists
  let statusContainer = document.getElementById('assistant-status-container');
  if (!statusContainer) {
    statusContainer = document.createElement('div');
    statusContainer.id = 'assistant-status-container';
    statusContainer.className = 'assistant-status';
    
    // Create status element
    const statusElement = document.createElement('span');
    statusElement.id = 'assistant-status';
    statusElement.textContent = 'Initializing...';
    statusContainer.appendChild(statusElement);
    
    // Create progress container
    const progressContainer = document.createElement('div');
    progressContainer.id = 'assistant-progress-container';
    progressContainer.className = 'progress-container';
    
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'assistant-progress';
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0%';
    
    progressContainer.appendChild(progressBar);
    statusContainer.appendChild(progressContainer);
    
    // Add to chat header
    if (chatHeader) {
      chatHeader.appendChild(statusContainer);
    }
  }
}

// Function to initialize the assistant
async function initializeAssistant(assistant) {
  try {
    // Initialize assistant
    const initialized = await assistant.initialize();
    
    if (initialized) {
      console.log('Health Assistant initialized successfully');
      setupEventListeners(assistant);
    } else {
      console.error('Failed to initialize Health Assistant');
      showErrorMessage('Could not initialize the AI assistant. Please try refreshing the page.');
    }
  } catch (error) {
    console.error('Error initializing Health Assistant:', error);
    showErrorMessage('An error occurred while initializing the AI assistant. Please try again later.');
  }
}

// Function to show error message
function showErrorMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant error';
    errorDiv.innerHTML = `
      <div class="message-content">
        <p>${message}</p>
      </div>
      <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    chatMessages.appendChild(errorDiv);
  }
}

// Function to set up event listeners
function setupEventListeners(assistant) {
  const chatMessages = document.getElementById('chat-messages');
  const userMessageInput = document.getElementById('user-message');
  const sendButton = document.getElementById('btn-send');
  const modelSelect = document.getElementById('model-select');
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  
  // Enable send button only when there's input
  if (userMessageInput) {
    userMessageInput.addEventListener('input', () => {
      if (sendButton) {
        sendButton.disabled = userMessageInput.value.trim() === '';
      }
    });
  }
  
  // Function to add user message to chat
  function addUserMessage(message) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${message.replace(/\n/g, '<br>')}</p>
      </div>
      <span class="message-time">${timeString}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function to add typing indicator
  function addTypingIndicator() {
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
      <div class="message-content">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function to remove typing indicator
  function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  // Function to add assistant message to chat
  function addAssistantMessage(message, isDone = true) {
    if (!chatMessages) return;
    
    // Check if there's already a message being built
    let messageEl = chatMessages.querySelector('.message.assistant.partial');
    
    if (!messageEl) {
      // Create a new message element
      messageEl = document.createElement('div');
      messageEl.className = 'message assistant partial';
      
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      messageEl.innerHTML = `
        <div class="message-content">
          <p></p>
        </div>
        <span class="message-time">${timeString}</span>
      `;
      
      chatMessages.appendChild(messageEl);
    }
    
    // Update content (check if it contains HTML)
    const contentEl = messageEl.querySelector('.message-content');
    
    if (message.includes('<div class="resources-section">')) {
      // Handle resources HTML
      const resourcesSection = document.createElement('div');
      resourcesSection.innerHTML = message;
      contentEl.appendChild(resourcesSection);
    } else {
      // Handle plain text
      const paragraphEl = contentEl.querySelector('p');
      paragraphEl.innerHTML += message.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    }
    
    // If this is the final message, mark it as complete
    if (isDone) {
      messageEl.classList.remove('partial');
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function to handle sending a message
  async function sendMessage() {
    if (!userMessageInput || !sendButton) return;
    
    const message = userMessageInput.value.trim();
    if (!message) return;
    
    // Add user message to UI
    addUserMessage(message);
    
    // Clear input
    userMessageInput.value = '';
    sendButton.disabled = true;
    
    // Add typing indicator
    addTypingIndicator();
    
    // Process emergency triggers locally
    const emergencyTerms = [
      "chest pain", "difficulty breathing", "stroke", "seizure", 
      "unconscious", "severe bleeding", "poisoning", "suicide"
    ];
    
    const isEmergency = emergencyTerms.some(term => message.toLowerCase().includes(term));
    
    if (isEmergency) {
      // Show emergency warning immediately
      removeTypingIndicator();
      addAssistantMessage(`⚠️ This may be a medical emergency. Please call emergency services (911) immediately. ⚠️\n\n`, false);
    }
    
    // Send message to the assistant
    try {
      await assistant.sendMessage(message, (response, isDone) => {
        // Remove typing indicator if it exists
        removeTypingIndicator();
        
        // Add the response if there's content
        if (response) {
          addAssistantMessage(response, isDone);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      removeTypingIndicator();
      addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.', true);
    }
    
    // Re-enable input
    userMessageInput.focus();
  }
  
  // Send message on button click
  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
  }
  
  // Send message on Enter key (but allow Shift+Enter for new lines)
  if (userMessageInput) {
    userMessageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
          sendMessage();
        }
      }
    });
  }
  
  // Handle suggestion chips
  if (suggestionChips) {
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (userMessageInput) {
          userMessageInput.value = chip.textContent;
          sendMessage();
        }
      });
    });
  }
  
  // Handle model selection
  if (modelSelect) {
    modelSelect.addEventListener('change', async () => {
      const newModel = modelSelect.value;
      const loadingMessage = `Changing to ${newModel}...`;
      
      // Add system message about model change
      addAssistantMessage(loadingMessage, true);
      
      // Change the model
      const success = await assistant.changeModel(newModel);
      
      if (success) {
        addAssistantMessage(`I'm now using the ${newModel} model. How can I help you?`, true);
      } else {
        addAssistantMessage(`Sorry, I couldn't switch to the ${newModel} model. I'll continue using the current model.`, true);
      }
    });
  }
}