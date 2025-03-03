// Health Assessment Platform - Main Application Code

// Global application state
const app = {
    activeModule: 'skin',
    camera: {
      stream: null,
      active: false,
      facingMode: 'environment' // 'environment' is back camera, 'user' is front camera
    },
    models: {
      skin: null,
      wound: null
    },
    classNames: {
      skin: {
        "0": "actinic_keratosis",
        "1": "basal_cell_carcinoma",
        "2": "dermatofibroma",
        "3": "melanoma",
        "4": "nevus",
        "5": "squamous_cell_carcinoma",
        "6": "seborrheic_keratosis",
        "7": "eczema",
        "8": "psoriasis",
        "9": "rosacea",
        "10": "acne"
      },
      wound: {
        "0": "clean",
        "1": "infected",
        "2": "deep",
        "3": "superficial",
        "4": "healing"
      }
    },
    results: {
      skin: [],
      wound: [],
      vision: [],
      hearing: [],
      vitals: [],
      motion: []
    },
    visionTest: {
      currentTest: null,
      step: 0,
      results: {}
    },
    hearingTest: {
      frequencies: [250, 500, 1000, 2000, 4000, 8000],
      currentFrequency: 0,
      results: {}
    },
    vitalsTest: {
      measuring: false,
      dataPoints: [],
      startTime: null
    },
    motionTest: {
      selectedJoint: null,
      recording: false,
      data: []
    }
  };
  
  // ====================================
  // Core Application Initialization
  // ====================================
  
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeModuleTabs();
    loadModels();
  });
  
  function setupEventListeners() {
    // Module navigation
    document.querySelectorAll('#module-tabs li').forEach(tab => {
      tab.addEventListener('click', () => switchModule(tab.dataset.module));
    });
  
    // Camera controls
    document.getElementById('switch-camera').addEventListener('click', switchCamera);
    document.getElementById('capture-skin').addEventListener('click', captureSkinImage);
    document.getElementById('capture-wound').addEventListener('click', captureWoundImage);
  
    // Vision test buttons
    document.querySelectorAll('.test-option').forEach(option => {
      option.addEventListener('click', () => selectVisionTest(option.dataset.test));
    });
    document.getElementById('next-vision-step').addEventListener('click', advanceVisionTest);
  
    // Hearing test buttons
    document.getElementById('test-sound').addEventListener('click', testAudioOutput);
    document.getElementById('start-hearing-test').addEventListener('click', startHearingTest);
  
    // Vitals measurement
    document.getElementById('start-vitals').addEventListener('click', toggleVitalsMeasurement);
  
    // Range of motion
    document.querySelectorAll('.motion-option').forEach(option => {
      option.addEventListener('click', () => selectMotionJoint(option.dataset.motion));
    });
    document.getElementById('start-motion').addEventListener('click', startMotionRecording);
    document.getElementById('stop-motion').addEventListener('click', stopMotionRecording);
  }
  
  function initializeModuleTabs() {
    switchModule('skin'); // Default to skin module on load
  }
  
  // ====================================
  // Model Loading & Initialization
  // ====================================
  
  async function loadModels() {
    updateModelStatus('Loading...');
  
    try {
      // For now, we'll use a progressive loading approach
      // Start by loading the most immediately needed models
      await loadSkinModel();
      
      updateModelStatus('Ready');
    } catch (error) {
      console.error('Error loading models:', error);
      updateModelStatus('Error', true);
    }
  }
  
  async function loadSkinModel() {
    try {
      updateModelStatus('Loading skin model...');
      
      // In a production app, this would load from your server or a CDN
      // For demo purposes, we'll create a simple dummy model
      
      // Try to load a real model if it exists
      try {
        app.models.skin = await tf.loadLayersModel('model/model.json');
        console.log('Loaded skin analysis model');
      } catch (modelError) {
        // Create a simulated model for demo purposes
        console.warn('Using simulated skin model for demo');
        app.models.skin = createDemoSkinModel();
      }
      
      return true;
    } catch (error) {
      console.error('Error loading skin model:', error);
      // Create fallback model for demo purposes
      app.models.skin = createDemoSkinModel();
      return false;
    }
  }
  
  // Demo model function - creates a fake model for demonstration
  function createDemoSkinModel() {
    return {
      predict: function(input) {
        return tf.tidy(() => {
          const classCount = Object.keys(app.classNames.skin).length;
          
          // Generate somewhat realistic probabilities
          const outputs = [];
          for (let i = 0; i < classCount; i++) {
            // Common skin conditions get higher probability by default
            if (i === 4) { // nevus (common mole)
              outputs.push(0.3 + Math.random() * 0.4);
            } else if (i === 10) { // acne
              outputs.push(0.2 + Math.random() * 0.3);
            } else if (i === 3) { // melanoma (occasionally high)
              outputs.push(Math.random() > 0.85 ? 0.6 + Math.random() * 0.3 : 0.05 + Math.random() * 0.1);
            } else {
              outputs.push(0.05 + Math.random() * 0.1);
            }
          }
          
          // Normalize to sum to 1
          const sum = outputs.reduce((a, b) => a + b, 0);
          const normalized = outputs.map(p => p / sum);
          
          return tf.tensor1d(normalized);
        });
      },
      dispose: function() { return true; }
    };
  }
  
  // ====================================
  // Module Switching
  // ====================================
  
  function switchModule(moduleName) {
    // Update tabs
    document.querySelectorAll('#module-tabs li').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.module === moduleName);
    });
    
    // Update content visibility
    document.querySelectorAll('.module-content').forEach(content => {
      content.classList.toggle('active', content.id === `module-${moduleName}`);
    });
    
    // Store active module
    app.activeModule = moduleName;
    
    // Initialize specific module needs
    initializeModuleSpecifics(moduleName);
  }
  
  function initializeModuleSpecifics(moduleName) {
    // Stop any active camera stream when switching away
    if (app.camera.active && app.camera.stream) {
      const currentVideoElement = document.getElementById(`video-${app.activeModule}`);
      if (currentVideoElement) {
        currentVideoElement.srcObject = null;
      }
      
      app.camera.stream.getTracks().forEach(track => track.stop());
      app.camera.active = false;
    }
    
    // Initialize module-specific functionality
    switch (moduleName) {
      case 'skin':
      case 'wound':
      case 'vitals':
      case 'motion':
        startCamera(moduleName);
        break;
      
      case 'vision':
        resetVisionTest();
        break;
      
      case 'hearing':
        // Reset hearing test UI
        resetHearingTest();
        break;
    }
  }
  
  // ====================================
  // Camera Functionality
  // ====================================
  
  async function startCamera(moduleName) {
    try {
      updateCameraStatus('Initializing...');
      
      // Get the specific video element for this module
      const videoElement = document.getElementById(`video-${moduleName}`);
      if (!videoElement) {
        throw new Error(`No video element found for module: ${moduleName}`);
      }
      
      // Request camera access
      const constraints = {
        video: {
          facingMode: app.camera.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store stream and update status
      app.camera.stream = stream;
      app.camera.active = true;
      videoElement.srcObject = stream;
      
      // Wait for video to be ready
      videoElement.onloadedmetadata = () => {
        updateCameraStatus('Active', false, true);
        
        // For skin module, initialize guidance system
        if (moduleName === 'skin') {
          startGuidanceSystem();
        }
      };
    } catch (error) {
      console.error('Camera error:', error);
      updateCameraStatus('Error', true);
      
      // Show error message to user
      alert(`Camera access error: ${error.message}. Please ensure you've granted camera permissions.`);
    }
  }
  
  function switchCamera() {
    // Toggle between front and back camera
    app.camera.facingMode = app.camera.facingMode === 'environment' ? 'user' : 'environment';
    
    // Restart camera with new facing mode
    startCamera(app.activeModule);
  }
  
  // ====================================
  // Skin Analysis Module
  // ====================================
  
  function startGuidanceSystem() {
    // Simple implementation for demo - in a real app, this would use more complex image analysis
    const videoElement = document.getElementById('video-skin');
    const focusIndicator = document.getElementById('focus-indicator');
    const guidanceMessage = document.getElementById('guidance-message');
    const progressBar = document.getElementById('guidance-progress-bar');
    
    // Simulate guidance with randomly increasing "focus score"
    let focusScore = 0;
    
    const guidanceInterval = setInterval(() => {
      if (!app.camera.active || app.activeModule !== 'skin') {
        clearInterval(guidanceInterval);
        return;
      }
      
      // Simulate increasing focus quality
      focusScore += (Math.random() * 0.1);
      if (focusScore > 1) focusScore = 1;
      
      // Update UI
      const percent = Math.round(focusScore * 100);
      progressBar.style.width = `${percent}%`;
      
      // Update indicator and message
      if (focusScore > 0.7) {
        focusIndicator.className = 'focus-indicator good';
        guidanceMessage.textContent = 'Good focus - ready for capture!';
        document.getElementById('capture-skin').classList.add('pulse-animation');
      } else if (focusScore > 0.4) {
        focusIndicator.className = 'focus-indicator';
        guidanceMessage.textContent = 'Getting better - hold steady...';
        document.getElementById('capture-skin').classList.remove('pulse-animation');
      } else {
        focusIndicator.className = 'focus-indicator bad';
        guidanceMessage.textContent = 'Improving focus - keep camera still...';
        document.getElementById('capture-skin').classList.remove('pulse-animation');
      }
    }, 200);
  }
  
  async function captureSkinImage() {
    const videoElement = document.getElementById('video-skin');
    const resultsContainer = document.getElementById('results-skin');
    const captureButton = document.getElementById('capture-skin');
    
    // Change button state
    captureButton.textContent = 'Processing...';
    captureButton.disabled = true;
    captureButton.classList.remove('pulse-animation');
    
    try {
      // Create a canvas to capture the image
      const canvas = document.getElementById('canvas-processor');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      
      // Draw the video frame to the canvas, centered and cropped to 224x224
      const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
      const centerX = (videoElement.videoWidth - size) / 2;
      const centerY = (videoElement.videoHeight - size) / 2;
      
      ctx.drawImage(
        videoElement, 
        centerX, centerY, size, size,
        0, 0, 224, 224
      );
      
      // Create an image from the canvas for display
      const displayCanvas = document.getElementById('canvas-display');
      displayCanvas.width = videoElement.videoWidth;
      displayCanvas.height = videoElement.videoHeight;
      displayCanvas.getContext('2d').drawImage(videoElement, 0, 0);
      
      // Analyze the image
      const imageData = await analyzeSkinImage(canvas);
      
      // Create a result display
      displaySkinResults(imageData, displayCanvas.toDataURL('image/jpeg'));
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      // Reset button state
      captureButton.textContent = 'Capture Image';
      captureButton.disabled = false;
    }
  }
  
  async function analyzeSkinImage(imageElement) {
    try {
      // Preprocess the image
      const tensor = tf.tidy(() => {
        // Convert to tensor, normalize to 0-1 range, and add batch dimension
        return tf.browser.fromPixels(imageElement)
          .toFloat()
          .div(tf.scalar(255.0))
          .expandDims(0);
      });
      
      // Run inference
      const predictions = await app.models.skin.predict(tensor).data();
      
      // Cleanup to prevent memory leaks
      tensor.dispose();
      
      // Format results
      const results = Array.from(predictions)
        .map((confidence, index) => ({
          label: app.classNames.skin[index] || `Class ${index}`,
          confidence: confidence
        }))
        .sort((a, b) => b.confidence - a.confidence);
      
      return results;
    } catch (error) {
      console.error('Analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }
  
  function displaySkinResults(results, imageDataUrl) {
    const resultsContainer = document.getElementById('results-skin');
    const timestamp = new Date().toLocaleString();
    
    // Remove "no results" message if present
    const noResults = resultsContainer.querySelector('.no-results');
    if (noResults) {
      resultsContainer.removeChild(noResults);
    }
    
    // Create result item
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    // Top 3 conditions
    const topResults = results.slice(0, 3);
    
    // Categorize for risk assessment
    const malignantLabels = ['melanoma', 'basal_cell_carcinoma', 'squamous_cell_carcinoma'];
    const malignantScore = results
      .filter(r => malignantLabels.includes(r.label))
      .reduce((sum, r) => sum + r.confidence, 0);
      
    // Determine alert level
    let alertHtml = '';
    if (malignantScore > 0.4) {
      alertHtml = `
        <div class="alert-box alert-danger">
          <strong>High concern detected.</strong> The analysis shows patterns consistent with potentially serious 
          skin conditions. Please consult a dermatologist promptly.
        </div>
      `;
    } else if (malignantScore > 0.15) {
      alertHtml = `
        <div class="alert-box alert-warning">
          <strong>Moderate concern.</strong> Some concerning patterns were detected. 
          Consider having this checked by a healthcare provider.
        </div>
      `;
    }
    
    // Format top result bars
    const resultBars = topResults.map(result => {
      const percent = (result.confidence * 100).toFixed(1);
      let confidenceClass = 'confidence-low';
      
      if (result.confidence > 0.7) {
        confidenceClass = 'confidence-high';
      } else if (result.confidence > 0.4) {
        confidenceClass = 'confidence-medium';
      }
      
      return `
        <div class="detail-row">
          <span class="detail-label">${formatLabel(result.label)}</span>
          <div class="detail-bar-container">
            <div class="detail-bar ${confidenceClass}" style="width: ${percent}%"></div>
          </div>
          <span class="detail-percentage">${percent}%</span>
        </div>
      `;
    }).join('');
    
    // Build HTML for the result
    resultItem.innerHTML = `
      <div class="result-header">
        <h4 class="result-title">Skin Analysis</h4>
        <span class="result-timestamp">${timestamp}</span>
      </div>
      <div class="result-content">
        <img src="${imageDataUrl}" class="result-image" alt="Analyzed skin">
        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Primary Assessment:</span>
            <span class="detail-value">${formatLabel(topResults[0].label)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Confidence:</span>
            <span class="detail-value">${(topResults[0].confidence * 100).toFixed(1)}%</span>
          </div>
          <h5>Other Potential Matches:</h5>
          ${resultBars}
          ${alertHtml}
        </div>
      </div>
    `;
    
    // Add to results container (at the top)
    resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
    
    // Store results
    app.results.skin.unshift({
      timestamp: timestamp,
      image: imageDataUrl,
      results: results
    });
    
    // Limit stored results to 10
    if (app.results.skin.length > 10) {
      app.results.skin.pop();
    }
  }
  
  // ====================================
  // Wound Assessment Module
  // ====================================
  
  async function captureWoundImage() {
    const videoElement = document.getElementById('video-wound');
    const resultsContainer = document.getElementById('results-wound');
    const captureButton = document.getElementById('capture-wound');
    const woundAge = document.getElementById('wound-age').value;
    
    // Change button state
    captureButton.textContent = 'Processing...';
    captureButton.disabled = true;
    
    try {
      // Create a canvas to capture the image
      const canvas = document.getElementById('canvas-processor');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      
      // Draw the video frame to the canvas, centered and cropped to 224x224
      const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
      const centerX = (videoElement.videoWidth - size) / 2;
      const centerY = (videoElement.videoHeight - size) / 2;
      
      ctx.drawImage(
        videoElement, 
        centerX, centerY, size, size,
        0, 0, 224, 224
      );
      
      // Create an image from the canvas for display
      const displayCanvas = document.getElementById('canvas-display');
      displayCanvas.width = videoElement.videoWidth;
      displayCanvas.height = videoElement.videoHeight;
      displayCanvas.getContext('2d').drawImage(videoElement, 0, 0);
      
      // For demo, create simulated wound analysis
      const results = simulateWoundAnalysis(woundAge);
      
      // Display results
      displayWoundResults(results, displayCanvas.toDataURL('image/jpeg'));
    } catch (error) {
      console.error('Error capturing wound image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      // Reset button state
      captureButton.textContent = 'Capture Wound Image';
      captureButton.disabled = false;
    }
  }
  
  // Demo function to simulate wound assessment
  function simulateWoundAnalysis(woundAge) {
    // This is a simulation for demo purposes
    // In a real application, you would use a machine learning model
    
    const woundAgeNum = parseInt(woundAge);
    
    // Create simulated assessments based on wound age
    let infectionRisk, healingProgress, stitchesNeeded, depth;
    
    if (woundAgeNum === 0) { // < 6 hours
      infectionRisk = 0.1 + (Math.random() * 0.2);
      healingProgress = 0.05 + (Math.random() * 0.1);
      stitchesNeeded = 0.3 + (Math.random() * 0.7); // Higher chance for fresh wounds
      depth = 0.4 + (Math.random() * 0.6);
    } else if (woundAgeNum === 1) { // 6-24 hours
      infectionRisk = 0.2 + (Math.random() * 0.3);
      healingProgress = 0.1 + (Math.random() * 0.2);
      stitchesNeeded = 0.2 + (Math.random() * 0.6);
      depth = 0.3 + (Math.random() * 0.7);
    } else if (woundAgeNum === 2) { // 1-3 days
      infectionRisk = 0.3 + (Math.random() * 0.4);
      healingProgress = 0.3 + (Math.random() * 0.3);
      stitchesNeeded = 0.1 + (Math.random() * 0.2); // Lower chance for older wounds
      depth = 0.3 + (Math.random() * 0.6);
    } else { // > 3 days
      infectionRisk = 0.4 + (Math.random() * 0.5);
      healingProgress = 0.5 + (Math.random() * 0.4);
      stitchesNeeded = 0.05 + (Math.random() * 0.1); // Much lower for older wounds
      depth = 0.2 + (Math.random() * 0.5);
    }
    
    return {
      infectionRisk,
      healingProgress,
      stitchesNeeded,
      depth,
      woundAge: woundAgeNum
    };
  }
  
  function displayWoundResults(results, imageDataUrl) {
    const resultsContainer = document.getElementById('results-wound');
    const timestamp = new Date().toLocaleString();
    
    // Remove "no results" message if present
    const noResults = resultsContainer.querySelector('.no-results');
    if (noResults) {
      resultsContainer.removeChild(noResults);
    }
    
    // Determine recommendations
    let recommendationHtml = '';
    let alertClass = 'alert-info';
    
    if (results.infectionRisk > 0.5) {
      alertClass = 'alert-danger';
      recommendationHtml = `
        <div class="alert-box ${alertClass}">
          <strong>Possible infection detected.</strong> Signs suggest this wound may be infected. 
          Please seek medical attention promptly.
        </div>
      `;
    } else if (results.stitchesNeeded > 0.6 && results.woundAge < 2) {
      alertClass = 'alert-warning';
      recommendationHtml = `
        <div class="alert-box ${alertClass}">
          <strong>Medical evaluation recommended.</strong> This wound may benefit from 
          proper closure (stitches, wound adhesive, etc.). Consider seeking medical care within 24 hours.
        </div>
      `;
    } else if (results.depth > 0.7) {
      alertClass = 'alert-warning';
      recommendationHtml = `
        <div class="alert-box ${alertClass}">
          <strong>Deep wound detected.</strong> This appears to be a deep wound. 
          Monitor carefully for signs of infection and consider medical evaluation.
        </div>
      `;
    } else {
      alertClass = 'alert-info';
      recommendationHtml = `
        <div class="alert-box ${alertClass}">
          <strong>Minor wound detected.</strong> Clean the wound thoroughly, keep it covered with a clean 
          bandage, and monitor for signs of infection.
        </div>
      `;
    }
    
    // Create result item
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    // Helper function for bar color
    const getBarClass = (value, reverse = false) => {
      if (reverse) {
        if (value < 0.3) return 'confidence-high';
        if (value < 0.6) return 'confidence-medium';
        return 'confidence-low';
      } else {
        if (value > 0.7) return 'confidence-low';
        if (value > 0.4) return 'confidence-medium';
        return 'confidence-high';
      }
    };
    
    // Build HTML for the result
    resultItem.innerHTML = `
      <div class="result-header">
        <h4 class="result-title">Wound Assessment</h4>
        <span class="result-timestamp">${timestamp}</span>
      </div>
      <div class="result-content">
        <img src="${imageDataUrl}" class="result-image" alt="Analyzed wound">
        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Infection Risk:</span>
            <div class="detail-bar-container">
              <div class="detail-bar ${getBarClass(results.infectionRisk, true)}" 
                   style="width: ${(results.infectionRisk * 100).toFixed(0)}%"></div>
            </div>
            <span class="detail-percentage">${(results.infectionRisk * 100).toFixed(0)}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Healing Progress:</span>
            <div class="detail-bar-container">
              <div class="detail-bar ${getBarClass(results.healingProgress)}" 
                   style="width: ${(results.healingProgress * 100).toFixed(0)}%"></div>
            </div>
            <span class="detail-percentage">${(results.healingProgress * 100).toFixed(0)}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Stitches Indicated:</span>
            <div class="detail-bar-container">
              <div class="detail-bar ${getBarClass(results.stitchesNeeded, true)}" 
                   style="width: ${(results.stitchesNeeded * 100).toFixed(0)}%"></div>
            </div>
            <span class="detail-percentage">${(results.stitchesNeeded * 100).toFixed(0)}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Wound Depth:</span>
            <div class="detail-bar-container">
              <div class="detail-bar ${getBarClass(results.depth, true)}" 
                   style="width: ${(results.depth * 100).toFixed(0)}%"></div>
            </div>
            <span class="detail-percentage">${(results.depth * 100).toFixed(0)}%</span>
          </div>
          ${recommendationHtml}
        </div>
      </div>
    `;
    
    // Add to results container (at the top)
    resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
    
    // Store results
    app.results.wound.unshift({
      timestamp: timestamp,
      image: imageDataUrl,
      results: results
    });
    
    // Limit stored results to 10
    if (app.results.wound.length > 10) {
      app.results.wound.pop();
    }
  }
  
  // ====================================
  // Vision Test Module
  // ====================================
  
  function resetVisionTest() {
    app.visionTest = {
      currentTest: null,
      step: 0,
      results: {}
    };
    
    const testContainer = document.getElementById('vision-test-container');
    testContainer.innerHTML = `
      <div class="test-instructions">
        <p>Select a test to begin. Hold your device at arm's length for accurate results.</p>
      </div>
    `;
    
    document.getElementById('next-vision-step').disabled = true;
    document.getElementById('next-vision-step').textContent = 'Start Test';
    
    // Remove active state from all test options
    document.querySelectorAll('.test-option').forEach(option => {
      option.classList.remove('active');
    });
  }
  
  function selectVisionTest(testType) {
    // Update UI to show selected test
    document.querySelectorAll('.test-option').forEach(option => {
      option.classList.toggle('active', option.dataset.test === testType);
    });
    
    // Reset test state
    app.visionTest.currentTest = testType;
    app.visionTest.step = 0;
    
    // Set up initial test UI
    const testContainer = document.getElementById('vision-test-container');
    
    switch (testType) {
      case 'acuity':
        testContainer.innerHTML = `
          <div class="test-instructions">
            <h4>Visual Acuity Test</h4>
            <p>This test will show letters of different sizes. Try to identify them correctly.</p>
            <p>Hold your device at arm's length (about 40cm or 16 inches) from your eyes.</p>
          </div>
        `;
        break;
        
      case 'color':
        testContainer.innerHTML = `
          <div class="test-instructions">
            <h4>Color Vision Test</h4>
            <p>This test will show patterns similar to Ishihara color plates. Try to identify the numbers hidden in the patterns.</p>
          </div>
        `;
        break;
        
      case 'astigmatism':
        testContainer.innerHTML = `
          <div class="test-instructions">
            <h4>Astigmatism Test</h4>
            <p>This test shows a pattern of lines. If some lines appear sharper or darker than others, it may indicate astigmatism.</p>
          </div>
        `;
        break;
    }
    
    // Enable start button
    document.getElementById('next-vision-step').disabled = false;
  }
  
  function advanceVisionTest() {
    const testType = app.visionTest.currentTest;
    const step = app.visionTest.step;
    const nextButton = document.getElementById('next-vision-step');
    
    if (!testType) return;
    
    // Update button text after first click
    if (step === 0) {
      nextButton.textContent = 'Next';
    }
    
    // Increment step counter
    app.visionTest.step++;
    
    // Vision tests implementation
    switch (testType) {
      case 'acuity':
        runAcuityTest(app.visionTest.step);
        break;
        
      case 'color':
        runColorTest(app.visionTest.step);
        break;
        
      case 'astigmatism':
        runAstigmatismTest(app.visionTest.step);
        break;
    }
  }
  
  function runAcuityTest(step) {
    const testContainer = document.getElementById('vision-test-container');
    const nextButton = document.getElementById('next-vision-step');
    
    // Very simple implementation for demo purposes
    if (step === 1) {
      // First step - show large letter
      testContainer.innerHTML = `
        <div class="vision-chart" style="font-size: 80px; margin-bottom: 20px; font-family: monospace;">
          E
        </div>
        <div class="vision-input">
          <p>What letter do you see?</p>
          <div class="button-group">
            <button class="vision-answer" data-answer="E">E</button>
            <button class="vision-answer" data-answer="F">F</button>
            <button class="vision-answer" data-answer="B">B</button>
          </div>
        </div>
      `;
      
      // Add event listeners to answer buttons
      document.querySelectorAll('.vision-answer').forEach(button => {
        button.addEventListener('click', (e) => {
          const answer = e.target.dataset.answer;
          app.visionTest.results.step1 = (answer === 'E');
          
          // Highlight selected answer
          document.querySelectorAll('.vision-answer').forEach(btn => {
            btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
            btn.style.color = btn === e.target ? 'white' : '';
          });
          
          // Auto-advance after short delay
          setTimeout(() => advanceVisionTest(), 800);
        });
      });
      
      // Disable next button until answer is selected
      nextButton.disabled = true;
    }
    else if (step === 2) {
      // Second step - show medium letter
      testContainer.innerHTML = `
        <div class="vision-chart" style="font-size: 40px; margin-bottom: 20px; font-family: monospace;">
          H
        </div>
        <div class="vision-input">
          <p>What letter do you see?</p>
          <div class="button-group">
            <button class="vision-answer" data-answer="N">N</button>
            <button class="vision-answer" data-answer="H">H</button>
            <button class="vision-answer" data-answer="K">K</button>
          </div>
        </div>
      `;
      
      // Add event listeners to answer buttons
      document.querySelectorAll('.vision-answer').forEach(button => {
        button.addEventListener('click', (e) => {
          const answer = e.target.dataset.answer;
          app.visionTest.results.step2 = (answer === 'H');
          
          // Highlight selected answer
          document.querySelectorAll('.vision-answer').forEach(btn => {
            btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
            btn.style.color = btn === e.target ? 'white' : '';
          });
          
          // Auto-advance after short delay
          setTimeout(() => advanceVisionTest(), 800);
        });
      });
      
      // Disable next button until answer is selected
      nextButton.disabled = true;
    }
    else if (step === 3) {
      // Third step - show small letter
      testContainer.innerHTML = `
        <div class="vision-chart" style="font-size: 20px; margin-bottom: 20px; font-family: monospace;">
          C
        </div>
        <div class="vision-input">
          <p>What letter do you see?</p>
          <div class="button-group">
            <button class="vision-answer" data-answer="C">C</button>
            <button class="vision-answer" data-answer="G">G</button>
            <button class="vision-answer" data-answer="O">O</button>
          </div>
        </div>
      `;
      
      // Add event listeners to answer buttons
      document.querySelectorAll('.vision-answer').forEach(button => {
        button.addEventListener('click', (e) => {
          const answer = e.target.dataset.answer;
          app.visionTest.results.step3 = (answer === 'C');
          
          // Highlight selected answer
          document.querySelectorAll('.vision-answer').forEach(btn => {
            btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
            btn.style.color = btn === e.target ? 'white' : '';
          });
          
          // Auto-advance after short delay
          setTimeout(() => advanceVisionTest(), 800);
        });
      });
      
      // Disable next button until answer is selected
      nextButton.disabled = true;
    }
    else {
      // Calculate and show results
      const correctAnswers = Object.values(app.visionTest.results).filter(Boolean).length;
      const totalQuestions = Object.keys(app.visionTest.results).length;
      const score = correctAnswers / totalQuestions;
      
      // Determine result message
      let resultMessage, alertClass;
      if (score === 1) {
        resultMessage = "Your visual acuity appears to be excellent. You correctly identified all characters.";
        alertClass = "alert-success";
      } else if (score >= 0.67) {
        resultMessage = "Your visual acuity appears to be good. Consider a professional eye exam for a more comprehensive assessment.";
        alertClass = "alert-info";
      } else {
        resultMessage = "You may benefit from a comprehensive eye examination. This simple test suggests potential visual acuity issues.";
        alertClass = "alert-warning";
      }
      
      // Show results
      testContainer.innerHTML = `
        <div class="test-results">
          <h4>Visual Acuity Results</h4>
          <p>You correctly identified ${correctAnswers} out of ${totalQuestions} characters.</p>
          <div class="alert-box ${alertClass}">
            ${resultMessage}
          </div>
          <p class="disclaimer-note">This is not a substitute for a professional eye examination.</p>
        </div>
      `;
      
      // Update results container
      const resultsContainer = document.getElementById('results-vision');
      resultsContainer.innerHTML = `
        <h3>Vision Test Results</h3>
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Visual Acuity Test</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-details">
            <div class="detail-row">
              <span class="detail-label">Score:</span>
              <span class="detail-value">${correctAnswers}/${totalQuestions} correct</span>
            </div>
            <div class="alert-box ${alertClass}" style="margin-top: 12px">
              ${resultMessage}
            </div>
          </div>
        </div>
      `;
      
      // Reset test button
      nextButton.textContent = 'Test Again';
      nextButton.disabled = false;
      nextButton.onclick = resetVisionTest;
      
      // Store results
      app.results.vision.unshift({
        timestamp: new Date().toLocaleString(),
        testType: 'acuity',
        score: score,
        details: app.visionTest.results
      });
    }
  }
  
  function runColorTest(step) {
    const testContainer = document.getElementById('vision-test-container');
    const nextButton = document.getElementById('next-vision-step');
    
    // Simple implementation for demo - in real app would use actual Ishihara plates
    const colorTests = [
      { number: '74', colors: ['#CD5C5C', '#F08080', '#FA8072', '#E9967A'], bgColors: ['#FFB6C1', '#FFA07A'] },
      { number: '6', colors: ['#66CDAA', '#8FBC8F', '#3CB371', '#2E8B57'], bgColors: ['#98FB98', '#90EE90'] },
      { number: '8', colors: ['#6A5ACD', '#483D8B', '#7B68EE', '#9370DB'], bgColors: ['#E6E6FA', '#D8BFD8'] }
    ];
    
    if (step <= colorTests.length) {
      const test = colorTests[step - 1];
      
      testContainer.innerHTML = `
        <div class="color-test">
          <p>What number do you see in the pattern?</p>
          <div class="ishihara-plate" id="color-plate"></div>
          <div class="button-group">
            <button class="vision-answer" data-answer="${test.number}">${test.number}</button>
            <button class="vision-answer" data-answer="none">Can't See Any Number</button>
            <button class="vision-answer" data-answer="different">Different Number</button>
          </div>
        </div>
      `;
      
      // Generate a simple simulated Ishihara plate with DOM elements
      // In a real app, these would be pre-created images
      createSimulatedIshiharaPlate('color-plate', test.number, test.colors, test.bgColors);
      
      // Add event listeners to answer buttons
      document.querySelectorAll('.vision-answer').forEach(button => {
        button.addEventListener('click', (e) => {
          const answer = e.target.dataset.answer;
          app.visionTest.results[`color${step}`] = (answer === test.number);
          
          // Highlight selected answer
          document.querySelectorAll('.vision-answer').forEach(btn => {
            btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
            btn.style.color = btn === e.target ? 'white' : '';
          });
          
          // Auto-advance after short delay
          setTimeout(() => advanceVisionTest(), 800);
        });
      });
      
      // Disable next button until answer is selected
      nextButton.disabled = true;
    } 
    else {
      // Calculate and show results
      const correctAnswers = Object.values(app.visionTest.results).filter(Boolean).length;
      const totalQuestions = Object.keys(app.visionTest.results).length;
      const score = correctAnswers / totalQuestions;
      
      // Determine result message
      let resultMessage, alertClass;
      if (score === 1) {
        resultMessage = "Your color vision appears to be normal. You correctly identified all patterns.";
        alertClass = "alert-success";
      } else if (score >= 0.67) {
        resultMessage = "Your color vision appears to be mostly normal. Consider a professional eye exam for a comprehensive assessment.";
        alertClass = "alert-info";
      } else {
        resultMessage = "You may have some form of color vision deficiency. Consider scheduling an eye examination for proper evaluation.";
        alertClass = "alert-warning";
      }
      
      // Show results
      testContainer.innerHTML = `
        <div class="test-results">
          <h4>Color Vision Results</h4>
          <p>You correctly identified ${correctAnswers} out of ${totalQuestions} patterns.</p>
          <div class="alert-box ${alertClass}">
            ${resultMessage}
          </div>
          <p class="disclaimer-note">This is not a substitute for a professional eye examination.</p>
        </div>
      `;
      
      // Update results container
      const resultsContainer = document.getElementById('results-vision');
      resultsContainer.innerHTML = `
        <h3>Vision Test Results</h3>
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Color Vision Test</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-details">
            <div class="detail-row">
              <span class="detail-label">Score:</span>
              <span class="detail-value">${correctAnswers}/${totalQuestions} correct</span>
            </div>
            <div class="alert-box ${alertClass}" style="margin-top: 12px">
              ${resultMessage}
            </div>
          </div>
        </div>
      `;
      
      // Reset test button
      nextButton.textContent = 'Test Again';
      nextButton.disabled = false;
      nextButton.onclick = resetVisionTest;
      
      // Store results
      app.results.vision.unshift({
        timestamp: new Date().toLocaleString(),
        testType: 'color',
        score: score,
        details: app.visionTest.results
      });
    }
  }
  
  // Helper function to create a simulated Ishihara plate with DOM elements
  function createSimulatedIshiharaPlate(elementId, number, colors, bgColors) {
    const plate = document.getElementById(elementId);
    plate.style.width = '250px';
    plate.style.height = '250px';
    plate.style.borderRadius = '50%';
    plate.style.position = 'relative';
    plate.style.overflow = 'hidden';
    plate.style.margin = '0 auto 20px auto';
    
    // Add background circles
    for (let i = 0; i < 300; i++) {
      const dot = document.createElement('div');
      const size = 5 + Math.random() * 15;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];
      dot.style.position = 'absolute';
      dot.style.left = `${Math.random() * 250}px`;
      dot.style.top = `${Math.random() * 250}px`;
      plate.appendChild(dot);
    }
    
    // Draw the number with different colored dots
    const digits = number.toString().split('');
    const centerX = 125;
    const centerY = 125;
    
    digits.forEach((digit, index) => {
      let offsetX = (index - (digits.length - 1) / 2) * 50;
      
      // Different patterns for different digits
      let points = [];
      if (digit === '0' || digit === '6' || digit === '8' || digit === '9') {
        // Draw a circle for 0, 6, 8, 9
        for (let angle = 0; angle < 360; angle += 12) {
          const radian = angle * Math.PI / 180;
          points.push({
            x: Math.cos(radian) * 30 + centerX + offsetX,
            y: Math.sin(radian) * 40 + centerY
          });
        }
        
        // For 6, 8, 9 add a line or another circle
        if (digit === '6') {
          for (let y = centerY - 40; y < centerY; y += 8) {
            points.push({ x: centerX + offsetX, y });
          }
        } else if (digit === '8') {
          for (let angle = 0; angle < 360; angle += 15) {
            const radian = angle * Math.PI / 180;
            points.push({
              x: Math.cos(radian) * 15 + centerX + offsetX,
              y: Math.sin(radian) * 15 + centerY - 20
            });
          }
        } else if (digit === '9') {
          for (let y = centerY; y < centerY + 40; y += 8) {
            points.push({ x: centerX + offsetX, y });
          }
        }
      } else if (digit === '1') {
        // Vertical line for 1
        for (let y = centerY - 40; y <= centerY + 40; y += 8) {
          points.push({ x: centerX + offsetX, y });
        }
      } else if (digit === '7') {
        // Horizontal line and diagonal for 7
        for (let x = centerX + offsetX - 30; x <= centerX + offsetX + 30; x += 8) {
          points.push({ x, y: centerY - 40 });
        }
        for (let i = 0; i <= 80; i += 8) {
          points.push({ 
            x: centerX + offsetX + 30 - i * 0.75, 
            y: centerY - 40 + i
          });
        }
      } else if (digit === '4') {
        // Vertical line and horizontal for 4
        for (let y = centerY - 40; y <= centerY + 40; y += 8) {
          points.push({ x: centerX + offsetX + 20, y });
        }
        for (let x = centerX + offsetX - 30; x <= centerX + offsetX + 20; x += 8) {
          points.push({ x, y: centerY });
        }
        for (let i = 0; i <= 40; i += 8) {
          points.push({ 
            x: centerX + offsetX - 30 + i, 
            y: centerY - i
          });
        }
      } else if (digit === '2') {
        // Curve and line for 2
        for (let angle = -30; angle <= 210; angle += 12) {
          const radian = angle * Math.PI / 180;
          points.push({
            x: Math.cos(radian) * 30 + centerX + offsetX,
            y: Math.sin(radian) * 25 + centerY - 15
          });
        }
        for (let x = centerX + offsetX - 30; x <= centerX + offsetX + 30; x += 8) {
          points.push({ x, y: centerY + 40 });
        }
      } else if (digit === '3') {
        // Two curves for 3
        for (let angle = -30; angle <= 210; angle += 12) {
          const radian = angle * Math.PI / 180;
          points.push({
            x: Math.cos(radian) * 25 + centerX + offsetX,
            y: Math.sin(radian) * 20 + centerY - 20
          });
        }
        for (let angle = -30; angle <= 210; angle += 12) {
          const radian = angle * Math.PI / 180;
          points.push({
            x: Math.cos(radian) * 25 + centerX + offsetX,
            y: Math.sin(radian) * 20 + centerY + 20
          });
        }
      } else if (digit === '5') {
        // Line and curve for 5
        for (let x = centerX + offsetX - 30; x <= centerX + offsetX + 30; x += 8) {
          points.push({ x, y: centerY - 40 });
        }
        for (let y = centerY - 40; y <= centerY; y += 8) {
          points.push({ x: centerX + offsetX - 30, y });
        }
        for (let angle = -30; angle <= 210; angle += 12) {
          const radian = angle * Math.PI / 180;
          points.push({
            x: Math.cos(radian) * 30 + centerX + offsetX,
            y: Math.sin(radian) * 25 + centerY + 15
          });
        }
      }
      
      // Draw the points for the digit
      points.forEach(point => {
        if (point.x >= 0 && point.x <= 250 && point.y >= 0 && point.y <= 250) {
          const dot = document.createElement('div');
          const size = 5 + Math.random() * 10;
          dot.style.width = `${size}px`;
          dot.style.height = `${size}px`;
          dot.style.borderRadius = '50%';
          dot.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          dot.style.position = 'absolute';
          dot.style.left = `${point.x - size/2}px`;
          dot.style.top = `${point.y - size/2}px`;
          plate.appendChild(dot);
        }
      });
    });
  }
  
  function runAstigmatismTest(step) {
    const testContainer = document.getElementById('vision-test-container');
    const nextButton = document.getElementById('next-vision-step');
    
    if (step === 1) {
      // First step - show radial lines
      testContainer.innerHTML = `
        <div class="astigmatism-test">
          <h4>Astigmatism Test</h4>
          <p>Look at the lines below. Do all lines appear equally dark and clear?</p>
          <div class="radial-lines" id="radial-lines"></div>
          <div class="button-group" style="margin-top: 20px">
            <button class="vision-answer" data-answer="equal">All lines look equal</button>
            <button class="vision-answer" data-answer="unequal">Some lines are darker/clearer</button>
          </div>
        </div>
      `;
      
      // Create radial lines
      createRadialLines('radial-lines');
      
      // Add event listeners to answer buttons
      document.querySelectorAll('.vision-answer').forEach(button => {
        button.addEventListener('click', (e) => {
          const answer = e.target.dataset.answer;
          app.visionTest.results.radialLines = (answer === 'unequal');
          
          // Highlight selected answer
          document.querySelectorAll('.vision-answer').forEach(btn => {
            btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
            btn.style.color = btn === e.target ? 'white' : '';
          });
          
          // Auto-advance after short delay
          setTimeout(() => advanceVisionTest(), 800);
        });
      });
      
      // Disable next button until answer is selected
      nextButton.disabled = true;
    }
    else if (step === 2) {
      // Second step - ask about direction
      testContainer.innerHTML = `
        <div class="astigmatism-test">
          <h4>If some lines appear darker/clearer, which direction?</h4>
          <div class="radial-lines" id="radial-lines"></div>
          <div class="button-group" style="margin-top: 20px">
            <button class="vision-answer" data-answer="horizontal">Horizontal lines</button>
            <button class="vision-answer" data-answer="vertical">Vertical lines</button>
            <button class="vision-answer" data-answer="diagonal">Diagonal lines</button>
            <button class="vision-answer" data-answer="equal">All lines look equal</button>
          </div>
        </div>
      `;
      
      // Create radial lines
      createRadialLines('radial-lines');
      
      // Add event listeners to answer buttons
      document.querySelectorAll('.vision-answer').forEach(button => {
        button.addEventListener('click', (e) => {
          const answer = e.target.dataset.answer;
          app.visionTest.results.lineDirection = answer;
          
          // Highlight selected answer
          document.querySelectorAll('.vision-answer').forEach(btn => {
            btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
            btn.style.color = btn === e.target ? 'white' : '';
          });
          
          // Auto-advance after short delay
          setTimeout(() => advanceVisionTest(), 800);
        });
      });
      
      // Disable next button until answer is selected
      nextButton.disabled = true;
    }
    else {
      // Show results
      const hasAstigmatism = app.visionTest.results.radialLines;
      let resultMessage, alertClass;
      
      if (hasAstigmatism) {
        resultMessage = "You may have astigmatism. You indicated that some lines appear clearer or darker than others, which is a common sign of astigmatism.";
        alertClass = "alert-warning";
      } else {
        resultMessage = "You likely don't have significant astigmatism. You indicated that all lines appear equally clear.";
        alertClass = "alert-success";
      }
      
      // Show results
      testContainer.innerHTML = `
        <div class="test-results">
          <h4>Astigmatism Test Results</h4>
          <div class="alert-box ${alertClass}">
            ${resultMessage}
          </div>
          ${hasAstigmatism ? 
            `<p>Line direction: ${app.visionTest.results.lineDirection}</p>` : 
            ''
          }
          <p class="disclaimer-note">This is not a substitute for a professional eye examination. For a proper diagnosis, please consult an eye care professional.</p>
        </div>
      `;
      
      // Update results container
      const resultsContainer = document.getElementById('results-vision');
      resultsContainer.innerHTML = `
        <h3>Vision Test Results</h3>
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Astigmatism Test</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-details">
            <div class="detail-row">
              <span class="detail-label">Possible Astigmatism:</span>
              <span class="detail-value">${hasAstigmatism ? 'Yes' : 'No'}</span>
            </div>
            ${hasAstigmatism ? 
              `<div class="detail-row">
                <span class="detail-label">Line Direction:</span>
                <span class="detail-value">${app.visionTest.results.lineDirection}</span>
              </div>` : 
              ''
            }
            <div class="alert-box ${alertClass}" style="margin-top: 12px">
              ${resultMessage}
            </div>
          </div>
        </div>
      `;
      
      // Reset test button
      nextButton.textContent = 'Test Again';
      nextButton.disabled = false;
      nextButton.onclick = resetVisionTest;
      
      // Store results
      app.results.vision.unshift({
        timestamp: new Date().toLocaleString(),
        testType: 'astigmatism',
        hasAstigmatism: hasAstigmatism,
        details: app.visionTest.results
      });
    }
  }
  
  // Helper to create radial lines for astigmatism test
  function createRadialLines(elementId) {
    const container = document.getElementById(elementId);
    container.style.width = '300px';
    container.style.height = '300px';
    container.style.position = 'relative';
    container.style.margin = '20px auto';
    
    const centerX = 150;
    const centerY = 150;
    const radius = 140;
    
    // Draw 12 radial lines
    for (let angle = 0; angle < 180; angle += 15) {
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.width = `${radius * 2}px`;
      line.style.height = '2px';
      line.style.backgroundColor = '#000';
      line.style.transformOrigin = 'center';
      line.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      line.style.left = '50%';
      line.style.top = '50%';
      container.appendChild(line);
    }
  }
  
  // ====================================
  // Hearing Test Module
  // ====================================
  
  function resetHearingTest() {
    app.hearingTest = {
      frequencies: [250, 500, 1000, 2000, 4000, 8000],
      currentFrequency: 0,
      results: {}
    };
    
    document.getElementById('start-hearing-test').disabled = false;
    document.getElementById('start-hearing-test').textContent = 'Start Hearing Test';
  }
  
  function testAudioOutput() {
    // Play a simple test tone
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000; // 1000Hz tone
    gainNode.gain.value = 0.2; // 20% volume
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      context.close();
    }, 1000);
    
    // Show message
    alert('A test tone was played. If you didn\'t hear anything, please check your volume settings and ensure your audio device is working properly.');
  }
  
  function startHearingTest() {
    const frequencyTest = document.getElementById('frequency-test');
    const startButton = document.getElementById('start-hearing-test');
    
    // Reset test
    app.hearingTest.currentFrequency = 0;
    app.hearingTest.results = {};
    
    // Update UI
    frequencyTest.innerHTML = `
      <h4>Frequency Hearing Test</h4>
      <p>Testing frequency: ${app.hearingTest.frequencies[0]} Hz</p>
      <p>Press the button when you hear the tone.</p>
      <div class="hearing-controls">
        <button id="heard-tone" class="primary-button">I Hear The Tone</button>
        <button id="cant-hear" class="secondary-button">I Cannot Hear Anything</button>
      </div>
    `;
    
    // Disable start button
    startButton.disabled = true;
    
    // Add listeners
    document.getElementById('heard-tone').addEventListener('click', () => recordHearingResponse(true));
    document.getElementById('cant-hear').addEventListener('click', () => recordHearingResponse(false));
    
    // Play the first tone
    playTone(app.hearingTest.frequencies[0]);
  }
  
  function playTone(frequency) {
    // Create audio context
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    // Set up oscillator
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    // Start with 0 volume and gradually increase
    gainNode.gain.value = 0;
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Start tone
    oscillator.start();
    
    // Gradually increase volume over 3 seconds
    gainNode.gain.linearRampToValueAtTime(0.02, context.currentTime + 0.5); // Start quiet
    gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 3); // Gradually increase
    
    // Store the context for stopping later
    app.hearingTest.currentContext = context;
    app.hearingTest.currentOscillator = oscillator;
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      if (app.hearingTest.currentOscillator === oscillator) {
        stopCurrentTone();
        
        // If no response, record as not heard
        if (app.hearingTest.results[frequency] === undefined) {
          recordHearingResponse(false);
        }
      }
    }, 10000);
  }
  
  function stopCurrentTone() {
    if (app.hearingTest.currentOscillator) {
      app.hearingTest.currentOscillator.stop();
      app.hearingTest.currentContext.close();
      app.hearingTest.currentOscillator = null;
      app.hearingTest.currentContext = null;
    }
  }
  
  function recordHearingResponse(heard) {
    // Stop current tone
    stopCurrentTone();
    
    // Record result
    const frequency = app.hearingTest.frequencies[app.hearingTest.currentFrequency];
    app.hearingTest.results[frequency] = heard;
    
    // Move to next frequency
    app.hearingTest.currentFrequency++;
    
    // If more frequencies to test
    if (app.hearingTest.currentFrequency < app.hearingTest.frequencies.length) {
      const nextFrequency = app.hearingTest.frequencies[app.hearingTest.currentFrequency];
      
      // Update UI
      const frequencyTest = document.getElementById('frequency-test');
      frequencyTest.innerHTML = `
        <h4>Frequency Hearing Test</h4>
        <p>Testing frequency: ${nextFrequency} Hz</p>
        <p>Press the button when you hear the tone.</p>
        <div class="hearing-controls">
          <button id="heard-tone" class="primary-button">I Hear The Tone</button>
          <button id="cant-hear" class="secondary-button">I Cannot Hear Anything</button>
        </div>
        <div class="progress-indicator">
          <p>Progress: ${app.hearingTest.currentFrequency}/${app.hearingTest.frequencies.length}</p>
        </div>
      `;
      
      // Add listeners
      document.getElementById('heard-tone').addEventListener('click', () => recordHearingResponse(true));
      document.getElementById('cant-hear').addEventListener('click', () => recordHearingResponse(false));
      
      // Play the next tone after a short delay
      setTimeout(() => {
        playTone(nextFrequency);
      }, 1000);
    } 
    else {
      // Test complete - show results
      showHearingResults();
    }
  }
  
  function showHearingResults() {
    const frequencyTest = document.getElementById('frequency-test');
    const resultsContainer = document.getElementById('results-hearing');
    
    // Calculate results
    const heardFrequencies = Object.entries(app.hearingTest.results)
      .filter(([_, heard]) => heard)
      .map(([freq, _]) => parseInt(freq));
    
    const lowestHeard = heardFrequencies.length > 0 ? Math.min(...heardFrequencies) : null;
    const highestHeard = heardFrequencies.length > 0 ? Math.max(...heardFrequencies) : null;
    
    // Determine hearing health status
    let status, description, alertClass;
    const heardCount = heardFrequencies.length;
    const totalCount = app.hearingTest.frequencies.length;
    
    if (heardCount === totalCount) {
      status = "Normal Hearing Range";
      description = "You were able to hear all test frequencies from 250Hz to 8000Hz, which suggests normal hearing ability.";
      alertClass = "alert-success";
    } else if (heardCount >= totalCount * 0.7) {
      status = "Mild Hearing Loss";
      description = "You were able to hear most frequencies, but had difficulty with some. This may indicate mild hearing loss.";
      alertClass = "alert-info";
    } else if (heardCount >= totalCount * 0.4) {
      status = "Moderate Hearing Concerns";
      description = "You had difficulty hearing several frequencies. This may suggest moderate hearing issues.";
      alertClass = "alert-warning";
    } else {
      status = "Significant Hearing Concerns";
      description = "You had difficulty hearing many of the test frequencies. This may indicate significant hearing issues.";
      alertClass = "alert-danger";
    }
    
    // Show results
    frequencyTest.innerHTML = `
      <h4>Hearing Test Results</h4>
      <div class="alert-box ${alertClass}">
        <strong>${status}</strong>
        <p>${description}</p>
      </div>
      <div class="hearing-details">
        <p>Frequencies you heard: ${heardFrequencies.length > 0 ? heardFrequencies.join('Hz, ') + 'Hz' : 'None'}</p>
        <p>Frequencies you couldn't hear: ${heardFrequencies.length < totalCount ? 
          app.hearingTest.frequencies.filter(f => !heardFrequencies.includes(f)).join('Hz, ') + 'Hz' : 
          'None'}</p>
      </div>
      <p class="disclaimer-note">This is a simple screening test. For a comprehensive hearing evaluation, please consult an audiologist.</p>
      <button id="restart-hearing-test" class="primary-button">Test Again</button>
    `;
    
    // Add listener for restart button
    document.getElementById('restart-hearing-test').addEventListener('click', resetHearingTest);
    
    // Update result container
    resultsContainer.innerHTML = `
      <h3>Hearing Test Results</h3>
      <div class="result-item">
        <div class="result-header">
          <h4 class="result-title">Frequency Hearing Test</h4>
          <span class="result-timestamp">${new Date().toLocaleString()}</span>
        </div>
        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">${status}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Frequencies Heard:</span>
            <span class="detail-value">${heardCount}/${totalCount}</span>
          </div>
          <div class="alert-box ${alertClass}" style="margin-top: 12px">
            ${description}
          </div>
        </div>
      </div>
    `;
    
    // Store results
    app.results.hearing.unshift({
      timestamp: new Date().toLocaleString(),
      heardFrequencies: heardFrequencies,
      status: status,
      results: app.hearingTest.results
    });
    
    // Enable the start button again
    document.getElementById('start-hearing-test').disabled = false;
  }
  
  // ====================================
  // Vitals Measurement Module
  // ====================================
  
  function toggleVitalsMeasurement() {
    if (app.vitalsTest.measuring) {
      stopVitalsMeasurement();
    } else {
      startVitalsMeasurement();
    }
  }
  
  function startVitalsMeasurement() {
    const startButton = document.getElementById('start-vitals');
    const timer = document.getElementById('measurement-time');
    const instructions = document.getElementById('pulse-instructions');
    const pulseCircle = document.querySelector('.pulse-circle');
    
    // Update UI
    startButton.textContent = 'Stop Measurement';
    instructions.textContent = 'Place fingertip over camera lens and hold steady';
    pulseCircle.classList.add('pulse-animation');
    
    // Reset measurement data
    app.vitalsTest.measuring = true;
    app.vitalsTest.dataPoints = [];
    app.vitalsTest.startTime = Date.now();
    
    // Start the timer
    app.vitalsTest.timerInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - app.vitalsTest.startTime) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
      const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
      timer.textContent = `${minutes}:${seconds}`;
      
      // Update instructions based on time
      if (elapsedSeconds > 5 && elapsedSeconds < 10) {
        instructions.textContent = 'Good, keep holding steady...';
      } else if (elapsedSeconds >= 10 && elapsedSeconds < 20) {
        instructions.textContent = 'Collecting pulse data...';
      } else if (elapsedSeconds >= 20) {
        instructions.textContent = 'Almost done, keep holding...';
      }
      
      // Auto-stop after 30 seconds
      if (elapsedSeconds >= 30) {
        stopVitalsMeasurement();
      }
    }, 1000);
    
    // Start the pulse analysis using the video frames
    startPulseAnalysis();
  }
  
  function stopVitalsMeasurement() {
    const startButton = document.getElementById('start-vitals');
    const instructions = document.getElementById('pulse-instructions');
    const pulseCircle = document.querySelector('.pulse-circle');
    
    // Update UI
    startButton.textContent = 'Start Heart Rate Measurement';
    instructions.textContent = 'Place your fingertip over the camera lens';
    pulseCircle.classList.remove('pulse-animation');
    
    // Stop the timer
    clearInterval(app.vitalsTest.timerInterval);
    
    // Set status to not measuring
    app.vitalsTest.measuring = false;
    
    // Stop any analysis
    clearInterval(app.vitalsTest.analysisInterval);
    
    // Calculate and show results
    calculateHeartRate();
  }
  
  function startPulseAnalysis() {
    const video = document.getElementById('video-vitals');
    const canvas = document.getElementById('canvas-processor');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 100;
    canvas.height = 100;
    
    // Set up analysis interval
    app.vitalsTest.analysisInterval = setInterval(() => {
      if (!app.vitalsTest.measuring) {
        clearInterval(app.vitalsTest.analysisInterval);
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate average red value (for pulse detection)
      let redSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        redSum += data[i]; // Red channel
      }
      const avgRed = redSum / (data.length / 4);
      
      // Store data point with timestamp
      app.vitalsTest.dataPoints.push({
        time: Date.now(),
        value: avgRed
      });
      
    }, 100); // Sample every 100ms
  }
  
  function calculateHeartRate() {
    // Ensure we have enough data points
    if (app.vitalsTest.dataPoints.length < 10) {
      showVitalsResults({
        heartRate: null,
        confidence: 'low',
        message: 'Not enough data collected. Please try again with better lighting and keep your finger steady.'
      });
      return;
    }
    
    // Simple heart rate calculation for demo
    // In a real app, this would use more sophisticated signal processing
    
    // Smooth the data with a simple moving average
    const smoothedData = [];
    const windowSize = 5;
    
    for (let i = windowSize; i < app.vitalsTest.dataPoints.length; i++) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += app.vitalsTest.dataPoints[i - j].value;
      }
      smoothedData.push({
        time: app.vitalsTest.dataPoints[i].time,
        value: sum / windowSize
      });
    }
    
    // Find peaks (local maxima)
    const peaks = [];
    for (let i = 1; i < smoothedData.length - 1; i++) {
      if (smoothedData[i].value > smoothedData[i-1].value && 
          smoothedData[i].value > smoothedData[i+1].value) {
        peaks.push(smoothedData[i]);
      }
    }
    
    // Calculate average time between peaks
    if (peaks.length < 2) {
      showVitalsResults({
        heartRate: null,
        confidence: 'low',
        message: 'Could not detect clear pulse signals. Please try again with better lighting and keep your finger steady.'
      });
      return;
    }
    
    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i].time - peaks[i-1].time);
    }
    
    // Calculate average interval in seconds
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length / 1000;
    
    // Convert to BPM
    const heartRate = Math.round(60 / avgInterval);
    
    // Determine confidence based on variance
    const variance = intervals.reduce((sum, val) => {
      const diff = val - (avgInterval * 1000);
      return sum + (diff * diff);
    }, 0) / intervals.length;
    
    let confidence, message;
    if (variance > 10000) {
      confidence = 'low';
      message = 'Heart rate measurement has low confidence due to signal variability. Try again in better lighting.';
    } else if (heartRate < 40 || heartRate > 200) {
      confidence = 'low';
      message = 'The measured heart rate is outside expected range. Please try again for a more accurate measurement.';
    } else {
      confidence = 'medium';
      message = 'Heart rate measurement complete. For medical purposes, multiple measurements over time provide better accuracy.';
    }
    
    // Show results
    showVitalsResults({
      heartRate,
      confidence,
      message
    });
  }
  
  function showVitalsResults(results) {
    const resultsContainer = document.getElementById('results-vitals');
    
    // Format results html
    if (results.heartRate) {
      // Valid heart rate detected
      const alertClass = results.confidence === 'high' ? 'alert-success' : 
                         results.confidence === 'medium' ? 'alert-info' : 
                         'alert-warning';
      
      // Determine heart rate category
      let category;
      if (results.heartRate < 60) {
        category = 'Bradycardia (Slow heart rate)';
      } else if (results.heartRate <= 100) {
        category = 'Normal resting heart rate';
      } else {
        category = 'Tachycardia (Elevated heart rate)';
      }
      
      resultsContainer.innerHTML = `
        <h3>Vital Signs Results</h3>
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Heart Rate Measurement</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-details">
            <div class="detail-row">
              <span class="detail-label">Heart Rate:</span>
              <span class="detail-value">${results.heartRate} BPM</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${category}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Confidence:</span>
              <span class="detail-value">${results.confidence}</span>
            </div>
            <div class="alert-box ${alertClass}" style="margin-top: 12px">
              ${results.message}
            </div>
          </div>
        </div>
      `;
      
      // Store results
      app.results.vitals.unshift({
        timestamp: new Date().toLocaleString(),
        heartRate: results.heartRate,
        confidence: results.confidence,
        category: category
      });
    } else {
      // No valid heart rate detected
      resultsContainer.innerHTML = `
        <h3>Vital Signs Results</h3>
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Heart Rate Measurement</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-details">
            <div class="alert-box alert-warning" style="margin-top: 12px">
              ${results.message}
            </div>
            <p>Tips for better measurements:</p>
            <ul>
              <li>Ensure good lighting conditions</li>
              <li>Place your fingertip directly over the camera lens</li>
              <li>Hold your finger steady during measurement</li>
              <li>Try different fingers if needed</li>
            </ul>
          </div>
        </div>
      `;
    }
  }
  
  // ====================================
  // Range of Motion Module
  // ====================================
  
  function selectMotionJoint(joint) {
    // Update UI to show selected joint
    document.querySelectorAll('.motion-option').forEach(option => {
      option.classList.toggle('active', option.dataset.motion === joint);
    });
    
    // Update instructions
    document.getElementById('motion-instructions').textContent = `Place device to view your ${joint} joint`;
    
    // Store selected joint
    app.motionTest.selectedJoint = joint;
    
    // Enable start button
    document.getElementById('start-motion').disabled = false;
    document.getElementById('stop-motion').disabled = true;
  }
  
  function startMotionRecording() {
    if (!app.motionTest.selectedJoint) return;
    
    // Update UI
    document.getElementById('start-motion').disabled = true;
    document.getElementById('stop-motion').disabled = false;
    document.getElementById('motion-instructions').textContent = 
      `Move your ${app.motionTest.selectedJoint} through its full range of motion slowly`;
    
    // Reset data
    app.motionTest.recording = true;
    app.motionTest.data = [];
    app.motionTest.startTime = Date.now();
    
    // Start recording (in a real app, this would capture video frames for analysis)
    app.motionTest.recordingInterval = setInterval(() => {
      if (app.motionTest.recording) {
        // In a real app, this would analyze each frame for joint positions
        // For this demo, we'll simulate data
        simulateMotionData();
      } else {
        clearInterval(app.motionTest.recordingInterval);
      }
    }, 100);
  }
  
  function stopMotionRecording() {
    // Stop recording
    app.motionTest.recording = false;
    clearInterval(app.motionTest.recordingInterval);
    
    // Update UI
    document.getElementById('start-motion').disabled = false;
    document.getElementById('stop-motion').disabled = true;
    document.getElementById('motion-instructions').textContent = `Recording complete`;
    
    // Calculate and display results
    analyzeMotionData();
  }
  
  function simulateMotionData() {
    // This simulates data collection for motion analysis
    // In a real app, this would use computer vision to track joint positions
    
    const elapsedTime = (Date.now() - app.motionTest.startTime) / 1000;
    const maxAngle = getMaxAngleForJoint(app.motionTest.selectedJoint);
    
    // Simulate a motion pattern (starting at 0, reaching max, returning to 0)
    // Using a sine wave to simulate movement
    const frequency = 0.25; // One complete motion takes about 4 seconds
    const angle = (maxAngle / 2) * (1 + Math.sin(2 * Math.PI * frequency * elapsedTime - Math.PI/2));
    
    // Add some noise
    const noise = (Math.random() - 0.5) * 5;
    
    // Store data point
    app.motionTest.data.push({
      time: elapsedTime,
      angle: angle + noise
    });
  }
  
  function getMaxAngleForJoint(joint) {
    // Typical expected range of motion values for each joint
    // These are approximate values for healthy adults
    switch (joint) {
      case 'shoulder': return 180; // Shoulder flexion/extension
      case 'elbow': return 150; // Elbow flexion
      case 'wrist': return 80; // Wrist flexion/extension
      case 'knee': return 140; // Knee flexion
      case 'ankle': return 65; // Ankle plantar/dorsiflexion
      default: return 90;
    }
  }
  
  function analyzeMotionData() {
    // Ensure we have data
    if (app.motionTest.data.length < 10) {
      alert('Not enough data collected. Please try again.');
      return;
    }
    
    // Find maximum angle achieved
    const angles = app.motionTest.data.map(d => d.angle);
    const maxAngle = Math.max(...angles);
    const expectedMax = getMaxAngleForJoint(app.motionTest.selectedJoint);
    
    // Calculate smoothness of motion
    // Standard deviation of the rate of change can indicate smoothness
    const rates = [];
    for (let i = 1; i < app.motionTest.data.length; i++) {
      const rate = (app.motionTest.data[i].angle - app.motionTest.data[i-1].angle) / 
                  (app.motionTest.data[i].time - app.motionTest.data[i-1].time);
      rates.push(rate);
    }
    
    // Calculate standard deviation
    const avgRate = rates.reduce((sum, val) => sum + val, 0) / rates.length;
    const variance = rates.reduce((sum, val) => sum + Math.pow(val - avgRate, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    
    // Determine ROM percentage compared to expected
    const romPercentage = (maxAngle / expectedMax) * 100;
    
    // Determine smoothness score (lower std dev is smoother)
    const smoothnessScore = Math.max(0, 100 - (stdDev * 5));
    
    // Generate results
    let romCategory, romMessage, alertClass;
    
    if (romPercentage >= 85) {
      romCategory = "Normal Range of Motion";
      romMessage = `Your ${app.motionTest.selectedJoint} shows normal range of motion, reaching approximately ${maxAngle.toFixed(1)}° out of an expected ${expectedMax}°.`;
      alertClass = "alert-success";
    } else if (romPercentage >= 60) {
      romCategory = "Slightly Limited Range of Motion";
      romMessage = `Your ${app.motionTest.selectedJoint} shows slightly limited range of motion, reaching approximately ${maxAngle.toFixed(1)}° out of an expected ${expectedMax}°.`;
      alertClass = "alert-info";
    } else {
      romCategory = "Restricted Range of Motion";
      romMessage = `Your ${app.motionTest.selectedJoint} shows restricted range of motion, reaching approximately ${maxAngle.toFixed(1)}° out of an expected ${expectedMax}°.`;
      alertClass = "alert-warning";
    }
    
    // Display results
    const resultsContainer = document.getElementById('results-motion');
    resultsContainer.innerHTML = `
      <h3>Motion Assessment Results</h3>
      <div class="result-item">
        <div class="result-header">
          <h4 class="result-title">${formatLabel(app.motionTest.selectedJoint)} Range of Motion</h4>
          <span class="result-timestamp">${new Date().toLocaleString()}</span>
        </div>
        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Maximum Angle:</span>
            <span class="detail-value">${maxAngle.toFixed(1)}°</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Expected Range:</span>
            <span class="detail-value">${expectedMax}°</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">ROM Percentage:</span>
            <span class="detail-value">${romPercentage.toFixed(1)}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Movement Smoothness:</span>
            <span class="detail-value">${smoothnessScore.toFixed(0)}%</span>
          </div>
          <div class="alert-box ${alertClass}" style="margin-top: 12px">
            <strong>${romCategory}</strong>
            <p>${romMessage}</p>
            <p>Movement smoothness: ${
              smoothnessScore > 80 ? 'Smooth, consistent movement' : 
              smoothnessScore > 60 ? 'Somewhat jerky movement' : 
              'Inconsistent, jerky movement'
            }</p>
          </div>
        </div>
      </div>
    `;
    
    // Store the results
    app.results.motion.unshift({
      timestamp: new Date().toLocaleString(),
      joint: app.motionTest.selectedJoint,
      maxAngle: maxAngle,
      romPercentage: romPercentage,
      smoothness: smoothnessScore,
      category: romCategory
    });
  }
  
  // ====================================
  // Utility Functions
  // ====================================
  
  function updateCameraStatus(status, isError = false, isReady = false) {
    const statusElement = document.getElementById('camera-status');
    statusElement.textContent = status;
    statusElement.classList.toggle('status-error', isError);
    statusElement.classList.toggle('status-ready', isReady);
  }
  
  function updateModelStatus(status, isError = false) {
    const statusElement = document.getElementById('model-status');
    statusElement.textContent = status;
    statusElement.classList.toggle('status-error', isError);
    statusElement.classList.toggle('status-ready', !isError && status === 'Ready');
  }
  
  function formatLabel(label) {
    // Convert snake_case or kebab-case to Title Case
    return label
      .replace(/_|-/g, ' ')
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }