// js/health-assistant.js - WebLLM Implementation for the AI Assistant

import { MLCEngine } from "@mlc-ai/web-llm";

class HealthAssistant {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.selectedModel = "Mistral-7B-v0.3"; // Default model - medical knowledge is decent
    this.messageHistory = [];
    this.initProgressCallback = this.updateProgressUI.bind(this);
  }

  // Initialize the WebLLM engine
  async initialize() {
    try {
      // Show loading UI
      this.updateStatusUI("Loading WebLLM engine...", "loading");
      
      // Create a new MLCEngine instance
      this.engine = new MLCEngine({ 
        initProgressCallback: this.initProgressCallback 
      });
      
      // Load the selected model
      await this.engine.reload(this.selectedModel);
      
      this.isInitialized = true;
      this.updateStatusUI("Assistant ready", "ready");
      
      // Add initial system message to history
      this.messageHistory.push({
        role: "system",
        content: "You are a helpful AI health assistant. Provide general health information and guidance, but always recommend consulting healthcare professionals for medical concerns. Base your responses on established medical knowledge and avoid making specific diagnoses."
      });
      
      return true;
    } catch (error) {
      console.error("Failed to initialize WebLLM:", error);
      this.updateStatusUI("Failed to load AI assistant", "error");
      return false;
    }
  }

  // Update the UI to show model loading progress
  updateProgressUI(progress) {
    const percent = Math.round((progress.progress || 0) * 100);
    const statusElement = document.getElementById("assistant-status");
    const progressBar = document.getElementById("assistant-progress");
    
    if (statusElement) {
      statusElement.textContent = `Loading model: ${percent}%`;
    }
    
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
  }

  // Update status in the UI
  updateStatusUI(message, status) {
    const statusElement = document.getElementById("assistant-status");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-${status}`;
    }
    
    // Hide progress bar if done or error
    if (status === "ready" || status === "error") {
      const progressContainer = document.getElementById("assistant-progress-container");
      if (progressContainer) {
        progressContainer.style.display = "none";
      }
    }
  }

  // Send a message to the model and get a response
  async sendMessage(userMessage, responseCallback) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          error: true,
          message: "Could not initialize the AI assistant. Please try again later."
        };
      }
    }
    
    try {
      // Add user message to history
      this.messageHistory.push({
        role: "user",
        content: userMessage
      });
      
      // Create messages array for the API
      const messages = [...this.messageHistory];
      
      // Health-specific parameters
      const params = {
        messages,
        max_tokens: 800,
        temperature: 0.7,
        stream: true // Enable streaming for better UX
      };
      
      // Get response stream
      const stream = await this.engine.chat.completions.create(params);
      
      let fullResponse = "";
      
      // Process streaming response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        
        // Call callback with partial content
        if (responseCallback && typeof responseCallback === "function") {
          responseCallback(content, false); // false = not done yet
        }
      }
      
      // Add assistant's message to history
      this.messageHistory.push({
        role: "assistant",
        content: fullResponse
      });
      
      // Limit history to last 20 messages to avoid context issues
      if (this.messageHistory.length > 20) {
        // Keep system message at index 0 and remove older messages
        const systemMessage = this.messageHistory[0];
        this.messageHistory = [
          systemMessage,
          ...this.messageHistory.slice(-19)
        ];
      }
      
      // Final callback with full response
      if (responseCallback && typeof responseCallback === "function") {
        responseCallback(fullResponse, true); // true = done
      }
      
      return {
        error: false,
        message: fullResponse
      };
    } catch (error) {
      console.error("Error getting response from WebLLM:", error);
      return {
        error: true,
        message: "Sorry, I couldn't process your request. Please try again."
      };
    }
  }
  
  // Change the model (if user wants to try different ones)
  async changeModel(modelName) {
    if (!this.engine) {
      await this.initialize();
    }
    
    try {
      this.updateStatusUI(`Loading ${modelName}...`, "loading");
      await this.engine.reload(modelName);
      this.selectedModel = modelName;
      this.updateStatusUI("Assistant ready", "ready");
      return true;
    } catch (error) {
      console.error(`Error loading model ${modelName}:`, error);
      this.updateStatusUI("Failed to load model", "error");
      return false;
    }
  }
  
  // Get available models
  getAvailableModels() {
    return [
      { id: "Mistral-7B-v0.3", name: "Mistral 7B", description: "Balanced performance and medical knowledge" },
      { id: "Gemma-7B", name: "Gemma 7B", description: "Google's efficient model with good reasoning" },
      { id: "Phi-2", name: "Phi-2", description: "Smaller, faster model for simple queries" }
    ];
  }
}

// Export the HealthAssistant class
export default HealthAssistant;