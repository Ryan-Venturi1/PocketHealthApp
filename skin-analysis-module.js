// skin-analysis-module.js - Functional implementation of the skin analysis module

// Module dependencies
import * as tf from '@tensorflow/tfjs';

// Configuration
const IMAGE_SIZE = 224; // Input size for MobileNet
const SKIN_CONDITIONS = {
  "0": { name: "actinic_keratosis", display: "Actinic Keratosis", risk: "moderate" },
  "1": { name: "basal_cell_carcinoma", display: "Basal Cell Carcinoma", risk: "high" },
  "2": { name: "dermatofibroma", display: "Dermatofibroma", risk: "low" },
  "3": { name: "melanoma", display: "Melanoma", risk: "high" },
  "4": { name: "nevus", display: "Nevus (Mole)", risk: "low" },
  "5": { name: "squamous_cell_carcinoma", display: "Squamous Cell Carcinoma", risk: "high" },
  "6": { name: "seborrheic_keratosis", display: "Seborrheic Keratosis", risk: "low" },
  "7": { name: "eczema", display: "Eczema", risk: "low" },
  "8": { name: "psoriasis", display: "Psoriasis", risk: "low" },
  "9": { name: "rosacea", display: "Rosacea", risk: "low" },
  "10": { name: "acne", display: "Acne", risk: "low" }
};

// Module state
const skinModule = {
  model: null,
  camera: {
    stream: null,
    active: false
  },
  isModelLoaded: false,
  processingCanvas: null,
  displayCanvas: null
};

/**
 * Initialize the skin analysis module
 */
export async function initSkinModule() {
  try {
    // Create processing canvas
    skinModule.processingCanvas = document.getElementById('canvas-processor') || 
      document.createElement('canvas');
    skinModule.processingCanvas.width = IMAGE_SIZE;
    skinModule.processingCanvas.height = IMAGE_SIZE;
    
    // Create display canvas
    skinModule.displayCanvas = document.getElementById('canvas-display') || 
      document.createElement('canvas');
    
    // Load the model
    updateStatus('Loading skin analysis model...');
    
    // Try to load the model from the specified path
    try {
      skinModule.model = await tf.loadLayersModel('./models/skin-analysis-model/model.json');
      skinModule.isModelLoaded = true;
      updateStatus('Model loaded successfully');
      
      // Warm up the model with a dummy prediction
      await warmupModel();
    } catch (modelError) {
      console.warn('Could not load local model, using MobileNet:', modelError);
      
      // Fallback to MobileNet
      skinModule.model = await tf.loadLayersModel(
        'https://storage.googleapis.com/tfjs-models/tfhub/mobilenet_v2_100_224/model.json'
      );
      skinModule.isModelLoaded = true;
      updateStatus('Using fallback model (MobileNet)');
      
      // Warm up the model
      await warmupModel();
    }
    
    // Set up event listeners
    const captureButton = document.getElementById('capture-skin');
    if (captureButton) {
      captureButton.addEventListener('click', captureSkinImage);
    }
    
    const switchCameraButton = document.getElementById('switch-camera');
    if (switchCameraButton) {
      switchCameraButton.addEventListener('click', switchCamera);
    }
    
    // Start camera automatically
    await startCamera();
    
    return { status: 'initialized' };
  } catch (error) {
    console.error('Error initializing skin module:', error);
    updateStatus('Error initializing module', true);
    return { status: 'error', message: error.message };
  }
}

/**
 * Update the module status
 */
function updateStatus(message, isError = false) {
  const statusElement = document.getElementById('model-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'status-error' : 'status-ready';
  }
  
  // Also update camera status if needed
  if (message.includes('camera')) {
    const cameraStatus = document.getElementById('camera-status');
    if (cameraStatus) {
      cameraStatus.textContent = message;
      cameraStatus.className = isError ? 'status-error' : 'status-ready';
    }
  }
  
  console.log(`Skin Module: ${message}`);
}

/**
 * Start the camera feed
 */
