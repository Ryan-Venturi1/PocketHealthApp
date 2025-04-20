// js/health-assistant.js - WebLLM Implementation for the AI Assistant

class HealthAssistant {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.selectedModel = "TinyLlama-1.1B-Chat-v1.0"; // Start with a smaller model for faster loading
    this.messageHistory = [];
    this.initProgressCallback = this.updateProgressUI.bind(this);
    this.healthResourcesDB = this.initializeHealthResourcesDB();
  }

  async initialize() {
    try {
      this.updateStatusUI("Loading WebLLM engine...", "loading");
      
      // Check if WebLLM is available
      if (!window.mlc) {
        console.error("WebLLM not found: window.mlc is undefined");
        throw new Error("WebLLM dependencies not loaded. Please check your internet connection.");
      }
      
      if (!window.mlc.MLCEngine) {
        console.error("MLCEngine not found: window.mlc.MLCEngine is undefined");
        throw new Error("WebLLM MLCEngine not loaded. Please check your browser compatibility.");
      }
      
      // Log available models in config
      console.log("Initializing with model:", this.selectedModel);
      if (window.mlc.appConfig && window.mlc.appConfig.model_list) {
        console.log("Available models:", window.mlc.appConfig.model_list.map(m => m.model_id).join(", "));
      }
      
      // Initialize the engine
      this.engine = new window.mlc.MLCEngine({
        initProgressCallback: this.initProgressCallback,
        appConfig: window.mlc.appConfig
      });
      
      // Try to load the selected model
      try {
        await this.engine.reload(this.selectedModel);
      } catch (modelError) {
        console.warn(`Failed to load ${this.selectedModel}, trying fallback model...`, modelError);
        
        // Find available fallback models
        const availableModels = window.mlc.appConfig.model_list.map(m => m.model_id);
        if (availableModels.length > 0 && availableModels[0] !== this.selectedModel) {
          this.selectedModel = availableModels[0];
          console.log(`Falling back to model: ${this.selectedModel}`);
          await this.engine.reload(this.selectedModel);
        } else {
          throw new Error(`No fallback models available. Please check the model configuration.`);
        }
      }
      
      this.isInitialized = true;
      this.updateStatusUI("Assistant ready", "ready");
      return true;
    } catch (error) {
      console.error("Failed to initialize WebLLM:", error);
      
      // Provide more user-friendly error message
      let errorMessage = "Failed to load AI assistant";
      
      if (error.message) {
        if (error.message.includes("ModelNotFoundError") || error.message.includes("No URL found for model ID")) {
          errorMessage = "Model not found. Please check your model configuration.";
        } else if (error.message.includes("401")) {
          errorMessage = "Authentication error. Please check your access credentials.";
        } else if (error.message.includes("404")) {
          errorMessage = "Model files not found. Check your internet connection or try a different model.";
        } else if (error.message.includes("WebGPU")) {
          errorMessage = "Your browser doesn't support WebGPU. Please try Chrome or Edge.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      this.updateStatusUI(errorMessage, "error");
      
      // Add browser compatibility check
      if (!navigator.gpu) {
        this.updateStatusUI("WebGPU not supported in your browser. Please use Chrome or Edge.", "error");
      }
      
      return false;
    }
  }

  // Initialize health resources database
  initializeHealthResourcesDB() {
    return {
      // Common symptoms and conditions with internal resources
      "headache": {
        internalResource: "health-resources/headaches.html",
        description: "Guide to headache types, causes, and management"
      },
      "back pain": {
        internalResource: "health-resources/back-pain.html",
        description: "Information on back pain causes, prevention, and exercises"
      },
      "rash": {
        internalResource: "health-resources/skin-conditions.html",
        description: "Guide to common skin conditions and rashes"
      },
      "eye strain": {
        internalResource: "health-resources/vision-health.html",
        description: "Information on eye strain and vision health"
      },
      // Reliable external medical resources
      "trustworthy_external": [
        {
          name: "CDC",
          url: "https://www.cdc.gov",
          description: "Centers for Disease Control and Prevention"
        },
        {
          name: "Mayo Clinic",
          url: "https://www.mayoclinic.org",
          description: "Mayo Clinic Health Resources"
        },
        {
          name: "NIH",
          url: "https://www.nih.gov",
          description: "National Institutes of Health"
        },
        {
          name: "MedlinePlus",
          url: "https://medlineplus.gov",
          description: "Trusted health information from the National Library of Medicine"
        }
      ]
    };
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

  // Find relevant resources based on user query
  findRelevantResources(query) {
    const queryLower = query.toLowerCase();
    const resources = [];
    
    // Check for internal resources
    for (const [keyword, resource] of Object.entries(this.healthResourcesDB)) {
      if (keyword !== "trustworthy_external" && queryLower.includes(keyword)) {
        resources.push({
          type: "internal",
          title: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          link: resource.internalResource,
          description: resource.description
        });
      }
    }
    
    // Add 1-2 relevant external resources
    const externalSources = this.healthResourcesDB.trustworthy_external;
    if (resources.length < 2) {
      // Just add Mayo Clinic as a general resource if nothing else matches
      resources.push({
        type: "external",
        title: externalSources[1].name,
        link: externalSources[1].url,
        description: externalSources[1].description
      });
    }
    
    return resources;
  }

  // Format resources as HTML for display
  formatResourcesHtml(resources) {
    if (resources.length === 0) return '';
    
    let html = '<div class="resources-section"><h4>Helpful Resources:</h4><ul>';
    
    resources.forEach(resource => {
      html += `<li><a href="${resource.link}" target="_blank" rel="noopener">${resource.title}</a> - ${resource.description}</li>`;
    });
    
    html += '</ul></div>';
    return html;
  }

  // Process health-specific triggers in message
  processHealthTriggers(message) {
    // Check for emergency terms that need urgent attention warnings
    const emergencyTerms = [
      "chest pain", "difficulty breathing", "stroke", "seizure", 
      "unconscious", "severe bleeding", "poisoning", "suicide"
    ];
    
    for (const term of emergencyTerms) {
      if (message.toLowerCase().includes(term)) {
        return {
          isEmergency: true,
          warningMessage: "This may be a medical emergency. Please call emergency services (911) immediately.",
          emergencyTerm: term
        };
      }
    }
    
    return { isEmergency: false };
  }

  // Send a message to the model and get a response
  async sendMessage(userMessage, responseCallback) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        if (responseCallback && typeof responseCallback === "function") {
          responseCallback("I'm having trouble initializing. Please try refreshing the page or selecting a different model.", true);
        }
        return {
          error: true,
          message: "Could not initialize the AI assistant. Please try again later or select a different model."
        };
      }
    }
    
    try {
      // Process for emergency triggers
      const triggerCheck = this.processHealthTriggers(userMessage);
      if (triggerCheck.isEmergency) {
        // Add emergency warning before processing with AI
        if (responseCallback && typeof responseCallback === "function") {
          responseCallback(`⚠️ ${triggerCheck.warningMessage} ⚠️\n\n`, false);
        }
      }
      
      // Find relevant resources
      const relevantResources = this.findRelevantResources(userMessage);
      
      // Add user message to history
      this.messageHistory.push({
        role: "user",
        content: userMessage
      });
      
      // Create messages array for the API
      const messages = [...this.messageHistory];
      
      // Set system prompt if not already present
      if (!messages.some(msg => msg.role === "system")) {
        messages.unshift({
          role: "system",
          content: "You are a helpful AI health assistant. Provide information about health conditions, symptoms, and lifestyle advice. Remember to clarify that you're not a replacement for professional medical advice."
        });
      }
      
      // Health-specific parameters
      const params = {
        messages,
        max_tokens: 800,
        temperature: 0.7,
        stream: true // Enable streaming for better UX
      };
      
      console.log("Sending message to model:", this.selectedModel);
      
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
        // Keep system message and remove older messages
        const systemMessage = this.messageHistory.find(msg => msg.role === "system");
        this.messageHistory = [
          ...(systemMessage ? [systemMessage] : []),
          ...this.messageHistory.slice(-19)
        ];
      }
      
      // If we have relevant resources, add them to the response
      if (relevantResources.length > 0) {
        const resourcesHtml = this.formatResourcesHtml(relevantResources);
        
        // Final callback with full response and resources
        if (responseCallback && typeof responseCallback === "function") {
          responseCallback("\n\n" + resourcesHtml, true); // true = done
        }
      } else {
        // Final callback with just the response
        if (responseCallback && typeof responseCallback === "function") {
          responseCallback("", true); // true = done
        }
      }
      
      return {
        error: false,
        message: fullResponse,
        resources: relevantResources
      };
    } catch (error) {
      console.error("Error getting response from WebLLM:", error);
      
      // If the error is related to model loading, try to reload
      if (error.message && (error.message.includes("InvalidStateError") || error.message.includes("not initialized"))) {
        this.isInitialized = false;
        if (responseCallback && typeof responseCallback === "function") {
          responseCallback("I encountered an issue with the AI model. Let me try to fix it...", false);
          
          try {
            const initialized = await this.initialize();
            if (initialized) {
              responseCallback("I'm back online! Please ask your question again.", true);
            } else {
              responseCallback("I'm still having trouble. Please refresh the page or try again later.", true);
            }
          } catch (reinitError) {
            responseCallback("Unable to recover. Please refresh the page or try again later.", true);
          }
        }
      } else if (responseCallback && typeof responseCallback === "function") {
        responseCallback("Sorry, I couldn't process your request. Please try again or select a different model.", true);
      }
      
      return {
        error: true,
        message: "Sorry, I couldn't process your request. Please try again or select a different model."
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
      
      // Provide a more specific error message if possible
      let errorMessage = "Failed to load model";
      
      if (error.message) {
        if (error.message.includes("ModelNotFoundError") || error.message.includes("No URL found for model ID")) {
          errorMessage = `Model not found: ${modelName}`;
        } else if (error.message.includes("401")) {
          errorMessage = "Authentication error. Please check access credentials.";
        } else if (error.message.includes("404")) {
          errorMessage = "Model files not found. Please check for updates.";
        } else if (error.message.includes("WebGPU")) {
          errorMessage = "WebGPU error. Your browser may not support this model.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      this.updateStatusUI(errorMessage, "error");
      return false;
    }
  }
  
  // Get available models
  getAvailableModels() {
    if (window.mlc && window.mlc.appConfig && window.mlc.appConfig.model_list) {
      return window.mlc.appConfig.model_list.map(model => ({
        id: model.model_id,
        name: model.model_id.split('-')[0],
        description: `${model.model_id.split('-')[0]} model`
      }));
    }
    
    // Default models if config isn't available
    return [
      {
        id: "TinyLlama-1.1B-Chat-v1.0",
        name: "TinyLlama",
        description: "Fast, lightweight responses"
      },
      {
        id: "Phi-2",
        name: "Phi-2",
        description: "Lightweight & quick responses"
      }
    ];
  }
}

// Export the HealthAssistant class
export default HealthAssistant;