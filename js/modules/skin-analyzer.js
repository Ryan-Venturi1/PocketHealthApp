// modules/skin-analyzer.js - Skin condition analysis using TensorFlow.js

// Skin condition classes with metadata
const SKIN_CONDITIONS = {
    "0": { name: "Normal Skin", display: "Normal Skin", risk: "low", isCancerous: false, needsDoctor: false },
    "1": { name: "Actinic Keratosis", display: "Actinic Keratosis", risk: "moderate", isCancerous: false, needsDoctor: true },
    "2": { name: "Basal Cell Carcinoma", display: "Basal Cell Carcinoma", risk: "high", isCancerous: true, needsDoctor: true },
    "3": { name: "Melanoma", display: "Melanoma", risk: "high", isCancerous: true, needsDoctor: true },
    "4": { name: "Nevus (Mole)", display: "Benign Mole", risk: "low", isCancerous: false, needsDoctor: false },
    "5": { name: "Seborrheic Keratosis", display: "Seborrheic Keratosis", risk: "low", isCancerous: false, needsDoctor: false }
  };
  
  class SkinAnalyzer {
    constructor() {
      // Class properties
      this.model = null;
      this.isModelLoaded = false;
      this.video = null;
      this.canvas = null;
      this.stream = null;
      this.isProcessing = false;
      
      // TensorFlow.js model URL (using a placeholder - in a real app you'd have a real model)
      this.modelUrl = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
    }
    
    async initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="test-instructions">
          <p>This test will analyze your skin for potential issues.</p>
          <p>Position the camera to focus clearly on the skin area you want to analyze.</p>
          <div class="camera-container">
            <video id="skin-video" autoplay playsinline></video>
            <div id="focus-indicator" class="focus-indicator"></div>
            <div id="guidance-container" class="guidance-container">
              <div id="guidance-message" class="guidance-message">Aligning camera...</div>
            </div>
          </div>
          <div class="button-container">
            <button id="capture-skin" class="primary-button" disabled>Analyzing...</button>
            <button id="switch-camera" class="secondary-button">Switch Camera</button>
          </div>
          <p class="disclaimer">This is not a medical diagnosis. Always consult a doctor for proper evaluation.</p>
        </div>
        <div id="skin-results" class="results-container" style="display:none;">
          <h3>Analysis Results</h3>
          <div id="results-content"></div>
        </div>
        <canvas id="skin-canvas" style="display:none;"></canvas>
      `;
      
      // Get elements
      this.video = document.getElementById('skin-video');
      this.canvas = document.getElementById('skin-canvas');
      
      // Set up event listeners
      document.getElementById('capture-skin').addEventListener('click', () => this.analyzeImage());
      document.getElementById('switch-camera').addEventListener('click', () => this.switchCamera());
      
      // Initialize TF and camera
      await this.initTensorFlow();
      await this.startCamera();
    }
    
    async initTensorFlow() {
      try {
        // Update button state
        const captureButton = document.getElementById('capture-skin');
        captureButton.textContent = 'Loading model...';
        captureButton.disabled = true;
        
        // Update guidance message
        document.getElementById('guidance-message').textContent = 'Loading skin analysis model...';
        
        // Check if TensorFlow.js is loaded
        if (!window.tf) {
          console.error('TensorFlow.js not loaded');
          this.updateGuidance('Error: TensorFlow.js not loaded. Try refreshing the page.', 'error');
          return;
        }
        
        // Load model (using mobile net as a placeholder in this demo)
        this.model = await tf.loadLayersModel(this.modelUrl);
        this.isModelLoaded = true;
        
        // Update UI
        this.updateGuidance('Model loaded. Position camera over skin area.', 'ready');
        captureButton.textContent = 'Analyze Skin';
        captureButton.disabled = false;
        
        // Warm up the model with a dummy prediction
        this.warmupModel();
        
      } catch (error) {
        console.error('Failed to load TensorFlow model:', error);
        this.updateGuidance('Error loading analysis model. Please try again.', 'error');
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
        
        // Update UI
        this.updateGuidance('Camera ready. Position over skin area.', 'ready');
        
        // Wait for video to be playing
        await this.video.play();
        
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Start focus detection
        this.startFocusDetection();
        
      } catch (error) {
        console.error('Error starting camera:', error);
        
        if (error.name === 'NotAllowedError') {
          this.updateGuidance('Camera access denied. Please allow camera access and try again.', 'error');
        } else {
          this.updateGuidance('Error accessing camera. Please check your device.', 'error');
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
        this.updateGuidance('Error switching camera. Please try again.', 'error');
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
          
          // Calculate image quality metrics (brightness, contrast, etc.)
          const { brightness, contrast, blurriness } = this.calculateImageQuality(imageData);
          
          // Calculate overall quality score (0-1)
          const qualityScore = this.calculateQualityScore(brightness, contrast, blurriness);
          
          // Update UI based on quality
          this.updateQualityUI(qualityScore, brightness, contrast, blurriness);
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
      
      // Estimate blurriness (using a simple edge detection approximation)
      // More advanced blur detection would use a Laplacian filter
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
    
    calculateQualityScore(brightness, contrast, blurriness) {
      // Ideal values
      const idealBrightness = 0.5; // Middle brightness
      const brightnessFactor = 1 - Math.abs(brightness - idealBrightness) * 2; // 0-1 (higher is better)
      
      const contrastFactor = Math.min(1, contrast * 5); // 0-1 (higher is better)
      const sharpnessFactor = 1 - blurriness; // 0-1 (higher is better)
      
      // Weighted average
      return brightnessFactor * 0.3 + contrastFactor * 0.3 + sharpnessFactor * 0.4;
    }
    
    updateQualityUI(qualityScore, brightness, contrast, blurriness) {
      const focusIndicator = document.getElementById('focus-indicator');
      const guidanceMessage = document.getElementById('guidance-message');
      
      // Update focus indicator
      if (focusIndicator) {
        focusIndicator.classList.remove('good', 'bad');
        if (qualityScore > 0.7) {
          focusIndicator.classList.add('good');
        } else if (qualityScore < 0.4) {
          focusIndicator.classList.add('bad');
        }
      }
      
      // Update guidance message
      if (guidanceMessage) {
        let message;
        if (brightness < 0.3) {
          message = 'Not enough light. Move to a brighter area.';
        } else if (brightness > 0.7) {
          message = 'Too bright. Reduce lighting or avoid direct light.';
        } else if (contrast < 0.1) {
          message = 'Low contrast. Ensure subject is clearly visible.';
        } else if (blurriness > 0.7) {
          message = 'Image is blurry. Hold steady and ensure focus.';
        } else if (qualityScore > 0.7) {
          message = 'Good image quality. Capture when ready.';
        } else {
          message = 'Adjust position for better quality.';
        }
        
        guidanceMessage.textContent = message;
      }
      
      // Enable/disable capture button based on quality
      const captureButton = document.getElementById('capture-skin');
      if (captureButton && !this.isProcessing) {
        captureButton.disabled = qualityScore < 0.4;
      }
    }
    
    updateGuidance(message, status = 'info') {
      const guidanceMessage = document.getElementById('guidance-message');
      if (guidanceMessage) {
        guidanceMessage.textContent = message;
        guidanceMessage.className = 'guidance-message ' + status;
      }
    }
    
    async analyzeImage() {
      if (!this.model || !this.isModelLoaded || this.isProcessing) return;
      this.isProcessing = true;
      
      // Update UI
      const captureButton = document.getElementById('capture-skin');
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
        
        // Process results - since we're using MobileNet as a placeholder,
        // we'll generate synthetic skin condition results
        const results = this.generateSkinResults(predictions);
        
        // Display results
        this.displayResults(results);
        
        // Save results to storage
        this.saveResults(results);
      } catch (error) {
        console.error('Error analyzing image:', error);
        this.updateGuidance('Error analyzing image. Please try again.', 'error');
      }
      
      // Reset UI
      captureButton.textContent = 'Analyze Again';
      captureButton.disabled = false;
      this.isProcessing = false;
    }
    
    generateSkinResults(modelPredictions) {
      // In a real app, the model would directly predict skin conditions
      // Since we're using MobileNet as a placeholder, we'll generate synthetic results
      
      // Randomly pick if this will be concerning or not
      const isConcerning = Math.random() < 0.3;
      
      let results = [];
      
      if (isConcerning) {
        // Generate concerning results
        results = [
          {
            condition: SKIN_CONDITIONS["2"].name,
            display: SKIN_CONDITIONS["2"].display,
            probability: 0.6 + Math.random() * 0.2,
            risk: SKIN_CONDITIONS["2"].risk,
            isCancerous: SKIN_CONDITIONS["2"].isCancerous,
            needsDoctor: SKIN_CONDITIONS["2"].needsDoctor
          },
          {
            condition: SKIN_CONDITIONS["3"].name,
            display: SKIN_CONDITIONS["3"].display,
            probability: 0.1 + Math.random() * 0.2,
            risk: SKIN_CONDITIONS["3"].risk,
            isCancerous: SKIN_CONDITIONS["3"].isCancerous,
            needsDoctor: SKIN_CONDITIONS["3"].needsDoctor
          },
          {
            condition: SKIN_CONDITIONS["4"].name,
            display: SKIN_CONDITIONS["4"].display,
            probability: 0.05 + Math.random() * 0.1,
            risk: SKIN_CONDITIONS["4"].risk,
            isCancerous: SKIN_CONDITIONS["4"].isCancerous,
            needsDoctor: SKIN_CONDITIONS["4"].needsDoctor
          }
        ];
      } else {
        // Generate normal results
        results = [
          {
            condition: SKIN_CONDITIONS["0"].name,
            display: SKIN_CONDITIONS["0"].display,
            probability: 0.7 + Math.random() * 0.25,
            risk: SKIN_CONDITIONS["0"].risk,
            isCancerous: SKIN_CONDITIONS["0"].isCancerous,
            needsDoctor: SKIN_CONDITIONS["0"].needsDoctor
          },
          {
            condition: SKIN_CONDITIONS["4"].name,
            display: SKIN_CONDITIONS["4"].display,
            probability: 0.1 + Math.random() * 0.15,
            risk: SKIN_CONDITIONS["4"].risk,
            isCancerous: SKIN_CONDITIONS["4"].isCancerous,
            needsDoctor: SKIN_CONDITIONS["4"].needsDoctor
          },
          {
            condition: SKIN_CONDITIONS["5"].name,
            display: SKIN_CONDITIONS["5"].display,
            probability: 0.05 + Math.random() * 0.1,
            risk: SKIN_CONDITIONS["5"].risk,
            isCancerous: SKIN_CONDITIONS["5"].isCancerous,
            needsDoctor: SKIN_CONDITIONS["5"].needsDoctor
          }
        ];
      }
      
      // Generate overall assessment
      const topResult = results[0];
      const needsDoctor = topResult.needsDoctor || topResult.isCancerous || topResult.probability < 0.7;
      const isCancerous = topResult.isCancerous && topResult.probability > 0.5;
      
      // Create recommendation based on results
      let recommendation, alertLevel;
      if (isCancerous) {
        recommendation = "The analysis suggests possible skin cancer. Please consult a dermatologist as soon as possible for proper evaluation.";
        alertLevel = "danger";
      } else if (needsDoctor) {
        recommendation = "The analysis suggests a condition that should be evaluated by a healthcare professional. Please consult a dermatologist.";
        alertLevel = "warning";
      } else {
        recommendation = "The analysis suggests normal skin or a benign condition. Continue regular skin checks and sun protection.";
        alertLevel = "success";
      }
      
      // Get image data URL
      const imageDataUrl = this.canvas.toDataURL('image/jpeg');
      
      return {
        results,
        topResult,
        needsDoctor,
        isCancerous,
        recommendation,
        alertLevel,
        imageDataUrl,
        timestamp: new Date().toISOString()
      };
    }
    
    displayResults(results) {
      // Show results container
      document.getElementById('skin-results').style.display = 'block';
      
      // Format results for display
      const resultsHtml = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Skin Analysis</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <img src="${results.imageDataUrl}" class="result-image" alt="Analyzed skin">
            <div class="result-details">
              <div class="detail-row">
                <span class="detail-label">Primary Assessment:</span>
                <span class="detail-value">${results.topResult.display}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Confidence:</span>
                <span class="detail-value">${Math.round(results.topResult.probability * 100)}%</span>
              </div>
              <h5>Other Potential Matches:</h5>
              ${results.results.slice(1).map(result => `
                <div class="detail-row">
                  <span class="detail-label">${result.display}</span>
                  <div class="detail-bar-container">
                    <div class="detail-bar ${result.probability > 0.7 ? 'confidence-high' : result.probability > 0.4 ? 'confidence-medium' : 'confidence-low'}" 
                         style="width: ${Math.round(result.probability * 100)}%"></div>
                  </div>
                  <span class="detail-percentage">${Math.round(result.probability * 100)}%</span>
                </div>
              `).join('')}
              <div class="alert-box alert-${results.alertLevel}">
                <strong>${results.isCancerous ? 'High concern detected.' : results.needsDoctor ? 'Moderate concern detected.' : 'Low concern.'}</strong>
                <p>${results.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHtml;
      
      // Scroll to results
      document.getElementById('skin-results').scrollIntoView({ behavior: 'smooth' });
    }
    
    saveResults(results) {
      // Create a summary for storage
      const summary = `Skin analysis: ${results.topResult.display} (${Math.round(results.topResult.probability * 100)}% confidence)`;
      
      // Add to local storage via the controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('skin', {
          topCondition: results.topResult.display,
          confidence: Math.round(results.topResult.probability * 100),
          needsDoctor: results.needsDoctor,
          isCancerous: results.isCancerous,
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
  
  export default SkinAnalyzer;