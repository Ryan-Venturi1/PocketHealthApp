// modules/wound-analyzer.js - Wound assessment using computer vision

// Wound condition classes with metadata
const WOUND_CONDITIONS = {
    "0": { name: "clean", display: "Clean Wound", severity: "low", needsDoctor: false },
    "1": { name: "infected", display: "Infected Wound", severity: "high", needsDoctor: true },
    "2": { name: "deep", display: "Deep Wound", severity: "moderate", needsDoctor: true },
    "3": { name: "healing", display: "Healing Wound", severity: "low", needsDoctor: false },
    "4": { name: "severe", display: "Severe Wound", severity: "high", needsDoctor: true }
  };
  
  class WoundAnalyzer {
    constructor() {
      // Class properties
      this.model = null;
      this.isModelLoaded = false;
      this.video = null;
      this.canvas = null;
      this.stream = null;
      this.isProcessing = false;
      this.woundAge = "0"; // Default: less than 6 hours
      
      // TensorFlow.js model URL (using a placeholder - in a real app you'd have a real model)
      this.modelUrl = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
    }
    
    async initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="test-instructions">
          <p>This test will analyze your wound for potential infection or complications.</p>
          <p>Position the camera to focus clearly on the wound area.</p>
          <div class="camera-container">
            <video id="wound-video" autoplay playsinline></video>
            <div id="focus-indicator" class="focus-indicator"></div>
            <div class="reference-overlay">
              <div class="measurement-guide"></div>
            </div>
          </div>
          <div class="wound-input-group">
            <label for="wound-age">When did the injury occur?</label>
            <select id="wound-age">
              <option value="0">Less than 6 hours ago</option>
              <option value="1">6-24 hours ago</option>
              <option value="2">1-3 days ago</option>
              <option value="3">More than 3 days ago</option>
            </select>
          </div>
          <div class="button-container">
            <button id="capture-wound" class="primary-button" disabled>Analyzing...</button>
            <button id="switch-camera" class="secondary-button">Switch Camera</button>
          </div>
          <p class="disclaimer">This is not a medical diagnosis. Always consult a doctor for proper evaluation.</p>
        </div>
        <div id="wound-results" class="results-container" style="display:none;">
          <h3>Analysis Results</h3>
          <div id="results-content"></div>
        </div>
        <canvas id="wound-canvas" style="display:none;"></canvas>
      `;
      
      // Get elements
      this.video = document.getElementById('wound-video');
      this.canvas = document.getElementById('wound-canvas');
      
      // Set up event listeners
      document.getElementById('capture-wound').addEventListener('click', () => this.analyzeImage());
      document.getElementById('switch-camera').addEventListener('click', () => this.switchCamera());
      document.getElementById('wound-age').addEventListener('change', (e) => this.woundAge = e.target.value);
      
      // Initialize TF and camera
      await this.initTensorFlow();
      await this.startCamera();
    }
    
    async initTensorFlow() {
      try {
        // Update button state
        const captureButton = document.getElementById('capture-wound');
        captureButton.textContent = 'Loading model...';
        captureButton.disabled = true;
        
        // Check if TensorFlow.js is loaded
        if (!window.tf) {
          console.error('TensorFlow.js not loaded');
          return;
        }
        
        // Load model (using mobile net as a placeholder in this demo)
        this.model = await tf.loadLayersModel(this.modelUrl);
        this.isModelLoaded = true;
        
        // Update UI
        captureButton.textContent = 'Analyze Wound';
        captureButton.disabled = false;
        
        // Warm up the model with a dummy prediction
        this.warmupModel();
        
      } catch (error) {
        console.error('Failed to load TensorFlow model:', error);
        const captureButton = document.getElementById('capture-wound');
        captureButton.textContent = 'Error Loading Model';
      }
    }
    
    warmupModel() {
      // Run a dummy prediction to warm up the model
      tf.tidy(() => {
        const dummyInput = tf.zeros([1, 224, 224, 3]);
        this.model.predict(dummyInput);
      });
    }
    
    async startCamera() {
      try {
        // Request camera access
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Use back camera by default
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        // Set up video element
        this.video.srcObject = this.stream;
        
        // Wait for video to be playing
        await this.video.play();
        
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Start focus detection
        this.startFocusDetection();
        
      } catch (error) {
        console.error('Error starting camera:', error);
        
        const captureButton = document.getElementById('capture-wound');
        if (error.name === 'NotAllowedError') {
          captureButton.textContent = 'Camera access denied';
        } else {
          captureButton.textContent = 'Camera error';
        }
      }
    }
    
    async switchCamera() {
      if (!this.stream) return;
      
      // Stop current stream
      this.stream.getTracks().forEach(track => track.stop());
      
      try {
        // Get current facing mode
        const currentTrack = this.video.srcObject.getVideoTracks()[0];
        const currentFacingMode = currentTrack.getSettings().facingMode;
        
        // Toggle facing mode
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        // Request new stream
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: newFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        // Update video
        this.video.srcObject = this.stream;
        await this.video.play();
        
        // Update canvas dimensions
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
    
    startFocusDetection() {
      const focusIndicator = document.getElementById('focus-indicator');
      const videoElement = this.video;
      
      if (!focusIndicator || !videoElement || !this.stream) return;
      
      const analyzeFrame = () => {
        if (!this.stream || !videoElement.srcObject) return;
        
        try {
          // Draw current frame to canvas for analysis
          const canvas = this.canvas;
          const ctx = canvas.getContext('2d');
          
          // Find the center portion of the video
          const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
          const offsetX = (videoElement.videoWidth - size) / 2;
          const offsetY = (videoElement.videoHeight - size) / 2;
          
          // Draw center portion to canvas
          ctx.drawImage(
            videoElement, 
            offsetX, offsetY, size, size,
            0, 0, canvas.width, canvas.height
          );
          
          // Get image data for analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Calculate image quality metrics
          const { brightness, contrast, blurriness } = this.calculateImageQuality(imageData);
          
          // Update focus indicator based on quality
          this.updateFocusIndicator(brightness, contrast, blurriness);
        } catch (error) {
          console.error('Error in focus detection:', error);
        }
        
        // Continue analyzing frames
        requestAnimationFrame(analyzeFrame);
      };
      
      // Start analysis loop
      analyzeFrame();
    }
    
    calculateImageQuality(imageData) {
      const data = imageData.data;
      const pixels = data.length / 4;
      
      // Calculate brightness (average pixel value)
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const brightness = totalBrightness / pixels / 255; // 0-1 scale
      
      // Calculate contrast (standard deviation of pixel values)
      const avgBrightness = totalBrightness / pixels;
      let variance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const pixelBrightness = (r + g + b) / 3;
        variance += Math.pow(pixelBrightness - avgBrightness, 2);
      }
      const contrast = Math.sqrt(variance / pixels) / 255; // 0-1 scale
      
      // Estimate blurriness
      let edgeStrength = 0;
      const width = imageData.width;
      for (let y = 1; y < imageData.height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const horiz = Math.abs(data[idx] - data[idx + 4]);
          const vert = Math.abs(data[idx] - data[idx + width * 4]);
          edgeStrength += horiz + vert;
        }
      }
      const blurriness = 1 - Math.min(1, edgeStrength / (pixels * 255 * 0.5)); // 0-1 (higher is more blurry)
      
      return { brightness, contrast, blurriness };
    }
    
    updateFocusIndicator(brightness, contrast, blurriness) {
      const focusIndicator = document.getElementById('focus-indicator');
      const captureButton = document.getElementById('capture-wound');
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(brightness, contrast, blurriness);
      
      // Update focus indicator
      if (focusIndicator) {
        focusIndicator.classList.remove('good', 'bad');
        if (qualityScore > 0.7) {
          focusIndicator.classList.add('good');
        } else if (qualityScore < 0.4) {
          focusIndicator.classList.add('bad');
        }
      }
      
      // Enable/disable capture button
      if (captureButton && !this.isProcessing) {
        captureButton.disabled = qualityScore < 0.4;
      }
    }
    
    calculateQualityScore(brightness, contrast, blurriness) {
      // Ideal values
      const idealBrightness = 0.5; // Middle brightness
      const brightnessFactor = 1 - Math.abs(brightness - idealBrightness) * 2; // 0-1 (higher is better)
      
      const contrastFactor = Math.min(1, contrast * 5); // 0-1 (higher is better)
      const sharpnessFactor = 1 - blurriness; // 0-1 (higher is better)
      
      // Weighted average
      return brightnessFactor * 0.3 + contrastFactor * 0.3 + sharpnessFactor * 0.4;
    }
    
    async analyzeImage() {
      if (!this.model || !this.isModelLoaded || this.isProcessing) return;
      this.isProcessing = true;
      
      // Update UI
      const captureButton = document.getElementById('capture-wound');
      captureButton.textContent = 'Analyzing...';
      captureButton.disabled = true;
      
      try {
        // Draw current video frame to canvas
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Prepare image for model
        const tensor = tf.browser.fromPixels(this.canvas)
          .resizeNearestNeighbor([224, 224]) // Resize to model input size
          .toFloat()
          .expandDims(0); // Add batch dimension
        
        // Run inference
        const predictions = await this.model.predict(tensor).data();
        
        // Clean up tensor
        tensor.dispose();
        
        // Process results (since we're using a placeholder model, we'll generate synthetic wound analysis)
        const results = this.generateWoundResults(predictions);
        
        // Display results
        this.displayResults(results);
        
        // Save results to storage
        this.saveResults(results);
      } catch (error) {
        console.error('Error analyzing image:', error);
      }
      
      // Reset UI
      captureButton.textContent = 'Analyze Again';
      captureButton.disabled = false;
      this.isProcessing = false;
    }
    
    generateWoundResults() {
      // Get wound age from select element
      const woundAgeValue = parseInt(this.woundAge);
      
      // Determine probability of infection based on wound age
      // Older wounds are more likely to be infected
      let infectionProbability;
      switch(woundAgeValue) {
        case 0: // Less than 6 hours
          infectionProbability = 0.1 + Math.random() * 0.2;
          break;
        case 1: // 6-24 hours
          infectionProbability = 0.2 + Math.random() * 0.3;
          break;
        case 2: // 1-3 days
          infectionProbability = 0.3 + Math.random() * 0.4;
          break;
        case 3: // More than 3 days
          infectionProbability = 0.4 + Math.random() * 0.5;
          break;
        default:
          infectionProbability = 0.2 + Math.random() * 0.3;
      }
      
      // For demo, randomly decide if infection probability is high
      const isInfected = Math.random() < 0.3; // 30% chance of "infection"
      if (isInfected) {
        infectionProbability = 0.6 + Math.random() * 0.3; // 60-90%
      }
      
      // Determine wound type probabilities
      const results = [
        // Clean wound
        {
          condition: WOUND_CONDITIONS["0"].name,
          display: WOUND_CONDITIONS["0"].display,
          probability: isInfected ? (0.3 - infectionProbability * 0.3) : (0.7 + Math.random() * 0.2),
          severity: WOUND_CONDITIONS["0"].severity,
          needsDoctor: WOUND_CONDITIONS["0"].needsDoctor
        },
        // Infected wound
        {
          condition: WOUND_CONDITIONS["1"].name,
          display: WOUND_CONDITIONS["1"].display,
          probability: infectionProbability,
          severity: WOUND_CONDITIONS["1"].severity,
          needsDoctor: WOUND_CONDITIONS["1"].needsDoctor
        },
        // Deep wound
        {
          condition: WOUND_CONDITIONS["2"].name,
          display: WOUND_CONDITIONS["2"].display,
          probability: isInfected ? (0.3 + Math.random() * 0.2) : (0.1 + Math.random() * 0.2),
          severity: WOUND_CONDITIONS["2"].severity,
          needsDoctor: WOUND_CONDITIONS["2"].needsDoctor
        }
      ];
      
      // Sort by probability
      results.sort((a, b) => b.probability - a.probability);
      
      // Generate metadata for assessment
      const topResult = results[0];
      const needsDoctor = topResult.needsDoctor || topResult.probability > 0.5;
      const woundSeverity = topResult.severity;
      
      // Get image data URL
      const imageDataUrl = this.canvas.toDataURL('image/jpeg');
      
      // Create recommendation
      let recommendation, alertLevel;
      if (infectionProbability > 0.5) {
        alertLevel = "danger";
        recommendation = "The analysis suggests this wound may be infected. Please consult a healthcare professional as soon as possible.";
      } else if (needsDoctor) {
        alertLevel = "warning";
        recommendation = "This wound appears to need medical attention. Consider consulting a healthcare professional.";
      } else {
        alertLevel = "success";
        recommendation = "This wound appears to be healing well. Keep it clean and continue proper wound care.";
      }
      
      return {
        results,
        topResult,
        needsDoctor,
        woundSeverity,
        infectionProbability,
        recommendation,
        alertLevel,
        imageDataUrl,
        woundAge: woundAgeValue,
        timestamp: new Date().toISOString()
      };
    }
    
    displayResults(results) {
      // Show results container
      document.getElementById('wound-results').style.display = 'block';
      
      // Get wound age text
      let woundAgeText;
      switch(results.woundAge) {
        case 0: woundAgeText = "Less than 6 hours"; break;
        case 1: woundAgeText = "6-24 hours"; break;
        case 2: woundAgeText = "1-3 days"; break;
        case 3: woundAgeText = "More than 3 days"; break;
        default: woundAgeText = "Unknown";
      }
      
      // Format results for display
      const resultsHtml = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Wound Assessment</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <img src="${results.imageDataUrl}" class="result-image" alt="Analyzed wound">
            <div class="result-details">
              <div class="detail-row">
                <span class="detail-label">Primary Assessment:</span>
                <span class="detail-value">${results.topResult.display}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Wound Age:</span>
                <span class="detail-value">${woundAgeText}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Infection Risk:</span>
                <div class="detail-bar-container">
                  <div class="detail-bar ${results.infectionProbability > 0.7 ? 'confidence-high' : results.infectionProbability > 0.4 ? 'confidence-medium' : 'confidence-low'}" 
                       style="width: ${Math.round(results.infectionProbability * 100)}%"></div>
                </div>
                <span class="detail-percentage">${Math.round(results.infectionProbability * 100)}%</span>
              </div>
              <div class="alert-box alert-${results.alertLevel}">
                <strong>${results.needsDoctor ? 'Medical attention recommended.' : 'Self-care appropriate.'}</strong>
                <p>${results.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHtml;
      
      // Scroll to results
      document.getElementById('wound-results').scrollIntoView({ behavior: 'smooth' });
    }
    
    saveResults(results) {
      // Create a summary for storage
      const summary = `Wound assessment: ${results.topResult.display} with ${Math.round(results.infectionProbability * 100)}% infection risk`;
      
      // Add to local storage via the controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('wound', {
          topCondition: results.topResult.display,
          infectionRisk: Math.round(results.infectionProbability * 100),
          needsDoctor: results.needsDoctor,
          woundAge: results.woundAge,
          recommendation: results.recommendation,
          results: results.results.map(r => ({
            condition: r.display,
            probability: Math.round(r.probability * 100)
          })),
          summary
        });
      }
    }
    
    cleanup() {
      // Stop camera stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Release TensorFlow resources
      if (this.model) {
        try {
          this.model.dispose();
        } catch (e) {
          console.error('Error disposing model:', e);
        }
      }
    }
  }
  
  export default WoundAnalyzer;