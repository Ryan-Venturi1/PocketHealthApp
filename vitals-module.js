// vitals-module.js - Real-time heart rate detection

// Constants for signal processing
const SAMPLING_FREQUENCY = 30; // Frames per second
const BUFFER_SIZE = SAMPLING_FREQUENCY * 15; // 15 seconds of data
const MIN_VALID_FRAMES = SAMPLING_FREQUENCY * 5; // 5 seconds minimum

// Module state
const vitalsModule = {
  measuring: false,
  startTime: null,
  redBuffer: [],
  greenBuffer: [],
  blueBuffer: [],
  timeBuffer: [],
  frameCounter: 0,
  lastProcessedFrame: 0,
  heartRateHistory: [],
  currentHeartRate: null,
  signalQuality: 0,
  processingCanvas: null,
  processingCtx: null,
  timerInterval: null,
  analysisInterval: null
};

/**
 * Initialize the vitals module
 */
export function initVitalsModule() {
  try {
    // Set up canvas for processing
    vitalsModule.processingCanvas = document.getElementById('canvas-processor') || 
      document.createElement('canvas');
    
    vitalsModule.processingCanvas.width = 100;
    vitalsModule.processingCanvas.height = 100;
    vitalsModule.processingCtx = vitalsModule.processingCanvas.getContext('2d');
    
    // Set up event listeners
    const startButton = document.getElementById('start-vitals');
    if (startButton) {
      startButton.addEventListener('click', toggleMeasurement);
    }
    
    // Initialize camera
    initializeCamera();
    
    return { status: 'initialized' };
  } catch (error) {
    console.error('Error initializing vitals module:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Initialize camera for heart rate measurement
 */
async function initializeCamera() {
  try {
    const video = document.getElementById('video-vitals');
    if (!video) return;
    
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'user', // Use front camera for easier finger placement
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });
    
    // Set up video
    video.srcObject = stream;
    await video.play();
    
    // Update camera status
    updateStatus('Camera ready for vital signs measurement');
    
    return { status: 'camera_ready' };
  } catch (error) {
    console.error('Error initializing camera:', error);
    updateStatus('Error accessing camera: ' + error.message, true);
    return { status: 'error', message: error.message };
  }
}

/**
 * Update module status
 */
function updateStatus(message, isError = false) {
  console.log(`Vitals Module: ${message}`);
  
  const cameraStatus = document.getElementById('camera-status');
  if (cameraStatus) {
    cameraStatus.textContent = message;
    cameraStatus.className = isError ? 'status-error' : 'status-ready';
  }
  
  // Update instructions
  const instructions = document.getElementById('pulse-instructions');
  if (instructions) {
    instructions.textContent = message;
  }
}

/**
 * Toggle measurement on/off
 */
export function toggleMeasurement() {
  if (vitalsModule.measuring) {
    stopMeasurement();
  } else {
    startMeasurement();
  }
}

/**
 * Start heart rate measurement
 */
export function startMeasurement() {
  try {
    // Reset measurement data
    resetMeasurementData();
    
    // Update UI
    updateMeasurementUI(true);
    
    // Start measurement
    vitalsModule.measuring = true;
    vitalsModule.startTime = Date.now();
    
    // Start the timer
    startTimer();
    
    // Start analyzing frames
    startFrameAnalysis();
    
    return { status: 'started' };
  } catch (error) {
    console.error('Error starting measurement:', error);
    updateStatus('Error starting measurement: ' + error.message, true);
    return { status: 'error', message: error.message };
  }
}

/**
 * Stop measurement and generate results
 */
export function stopMeasurement() {
  try {
    // Stop measurement
    vitalsModule.measuring = false;
    
    // Stop timers
    clearInterval(vitalsModule.timerInterval);
    clearInterval(vitalsModule.analysisInterval);
    
    // Update UI
    updateMeasurementUI(false);
    
    // Generate report
    const report = generateReport();
    
    // Display results
    displayResults(report);
    
    return { 
      status: 'completed',
      heartRate: vitalsModule.currentHeartRate,
      confidence: calculateConfidence(),
      duration: (Date.now() - vitalsModule.startTime) / 1000
    };
  } catch (error) {
    console.error('Error stopping measurement:', error);
    updateStatus('Error generating results: ' + error.message, true);
    return { status: 'error', message: error.message };
  }
}

/**
 * Reset measurement data
 */
function resetMeasurementData() {
  vitalsModule.redBuffer = [];
  vitalsModule.greenBuffer = [];
  vitalsModule.blueBuffer = [];
  vitalsModule.timeBuffer = [];
  vitalsModule.frameCounter = 0;
  vitalsModule.lastProcessedFrame = 0;
  vitalsModule.heartRateHistory = [];
  vitalsModule.currentHeartRate = null;
  vitalsModule.signalQuality = 0;
}

/**
 * Update UI elements when measurement starts/stops
 */
function updateMeasurementUI(isStarting) {
  const startButton = document.getElementById('start-vitals');
  const timer = document.getElementById('measurement-time');
  const instructions = document.getElementById('pulse-instructions');
  const pulseCircle = document.querySelector('.pulse-circle');
  
  if (startButton) {
    startButton.textContent = isStarting ? 'Stop Measurement' : 'Start Heart Rate Measurement';
  }
  
  if (instructions) {
    instructions.textContent = isStarting ? 
      'Place fingertip over camera lens and hold steady' : 
      'Place your fingertip over the camera lens';
  }
  
  if (pulseCircle) {
    if (isStarting) {
      pulseCircle.classList.add('pulse-animation');
    } else {
      pulseCircle.classList.remove('pulse-animation');
    }
  }
  
  if (timer && !isStarting) {
    timer.textContent = '00:00';
  }
}

/**
 * Start the timer display
 */
function startTimer() {
  const timer = document.getElementById('measurement-time');
  const instructions = document.getElementById('pulse-instructions');
  
  vitalsModule.timerInterval = setInterval(() => {
    if (!vitalsModule.measuring) {
      clearInterval(vitalsModule.timerInterval);
      return;
    }
    
    const elapsedSeconds = Math.floor((Date.now() - vitalsModule.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    
    if (timer) {
      timer.textContent = `${minutes}:${seconds}`;
    }
    
    // Update instructions based on elapsed time
    if (instructions) {
      if (elapsedSeconds > 5 && elapsedSeconds < 10) {
        instructions.textContent = 'Good, keep holding steady...';
      } else if (elapsedSeconds >= 10 && elapsedSeconds < 20) {
        instructions.textContent = 'Collecting pulse data...';
      } else if (elapsedSeconds >= 20) {
        instructions.textContent = 'Almost done, keep holding...';
      }
    }
    
    // Auto-stop after 30 seconds
    if (elapsedSeconds >= 30) {
      stopMeasurement();
    }
  }, 1000);
}

/**
 * Start video frame analysis
 */
function startFrameAnalysis() {
  const video = document.getElementById('video-vitals');
  
  vitalsModule.analysisInterval = setInterval(() => {
    if (!vitalsModule.measuring || !video || video.paused || video.ended) {
      clearInterval(vitalsModule.analysisInterval);
      return;
    }
    
    // Process the current frame
    processVideoFrame(video);
  }, 1000 / SAMPLING_FREQUENCY); // ~30fps
}

/**
 * Process a video frame for heart rate data
 */
function processVideoFrame(video) {
  try {
    // Draw video frame to canvas
    vitalsModule.processingCtx.drawImage(
      video, 
      0, 0, 
      vitalsModule.processingCanvas.width, 
      vitalsModule.processingCanvas.height
    );
    
    // Get image data
    const imageData = vitalsModule.processingCtx.getImageData(
      0, 0, 
      vitalsModule.processingCanvas.width, 
      vitalsModule.processingCanvas.height
    );
    
    // Extract color data
    const { red, green, blue } = extractColorData(imageData);
    
    // Add to buffer, removing oldest value if buffer is full
    if (vitalsModule.redBuffer.length >= BUFFER_SIZE) {
      vitalsModule.redBuffer.shift();
      vitalsModule.greenBuffer.shift();
      vitalsModule.blueBuffer.shift();
      vitalsModule.timeBuffer.shift();
    }
    
    vitalsModule.redBuffer.push(red);
    vitalsModule.greenBuffer.push(green);
    vitalsModule.blueBuffer.push(blue);
    vitalsModule.timeBuffer.push(Date.now());
    
    vitalsModule.frameCounter++;
    
    // Assess signal quality
    const signalQuality = assessSignalQuality(red, green, blue);
    vitalsModule.signalQuality = signalQuality;
    
    // Process every ~30 frames (approximately once per second)
    if (vitalsModule.frameCounter - vitalsModule.lastProcessedFrame >= 30 && 
        vitalsModule.redBuffer.length >= MIN_VALID_FRAMES) {
      
      vitalsModule.lastProcessedFrame = vitalsModule.frameCounter;
      calculateHeartRate();
    }
    
    // Update UI with current status
    updateMeasurementStatus();
    
  } catch (error) {
    console.error('Error processing frame:', error);
  }
}

/**
 * Extract average RGB values from image data
 */
function extractColorData(imageData) {
  const data = imageData.data;
  let redSum = 0, greenSum = 0, blueSum = 0;
  const pixelCount = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    redSum += data[i];        // R
    greenSum += data[i + 1];  // G
    blueSum += data[i + 2];   // B
  }
  
  return {
    red: redSum / pixelCount,
    green: greenSum / pixelCount,
    blue: blueSum / pixelCount
  };
}

/**
 * Calculate heart rate from the color signal
 */
function calculateHeartRate() {
  // For heart rate detection, green channel often gives best results
  const signal = [...vitalsModule.greenBuffer];
  
  // Apply signal processing
  const { filteredSignal, peaks, heartRate } = processSignal(signal);
  
  // Store the result if valid
  if (heartRate >= 40 && heartRate <= 200) {
    vitalsModule.heartRateHistory.push(heartRate);
    
    // Keep only the last 5 readings
    if (vitalsModule.heartRateHistory.length > 5) {
      vitalsModule.heartRateHistory.shift();
    }
    
    // Calculate the average of recent heart rate readings
    vitalsModule.currentHeartRate = Math.round(
      vitalsModule.heartRateHistory.reduce((sum, hr) => sum + hr, 0) / 
      vitalsModule.heartRateHistory.length
    );
  }
}

/**
 * Process the raw signal to extract heart rate
 */
function processSignal(signal) {
  // 1. Detrend the signal (remove low frequency trends)
  const detrendedSignal = detrendSignal(signal);
  
  // 2. Apply bandpass filter (0.5-4Hz, typical heart rate range 30-240 BPM)
  const filteredSignal = bandpassFilter(detrendedSignal, 0.5, 4, SAMPLING_FREQUENCY);
  
  // 3. Find peaks in the filtered signal
  const peaks = findPeaks(filteredSignal);
  
  // 4. Calculate heart rate from peak intervals
  let heartRate = 0;
  if (peaks.length >= 2) {
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    // Convert to seconds, then to BPM
    const avgInterval = (intervals.reduce((sum, val) => sum + val, 0) / intervals.length) / SAMPLING_FREQUENCY;
    heartRate = Math.round(60 / avgInterval);
    
    // Calculate variance of intervals to assess reliability
    const variance = intervals.reduce((sum, val) => {
      const diff = val - (avgInterval * SAMPLING_FREQUENCY);
      return sum + (diff * diff);
    }, 0) / intervals.length;
    
    vitalsModule.signalQuality = calculateSignalQualityFromVariance(variance);
  }
  
  return { filteredSignal, peaks, heartRate };
}

/**
 * Simple detrending: subtract moving average
 */
function detrendSignal(signal) {
  const windowSize = Math.round(SAMPLING_FREQUENCY); // 1-second window
  const detrendedSignal = [];
  
  for (let i = 0; i < signal.length; i++) {
    let windowStart = Math.max(0, i - windowSize);
    let windowEnd = Math.min(signal.length - 1, i + windowSize);
    let sum = 0;
    
    for (let j = windowStart; j <= windowEnd; j++) {
      sum += signal[j];
    }
    
    const movingAvg = sum / (windowEnd - windowStart + 1);
    detrendedSignal.push(signal[i] - movingAvg);
  }
  
  return detrendedSignal;
}

/**
 * Simple bandpass filter implementation
 */
function bandpassFilter(signal, lowCutoff, highCutoff, sampleRate) {
  // Simple IIR filter implementation
  const lowAlpha = Math.exp(-2 * Math.PI * lowCutoff / sampleRate);
  const highAlpha = Math.exp(-2 * Math.PI * highCutoff / sampleRate);
  
  // Apply filter
  let lowpassOutput = Array(signal.length).fill(0);
  let highpassOutput = Array(signal.length).fill(0);
  
  // First pass - lowpass filter
  lowpassOutput[0] = signal[0];
  for (let i = 1; i < signal.length; i++) {
    lowpassOutput[i] = signal[i] * (1 - lowAlpha) + lowpassOutput[i-1] * lowAlpha;
  }
  
  // Second pass - highpass filter (from lowpass result)
  highpassOutput[0] = lowpassOutput[0];
  for (let i = 1; i < signal.length; i++) {
    highpassOutput[i] = lowpassOutput[i] - lowpassOutput[i-1] + highAlpha * highpassOutput[i-1];
  }
  
  return highpassOutput;
}

/**
 * Find peaks in the signal
 */
function findPeaks(signal) {
  const peaks = [];
  const minPeakDistance = Math.floor(SAMPLING_FREQUENCY * 0.5); // Minimum 0.5 seconds between peaks
  
  for (let i = 1; i < signal.length - 1; i++) {
    // Check if this point is higher than its neighbors
    if (signal[i] > signal[i-1] && signal[i] > signal[i+1]) {
      // Potential peak
      
      // Check if it's a significant peak (above noise threshold)
      const threshold = 0.3 * Math.max(...signal);
      if (signal[i] > threshold) {
        // If we already have peaks, check distance from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
          peaks.push(i);
        } else if (signal[i] > signal[peaks[peaks.length - 1]]) {
          // If this peak is higher than the last one and too close, replace the last one
          peaks[peaks.length - 1] = i;
        }
      }
    }
  }
  
  return peaks;
}

/**
 * Calculate signal quality from variance (0-1)
 */
function calculateSignalQualityFromVariance(variance) {
  // Normalize variance to a 0-1 quality score (0=bad, 1=good)
  // Lower variance means more consistent intervals = better quality
  
  // Set thresholds for variance interpretation
  const highQualityThreshold = 1.0;
  const lowQualityThreshold = 10.0;
  
  if (variance <= highQualityThreshold) return 1.0;
  if (variance >= lowQualityThreshold) return 0.0;
  
  // Linear interpolation
  return 1.0 - ((variance - highQualityThreshold) / (lowQualityThreshold - highQualityThreshold));
}

/**
 * Assess signal quality based on RGB values
 */
function assessSignalQuality(red, green, blue) {
  // Simple check: green channel should be higher than others for good finger placement
  const minThreshold = 50; // Minimum green channel value
  const diffThreshold = 10; // Minimum difference between green and other channels
  
  if (green < minThreshold) {
    return 0.1; // Very poor signal - finger not detected
  }
  
  // Check if green is higher than red and blue (expected for good PPG signal)
  if (green > red + diffThreshold && green > blue + diffThreshold) {
    return 0.9; // Good signal quality
  } else if (green > red && green > blue) {
    return 0.5; // Moderate signal quality
  } else {
    return 0.2; // Poor signal quality
  }
}

/**
 * Update measurement status on UI
 */
function updateMeasurementStatus() {
  const instructions = document.getElementById('pulse-instructions');
  if (!instructions) return;
  
  if (vitalsModule.currentHeartRate) {
    instructions.textContent = 
      `Measuring: ${vitalsModule.currentHeartRate} BPM (Signal quality: ${Math.round(vitalsModule.signalQuality * 100)}%)`;
  } else if (vitalsModule.signalQuality < 0.3) {
    instructions.textContent = 'Signal weak. Ensure finger covers the camera lens.';
  }
}

/**
 * Calculate confidence level for the measurement
 */
function calculateConfidence() {
  if (!vitalsModule.currentHeartRate) return 'unknown';
  
  // Factors that affect confidence:
  // 1. Number of measurements
  // 2. Signal quality
  // 3. Heart rate within normal range
  
  const historyFactor = Math.min(1, vitalsModule.heartRateHistory.length / 5);
  const rangeFactor = vitalsModule.currentHeartRate >= 40 && vitalsModule.currentHeartRate <= 180 ? 1 : 0.5;
  const qualityFactor = vitalsModule.signalQuality;
  
  const confidence = historyFactor * rangeFactor * qualityFactor;
  
  if (confidence > 0.8) return 'high';
  if (confidence > 0.5) return 'medium';
  return 'low';
}

/**
 * Generate final report with heart rate and assessment
 */
function generateReport() {
  if (!vitalsModule.currentHeartRate) {
    return {
      heartRate: null,
      confidence: 'unknown',
      category: 'unknown',
      message: 'Not enough data collected to determine heart rate.',
      dataPoints: vitalsModule.frameCounter,
      duration: (Date.now() - vitalsModule.startTime) / 1000
    };
  }
  
  // Determine heart rate category
  let category, message;
  
  if (vitalsModule.currentHeartRate < 60) {
    category = 'Bradycardia';
    message = 'Your heart rate is below the typical resting range (60-100 BPM). This can be normal for athletes or during sleep.';
  } else if (vitalsModule.currentHeartRate <= 100) {
    category = 'Normal';
    message = 'Your heart rate is within the typical resting range (60-100 BPM).';
  } else if (vitalsModule.currentHeartRate <= 120) {
    category = 'Elevated';
    message = 'Your heart rate is elevated above the typical resting range. This can be normal during light activity or stress.';
  } else {
    category = 'Tachycardia';
    message = 'Your heart rate is significantly elevated above the typical resting range. This can be normal during exercise.';
  }
  
  return {
    heartRate: vitalsModule.currentHeartRate,
    confidence: calculateConfidence(),
    category,
    message,
    dataPoints: vitalsModule.frameCounter,
    duration: (Date.now() - vitalsModule.startTime) / 1000
  };
}

/**
 * Display heart rate results in UI
 */
function displayResults(results) {
  const resultsContainer = document.getElementById('results-vitals');
  
  if (!resultsContainer) return;
  
  // Format results HTML
  if (results.heartRate) {
    // Valid heart rate detected
    const alertClass = results.confidence === 'high' ? 'alert-success' : 
                       results.confidence === 'medium' ? 'alert-info' : 
                       'alert-warning';
    
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
            <span class="detail-value">${results.category}</span>
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
    
    // Store results in app
    if (window.app && window.app.results) {
      window.app.results.vitals.unshift({
        timestamp: new Date().toLocaleString(),
        heartRate: results.heartRate,
        confidence: results.confidence,
        category: results.category
      });
      
      // Limit stored results
      if (window.app.results.vitals.length > 10) {
        window.app.results.vitals.pop();
      }
    }
    
    // Update user metrics if available
    if (window.app && window.app.userManager) {
      window.app.userManager.updateHealthMetric('heartRate', results.heartRate, 'bpm');
      
      // Record activity
      const activityDetail = `Heart rate measured: ${results.heartRate} bpm (${results.category})`;
      window.app.userManager.addActivityRecord('vitals', activityDetail, results);
    }
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

// Export public API
export default {
  init: initVitalsModule,
  start: startMeasurement,
  stop: stopMeasurement,
  toggle: toggleMeasurement
};