// File: modules/camera-manager.js

// Global reference to the current camera stream
let activeStream = null;

// Initialize camera
export async function initializeCamera(videoElementId, facingMode = 'environment') {
  const videoElement = document.getElementById(videoElementId);
  if (!videoElement) {
    console.error('Video element not found:', videoElementId);
    return false;
  }
  
  // Check if camera is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('Camera not supported in this browser');
    return false;
  }
  
  // Stop any existing streams
  if (activeStream) {
    stopCamera();
  }
  
  // Request camera access
  const constraints = {
    video: { 
      facingMode: facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Store the stream and connect to video element
    activeStream = stream;
    videoElement.srcObject = stream;
    
    // Return success
    return true;
  } catch (error) {
    console.error('Error accessing camera:', error);
    return false;
  }
}

// Stop camera
export function stopCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
}

// Switch camera (front/back)
export async function switchCamera(videoElementId) {
  // Determine current facing mode
  const currentFacingMode = activeStream ? 
    getFacingMode(activeStream) : 'environment';
  
  // Switch to opposite facing mode
  const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  
  // Reinitialize camera with new facing mode
  return initializeCamera(videoElementId, newFacingMode);
}

// Get current camera facing mode
function getFacingMode(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  const settings = videoTrack.getSettings();
  
  return settings.facingMode || 'environment';
}

// Capture a still image from video stream
export function captureImage(videoElement, canvasWidth = 224, canvasHeight = 224) {
  // Create canvas for processing the image
  const processingCanvas = document.createElement('canvas');
  processingCanvas.width = canvasWidth;
  processingCanvas.height = canvasHeight;
  
  // Create canvas for display (higher resolution)
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = videoElement.videoWidth;
  displayCanvas.height = videoElement.videoHeight;
  
  // Draw video frame to processing canvas (centered and cropped)
  const processingCtx = processingCanvas.getContext('2d');
  const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
  const centerX = (videoElement.videoWidth - size) / 2;
  const centerY = (videoElement.videoHeight - size) / 2;
  
  processingCtx.drawImage(
    videoElement, 
    centerX, centerY, size, size,
    0, 0, canvasWidth, canvasHeight
  );
  
  // Draw the full frame to display canvas
  const displayCtx = displayCanvas.getContext('2d');
  displayCtx.drawImage(videoElement, 0, 0);
  
  // Return image data
  return {
    processingCanvas,
    displayCanvas,
    imageDataUrl: displayCanvas.toDataURL('image/jpeg'),
    timestamp: new Date().toISOString()
  };
}

// Assess image focus quality (simple edge detection)
export function assessFocusQuality(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Simple Sobel edge detection to measure sharpness
  let edgeScore = 0;
  const width = canvas.width;
  const height = canvas.height;
  
  // Sample points (not all pixels for performance)
  const sampleStep = 4;
  
  for (let y = 1; y < height - 1; y += sampleStep) {
    for (let x = 1; x < width - 1; x += sampleStep) {
      const idx = (y * width + x) * 4;
      
      // Calculate horizontal gradient
      const gx = 
        data[idx - 4] - data[idx + 4] + 
        data[idx - 4 - width * 4] - data[idx + 4 - width * 4] +
        data[idx - 4 + width * 4] - data[idx + 4 + width * 4];
      
      // Calculate vertical gradient
      const gy = 
        data[idx - width * 4] - data[idx + width * 4] +
        data[idx - width * 4 - 4] - data[idx + width * 4 - 4] +
        data[idx - width * 4 + 4] - data[idx + width * 4 + 4];
      
      // Magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeScore += magnitude;
    }
  }
  
  // Normalize score (0-1 range)
  const sampleCount = (width * height) / (sampleStep * sampleStep);
  const normalizedScore = edgeScore / (sampleCount * 255);
  
  return normalizedScore;
}