export async function startCamera() {
  try {
    // Check if camera is already active
    if (skinModule.camera.active && skinModule.camera.stream) {
      return { status: 'already_active' };
    }
    
    updateStatus('Accessing camera...');
    
    // Request camera permissions
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment', // Use back camera by default
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
    // Store the stream
    skinModule.camera.stream = stream;
    skinModule.camera.active = true;
    
    // Set up the video element
    const videoElement = document.getElementById('video-skin');
    if (videoElement) {
      videoElement.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise(resolve => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(resolve);
        };
      });
      
      // Set display canvas size to match video
      skinModule.displayCanvas.width = videoElement.videoWidth;
      skinModule.displayCanvas.height = videoElement.videoHeight;
      
      // Start focus detection
      startFocusDetection(videoElement);
    }
    
    updateStatus('Camera ready');
    
    return { status: 'camera_started' };
  } catch (error) {
    console.error('Error starting camera:', error);
    
    let errorMessage = 'Error accessing camera';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera access denied by user';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera detected on this device';
    }
    
    updateStatus(errorMessage, true);
    return { status: 'error', message: errorMessage };
  }
}

/**
 * Stop the camera feed
 */
export function stopCamera() {
  if (skinModule.camera.stream) {
    skinModule.camera.stream.getTracks().forEach(track => track.stop());
    skinModule.camera.stream = null;
    skinModule.camera.active = false;
    
    const videoElement = document.getElementById('video-skin');
    if (videoElement) {
      videoElement.srcObject = null;
    }
    
    updateStatus('Camera stopped');
    return { status: 'camera_stopped' };
  }
  
  return { status: 'not_active' };
}

/**
 * Switch between front and back cameras
 */
export async function switchCamera() {
  // Stop current camera
  stopCamera();
  
  // Toggle facing mode
  const currentFacingMode = skinModule.camera.facingMode || 'environment';
  skinModule.camera.facingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  
  // Restart with new facing mode
  await startCamera();
  
  return { status: 'camera_switched', facingMode: skinModule.camera.facingMode };
}

/**
 * Continuously analyze video feed for focus/quality
 */
