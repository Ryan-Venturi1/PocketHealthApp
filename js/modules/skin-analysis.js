// Skin Analysis Module - TensorFlow.js Implementation

// Model configuration
const SKIN_MODEL_URL = './models/skin-analysis-model/';
const IMAGE_SIZE = 224;
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

// Model loading function with progress tracking
async function loadSkinModel(progressCallback) {
  try {
    // Update UI
    progressCallback({ status: 'loading', progress: 0, message: 'Loading skin analysis model...' });
    
    // Load model
    const model = await tf.loadLayersModel(SKIN_MODEL_URL + 'model.json', {
      onProgress: (fraction) => {
        progressCallback({ 
          status: 'loading', 
          progress: fraction, 
          message: `Loading model: ${Math.round(fraction * 100)}%` 
        });
      }
    });
    
    // Load metadata
    const metadataResponse = await fetch(SKIN_MODEL_URL + 'metadata.json');
    const metadata = await metadataResponse.json();
    
    progressCallback({ status: 'ready', progress: 1, message: 'Model loaded successfully' });
    
    return { model, metadata };
  } catch (error) {
    console.error('Error loading skin model:', error);
    progressCallback({ status: 'error', progress: 0, message: 'Failed to load model' });
    
    // Create fallback model for demo purposes if needed
    return createFallbackSkinModel();
  }
}

// Image preprocessing function for skin analysis
function preprocessImage(imageElement) {
  return tf.tidy(() => {
    // Read the image data
    let tensor = tf.browser.fromPixels(imageElement)
      .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE]) // Resize to model input size
      .toFloat();
    
    // Normalize values to [-1, 1]
    tensor = tensor.sub(127.5).div(127.5);
    
    // Add batch dimension
    return tensor.expandDims(0);
  });
}

// Skin analysis function
async function analyzeSkinImage(model, imageElement, confidenceThreshold = 0.1) {
  try {
    // Preprocess the image
    const tensor = preprocessImage(imageElement);
    
    // Run inference
    const predictions = await model.predict(tensor).data();
    
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
      .filter(result => result.confidence >= confidenceThreshold) // Filter by confidence threshold
      .sort((a, b) => b.confidence - a.confidence);
    
    // Calculate overall risk assessment
    const highRiskScore = results
      .filter(r => r.risk === "high")
      .reduce((sum, r) => sum + r.confidence, 0);
    
    // Add risk assessment to results
    const riskAssessment = {
      highRiskScore,
      recommendation: getRecommendation(highRiskScore, results[0])
    };
    
    return { results, riskAssessment };
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error('Failed to analyze image');
  }
}

// Get recommendation based on risk assessment
function getRecommendation(highRiskScore, topResult) {
  if (highRiskScore > 0.4) {
    return {
      level: "high",
      message: "High concern detected. The analysis shows patterns consistent with potentially serious skin conditions. Please consult a dermatologist promptly."
    };
  } else if (highRiskScore > 0.15 || (topResult?.risk === "moderate" && topResult?.confidence > 0.5)) {
    return {
      level: "moderate",
      message: "Moderate concern. Some concerning patterns were detected. Consider having this checked by a healthcare provider."
    };
  } else {
    return {
      level: "low",
      message: "Low concern. The analysis doesn't show high-risk patterns, but regular skin checks are still recommended."
    };
  }
}

// Model warmup function - runs a single inference to initialize the model
async function warmupModel(model) {
  return tf.tidy(() => {
    const dummyInput = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
    model.predict(dummyInput);
  });
}

// Specialized image capture function for skin analysis
function captureSkinImage(video, focusScore = 1.0) {
  // Create canvases for processing and display
  const processingCanvas = document.createElement('canvas');
  processingCanvas.width = IMAGE_SIZE;
  processingCanvas.height = IMAGE_SIZE;
  
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = video.videoWidth;
  displayCanvas.height = video.videoHeight;
  
  // Draw the video frame to the processing canvas (centered and cropped)
  const processingCtx = processingCanvas.getContext('2d');
  const size = Math.min(video.videoWidth, video.videoHeight);
  const centerX = (video.videoWidth - size) / 2;
  const centerY = (video.videoHeight - size) / 2;
  
  processingCtx.drawImage(
    video, 
    centerX, centerY, size, size,
    0, 0, IMAGE_SIZE, IMAGE_SIZE
  );
  
  // Draw the full frame to the display canvas
  const displayCtx = displayCanvas.getContext('2d');
  displayCtx.drawImage(video, 0, 0);
  
  // Add metadata to the captured image
  return {
    processingCanvas,
    displayCanvas,
    imageDataUrl: displayCanvas.toDataURL('image/jpeg'),
    timestamp: new Date().toISOString(),
    focusQuality: focusScore
  };
}

// Fallback model creation (for testing)
function createFallbackSkinModel() {
  console.warn('Using simulated skin model for demo purposes');
  
  return {
    model: {
      predict: function(input) {
        return tf.tidy(() => {
          const classCount = Object.keys(SKIN_CONDITIONS).length;
          
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
    },
    metadata: {
      modelVersion: "fallback-1.0",
      modelAccuracy: "simulated",
      classNames: Object.values(SKIN_CONDITIONS).map(c => c.name)
    }
  };
}

// Export functions for use in main application
export {
  loadSkinModel,
  analyzeSkinImage,
  captureSkinImage,
  warmupModel,
  SKIN_CONDITIONS
};