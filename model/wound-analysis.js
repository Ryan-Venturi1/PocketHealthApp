// Wound Assessment Module - TensorFlow.js Implementation

// Model configuration
const WOUND_MODEL_URL = './models/wound-analysis-model/';
const IMAGE_SIZE = 224;
const WOUND_CLASSES = {
  "0": { name: "clean", display: "Clean Wound", severity: "low" },
  "1": { name: "infected", display: "Infected Wound", severity: "high" },
  "2": { name: "deep", display: "Deep Wound", severity: "moderate" },
  "3": { name: "superficial", display: "Superficial Wound", severity: "low" },
  "4": { name: "healing", display: "Healing Wound", severity: "low" }
};

// Model loading function with progress tracking
async function loadWoundModel(progressCallback) {
  try {
    // Update UI
    progressCallback({ status: 'loading', progress: 0, message: 'Loading wound assessment model...' });
    
    // Load model
    const model = await tf.loadLayersModel(WOUND_MODEL_URL + 'model.json', {
      onProgress: (fraction) => {
        progressCallback({ 
          status: 'loading', 
          progress: fraction, 
          message: `Loading model: ${Math.round(fraction * 100)}%` 
        });
      }
    });
    
    // Load metadata
    const metadataResponse = await fetch(WOUND_MODEL_URL + 'metadata.json');
    const metadata = await metadataResponse.json();
    
    progressCallback({ status: 'ready', progress: 1, message: 'Model loaded successfully' });
    
    return { model, metadata };
  } catch (error) {
    console.error('Error loading wound model:', error);
    progressCallback({ status: 'error', progress: 0, message: 'Failed to load model' });
    
    // Create fallback model for demo purposes if needed
    return createFallbackWoundModel();
  }
}

// Image preprocessing function for wound analysis
function preprocessWoundImage(imageElement) {
  return tf.tidy(() => {
    // Read the image data
    let tensor = tf.browser.fromPixels(imageElement)
      .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE]) // Resize to model input size
      .toFloat();
    
    // Normalize values to [0, 1]
    tensor = tensor.div(255.0);
    
    // Add batch dimension
    return tensor.expandDims(0);
  });
}

// Wound analysis function
async function analyzeWoundImage(model, imageElement, woundAge, confidenceThreshold = 0.1) {
  try {
    // Preprocess the image
    const tensor = preprocessWoundImage(imageElement);
    
    // Run inference
    const predictions = await model.predict(tensor).data();
    
    // Cleanup to prevent memory leaks
    tensor.dispose();
    
    // Format class results
    const classResults = Array.from(predictions)
      .map((confidence, index) => ({
        label: WOUND_CLASSES[index]?.name || `Class ${index}`,
        display: WOUND_CLASSES[index]?.display || `Class ${index}`,
        confidence: confidence,
        severity: WOUND_CLASSES[index]?.severity || "unknown"
      }))
      .filter(result => result.confidence >= confidenceThreshold) // Filter by confidence threshold
      .sort((a, b) => b.confidence - a.confidence);
    
    // Calculate derived metrics based on class confidences
    const infectionRisk = predictions[1]; // Index 1 is the "infected" class
    const isDeep = predictions[2] > 0.5; // Index 2 is the "deep" class
    const healingProgress = predictions[4]; // Index 4 is the "healing" class
    
    // Adjust stitches recommendation based on wound age and depth
    const woundAgeValue = parseInt(woundAge);
    let stitchesNeeded = isDeep ? 0.7 : 0.3; // Base likelihood on depth
    
    // Reduce stitches likelihood for older wounds
    if (woundAgeValue === 1) { // 6-24 hours
      stitchesNeeded *= 0.8;
    } else if (woundAgeValue === 2) { // 1-3 days
      stitchesNeeded *= 0.4;
    } else if (woundAgeValue >= 3) { // > 3 days
      stitchesNeeded *= 0.1;
    }
    
    // Calculate overall assessment
    const assessment = {
      infectionRisk,
      healingProgress,
      stitchesNeeded,
      depth: isDeep ? 0.7 : 0.3,
      woundAge: woundAgeValue,
      recommendation: getWoundRecommendation(infectionRisk, stitchesNeeded, isDeep, woundAgeValue)
    };
    
    return { classResults, assessment };
  } catch (error) {
    console.error('Wound analysis error:', error);
    throw new Error('Failed to analyze wound image');
  }
}

// Get recommendation based on wound assessment
function getWoundRecommendation(infectionRisk, stitchesNeeded, isDeep, woundAge) {
  if (infectionRisk > 0.5) {
    return {
      level: "high",
      message: "Possible infection detected. Signs suggest this wound may be infected. Please seek medical attention promptly."
    };
  } else if (stitchesNeeded > 0.6 && woundAge < 2) {
    return {
      level: "moderate",
      message: "Medical evaluation recommended. This wound may benefit from proper closure (stitches, wound adhesive, etc.). Consider seeking medical care within 24 hours."
    };
  } else if (isDeep) {
    return {
      level: "moderate",
      message: "Deep wound detected. This appears to be a deep wound. Monitor carefully for signs of infection and consider medical evaluation."
    };
  } else {
    return {
      level: "low",
      message: "Minor wound detected. Clean the wound thoroughly, keep it covered with a clean bandage, and monitor for signs of infection."
    };
  }
}

// Model warmup function - runs a single inference to initialize the model
async function warmupWoundModel(model) {
  return tf.tidy(() => {
    const dummyInput = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
    model.predict(dummyInput);
  });
}

// Specialized image capture function for wound analysis
function captureWoundImage(video, referenceSize = null) {
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
  
  // If there's a reference size marker in the image, compute actual size
  // This would use computer vision techniques in a full implementation
  const estimatedSize = referenceSize ? calculateWoundSize(processingCanvas, referenceSize) : null;
  
  // Add metadata to the captured image
  return {
    processingCanvas,
    displayCanvas,
    imageDataUrl: displayCanvas.toDataURL('image/jpeg'),
    timestamp: new Date().toISOString(),
    estimatedSize
  };
}

// Helper function to calculate wound size based on reference marker
// This is a simplified placeholder - real implementation would use computer vision
function calculateWoundSize(canvas, referenceSize) {
  // In a real implementation, this would:
  // 1. Detect the reference marker in the image
  // 2. Calculate pixel-to-mm ratio
  // 3. Segment the wound region
  // 4. Calculate wound dimensions
  
  // For demo, just return a simulated size
  return {
    width: 15 + Math.random() * 20, // mm
    height: 10 + Math.random() * 15, // mm
    area: 150 + Math.random() * 300  // mm²
  };
}

// Fallback model creation (for testing)
function createFallbackWoundModel() {
  console.warn('Using simulated wound model for demo purposes');
  
  return {
    model: {
      predict: function(input) {
        return tf.tidy(() => {
          const classCount = Object.keys(WOUND_CLASSES).length;
          const outputs = Array(classCount).fill(0).map(() => Math.random());
          
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
      classNames: Object.values(WOUND_CLASSES).map(c => c.name)
    }
  };
}

// Export functions for use in main application
export {
  loadWoundModel,
  analyzeWoundImage,
  captureWoundImage,
  warmupWoundModel,
  WOUND_CLASSES
};