function startFocusDetection(videoElement) {
  const focusIndicator = document.getElementById('focus-indicator');
  const guidanceMessage = document.getElementById('guidance-message');
  const progressBar = document.getElementById('guidance-progress-bar');
  
  if (!focusIndicator || !videoElement) return;
  
  const analyzeFrame = () => {
    if (!skinModule.camera.active) return;
    
    try {
      // Draw current frame to canvas
      const canvas = skinModule.processingCanvas;
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
      const { brightness, contrast, blurriness } = calculateImageQuality(imageData);
      
      // Calculate overall quality score (0-1)
      const qualityScore = calculateQualityScore(brightness, contrast, blurriness);
      
      // Update UI based on quality
      updateQualityUI(qualityScore, brightness, contrast, blurriness);
    } catch (error) {
      console.error('Error in focus detection:', error);
    }
    
    // Continue analyzing frames
    requestAnimationFrame(analyzeFrame);
  };
  
  // Start the analysis loop
  analyzeFrame();
  
  // Helper function to calculate image quality metrics
  function calculateImageQuality(imageData) {
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
  
  // Calculate overall quality score
  function calculateQualityScore(brightness, contrast, blurriness) {
    // Ideal values
    const idealBrightness = 0.5; // Middle brightness
    const brightnessFactor = 1 - Math.abs(brightness - idealBrightness) * 2; // 0-1 (higher is better)
    
    const contrastFactor = Math.min(1, contrast * 5); // 0-1 (higher is better)
    const sharpnessFactor = 1 - blurriness; // 0-1 (higher is better)
    
    // Weighted average (customize weights based on importance)
    return brightnessFactor * 0.3 + contrastFactor * 0.3 + sharpnessFactor * 0.4;
  }
  
  // Update UI based on quality
  function updateQualityUI(qualityScore, brightness, contrast, blurriness) {
    // Update focus indicator
    focusIndicator.classList.remove('good', 'bad');
    if (qualityScore > 0.7) {
      focusIndicator.classList.add('good');
    } else if (qualityScore < 0.4) {
      focusIndicator.classList.add('bad');
    }
    
    // Update guidance message
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
    
    if (guidanceMessage) {
      guidanceMessage.textContent = message;
    }
    
    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${qualityScore * 100}%`;
    }
    
    // Enable/disable capture button based on quality
    const captureButton = document.getElementById('capture-skin');
    if (captureButton) {
      captureButton.disabled = qualityScore < 0.4;
      
      // Add pulse animation when quality is good
      if (qualityScore > 0.7) {
        captureButton.classList.add('pulse-animation');
      } else {
        captureButton.classList.remove('pulse-animation');
      }
    }
  }
}

/**
 * Capture an image from the video feed for analysis
 */
export async function captureSkinImage() {
  try {
    // Check if camera and model are ready
    if (!skinModule.camera.active || !skinModule.isModelLoaded) {
      throw new Error('Camera or model not ready');
    }
    
    // Get video element
    const videoElement = document.getElementById('video-skin');
    if (!videoElement) {
      throw new Error('Video element not found');
    }
    
    // Change button state
    const captureButton = document.getElementById('capture-skin');
    if (captureButton) {
      captureButton.textContent = 'Processing...';
      captureButton.disabled = true;
      captureButton.classList.remove('pulse-animation');
    }
    
    // Get focus quality from UI
    const focusIndicator = document.getElementById('focus-indicator');
    const focusQuality = focusIndicator.classList.contains('good') ? 0.9 : 
                         focusIndicator.classList.contains('bad') ? 0.3 : 0.6;
    
    // Draw video frame to processing canvas
    const processingCtx = skinModule.processingCanvas.getContext('2d');
    
    // Find the center portion of the video (square)
    const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
    const offsetX = (videoElement.videoWidth - size) / 2;
    const offsetY = (videoElement.videoHeight - size) / 2;
    
    // Draw center portion to processing canvas
    processingCtx.drawImage(
      videoElement, 
      offsetX, offsetY, size, size,
      0, 0, IMAGE_SIZE, IMAGE_SIZE
    );
    
    // Draw full frame to display canvas
    skinModule.displayCanvas.width = videoElement.videoWidth;
    skinModule.displayCanvas.height = videoElement.videoHeight;
    const displayCtx = skinModule.displayCanvas.getContext('2d');
    displayCtx.drawImage(videoElement, 0, 0);
    
    // Get image data URL for display
    const imageDataUrl = skinModule.displayCanvas.toDataURL('image/jpeg');
    
    // Analyze the image
    const analysisResult = await analyzeSkinImage(skinModule.processingCanvas);
    
    // Display results
    displaySkinResults(analysisResult, imageDataUrl, focusQuality);
    
    // Reset button state
    if (captureButton) {
      captureButton.textContent = 'Capture Image';
      captureButton.disabled = false;
    }
    
    return {
      status: 'captured',
      image: imageDataUrl,
      analysis: analysisResult
    };
  } catch (error) {
    console.error('Error capturing image:', error);
    
    // Reset button state
    const captureButton = document.getElementById('capture-skin');
    if (captureButton) {
      captureButton.textContent = 'Capture Image';
      captureButton.disabled = false;
    }
    
    updateStatus('Error capturing image: ' + error.message, true);
    return { status: 'error', message: error.message };
  }
}

/**
 * Analyze skin image using TensorFlow model
 */
async function analyzeSkinImage(imageElement) {
  try {
    // Preprocess the image
    const tensor = preprocessImage(imageElement);
    
    // Run inference
    const predictions = await skinModule.model.predict(tensor).data();
    
    // Cleanup to prevent memory leaks
    tensor.dispose();
    
    // Format results
    const results = Array.from(predictions)
      .map((confidence, index) => ({
        label: SKIN_CONDITIONS[index]?.name || `Class ${index}`,
        display: SKIN_CONDITIONS[index]?.display || `Class ${index}`,
        confidence: confidence,
        risk: SKIN_CONDITIONS[index]?.risk || "unknown"
      }))
      .filter(result => result.confidence >= 0.1) // Filter by confidence threshold
      .sort((a, b) => b.confidence - a.confidence);
    
    // Calculate overall risk assessment
    const highRiskScore = results
      .filter(r => r.risk === "high")
      .reduce((sum, r) => sum + r.confidence, 0);
    
    // Add risk assessment to results
    const riskAssessment = {
      highRiskScore,
      level: highRiskScore > 0.4 ? "high" : 
             highRiskScore > 0.15 ? "moderate" : "low",
      recommendation: {
        level: highRiskScore > 0.4 ? "high" : 
              highRiskScore > 0.15 ? "moderate" : "low",
        message: highRiskScore > 0.4 ? 
          "High concern detected. Please consult a dermatologist promptly." :
          highRiskScore > 0.15 ? 
          "Moderate concern. Consider having this checked by a healthcare provider." :
          "Low concern. Continue regular skin checks and sun protection."
      }
    };
    
    return { results, riskAssessment };
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error('Failed to analyze image');
  }
}

/**
 * Preprocess image for the model
 */
function preprocessImage(imageElement) {
  return tf.tidy(() => {
    // Read the image data
    let tensor = tf.browser.fromPixels(imageElement)
      .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE]) // Resize to model input size
      .toFloat();
    
    // Normalize values to [-1, 1] for MobileNet
    tensor = tensor.sub(127.5).div(127.5);
    
    // Add batch dimension
    return tensor.expandDims(0);
  });
}

/**
 * Display skin analysis results in UI
 */
function displaySkinResults(analysis, imageDataUrl, imageQuality) {
  const resultsContainer = document.getElementById('results-skin');
  const timestamp = new Date().toLocaleString();
  
  if (!resultsContainer) return;
  
  // Remove "no results" message if present
  const noResults = resultsContainer.querySelector('.no-results');
  if (noResults) {
    resultsContainer.removeChild(noResults);
  }
  
  // Create result item
  const resultItem = document.createElement('div');
  resultItem.className = 'result-item';
  
  // Top 3 conditions from results
  const topResults = analysis.results.slice(0, 3);
  
  // Format alert based on risk assessment
  const alertClass = analysis.riskAssessment.level === 'high' ? 'alert-danger' : 
                    analysis.riskAssessment.level === 'moderate' ? 'alert-warning' : 
                    'alert-info';
  
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
        <span class="detail-label">${result.display}</span>
        <div class="detail-bar-container">
          <div class="detail-bar ${confidenceClass}" style="width: ${percent}%"></div>
        </div>
        <span class="detail-percentage">${percent}%</span>
      </div>
    `;
  }).join('');
  
  // Add image quality warning if poor
  const qualityWarning = imageQuality < 0.5 ? 
    `<div class="alert-box alert-warning">
      <strong>Low image quality.</strong> Results may be less reliable. Try again with better lighting and focus.
    </div>` : '';
  
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
          <span class="detail-value">${topResults[0].display}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Confidence:</span>
          <span class="detail-value">${(topResults[0].confidence * 100).toFixed(1)}%</span>
        </div>
        <h5>Other Potential Matches:</h5>
        ${resultBars}
        ${qualityWarning}
        <div class="alert-box ${alertClass}">
          <strong>${analysis.riskAssessment.recommendation.level === 'high' ? 'High concern detected.' : 
                   analysis.riskAssessment.recommendation.level === 'moderate' ? 'Moderate concern.' : 
                   'Low concern.'}</strong>
          <p>${analysis.riskAssessment.recommendation.message}</p>
        </div>
      </div>
    </div>
  `;
  
  // Add to results container (at the top)
  resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
  
  // Store in app results
  if (window.app && window.app.results) {
    // Store results
    window.app.results.skin.unshift({
      timestamp: timestamp,
      image: imageDataUrl,
      results: analysis
    });
    
    // Limit stored results to 10
    if (window.app.results.skin.length > 10) {
      window.app.results.skin.pop();
    }
  }
  
  // Record in user activity if user manager is available
  if (window.app && window.app.userManager) {
    const activityDetail = `Analysis showed ${topResults[0].display} with ${(topResults[0].confidence * 100).toFixed(0)}% confidence`;
    window.app.userManager.addActivityRecord('skin', activityDetail, analysis);
  }
}

/**
 * Warm up the model with a dummy prediction
 */
async function warmupModel() {
  return tf.tidy(() => {
    const dummyInput = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
    skinModule.model.predict(dummyInput);
  });
}

// Export public API
export default {
  init: initSkinModule,
  startCamera,
  stopCamera,
  switchCamera,
  captureImage: captureSkinImage
};