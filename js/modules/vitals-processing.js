// models/vitals-processing.js
// Vitals Measurement Module - Heart Rate Detection

// Configuration
const SAMPLING_FREQUENCY = 30; // Hz (frames per second)
const BUFFER_DURATION = 15; // seconds
const BUFFER_SIZE = SAMPLING_FREQUENCY * BUFFER_DURATION;
const MIN_VALID_FRAMES = SAMPLING_FREQUENCY * 5; // Need at least 5 seconds of data

// Data structures for signal processing
class VitalsProcessor {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.redBuffer = [];
    this.greenBuffer = [];
    this.blueBuffer = [];
    this.timeBuffer = [];
    this.measuring = false;
    this.startTime = null;
    this.frameCounter = 0;
    this.lastProcessedFrame = 0;
    this.heartRateHistory = [];
    this.currentHeartRate = null;
    this.signalQuality = 0;
  }
  
  startMeasurement() {
    this.reset();
    this.measuring = true;
    this.startTime = Date.now();
    return { status: 'started' };
  }
  
  stopMeasurement() {
    this.measuring = false;
    return {
      status: 'stopped',
      duration: (Date.now() - this.startTime) / 1000,
      framesProcessed: this.frameCounter,
      frameRate: this.frameCounter / ((Date.now() - this.startTime) / 1000),
      heartRate: this.currentHeartRate,
      confidence: this.calculateConfidence()
    };
  }
  
  processFrame(imageData) {
    if (!this.measuring) return { status: 'not_measuring' };
    
    this.frameCounter++;
    
    // Extract average RGB values from the frame
    const { red, green, blue } = this.extractColorData(imageData);
    
    // Add to buffer, removing oldest value if buffer is full
    if (this.redBuffer.length >= BUFFER_SIZE) {
      this.redBuffer.shift();
      this.greenBuffer.shift();
      this.blueBuffer.shift();
      this.timeBuffer.shift();
    }
    
    this.redBuffer.push(red);
    this.greenBuffer.push(green);
    this.blueBuffer.push(blue);
    this.timeBuffer.push(Date.now());
    
    // Process every 30 frames (approximately once per second)
    // or if we're stopping and need a final calculation
    if (this.frameCounter - this.lastProcessedFrame >= 30 && this.redBuffer.length >= MIN_VALID_FRAMES) {
      this.lastProcessedFrame = this.frameCounter;
      this.calculateHeartRate();
    }
    
    return {
      status: 'measuring',
      frame: this.frameCounter,
      signalQuality: this.assessSignalQuality(red, green, blue),
      heartRate: this.currentHeartRate
    };
  }
  
  extractColorData(imageData) {
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
  
  calculateHeartRate() {
    // For heart rate detection, green channel often gives best results
    const signal = [...this.greenBuffer];
    
    // Apply signal processing to the raw data
    const { filteredSignal, peaks, heartRate } = this.processSignal(signal);
    
    // Store the result if valid
    if (heartRate >= 40 && heartRate <= 200) {
      this.heartRateHistory.push(heartRate);
      
      // Keep only the last 5 readings
      if (this.heartRateHistory.length > 5) {
        this.heartRateHistory.shift();
      }
      
      // Calculate the average of recent heart rate readings
      this.currentHeartRate = Math.round(
        this.heartRateHistory.reduce((sum, hr) => sum + hr, 0) / this.heartRateHistory.length
      );
    }
    
    return {
      heartRate: this.currentHeartRate,
      confidence: this.calculateConfidence()
    };
  }
  
  processSignal(signal) {
    // 1. Detrend the signal (remove low frequency trends)
    const detrendedSignal = this.detrendSignal(signal);
    
    // 2. Apply bandpass filter (0.5-4Hz, typical heart rate range 30-240 BPM)
    const filteredSignal = this.bandpassFilter(detrendedSignal, 0.5, 4, SAMPLING_FREQUENCY);
    
    // 3. Find peaks in the filtered signal
    const peaks = this.findPeaks(filteredSignal);
    
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
      
      this.signalQuality = this.calculateSignalQualityFromVariance(variance);
    }
    
    return { filteredSignal, peaks, heartRate };
  }
  
  detrendSignal(signal) {
    // Simple detrending: subtract moving average
    const windowSize = Math.round(SAMPLING_FREQUENCY * 1); // 1-second window
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
  
  // Implements a simple bandpass filter
  bandpassFilter(signal, lowCutoff, highCutoff, sampleRate) {
    // Simple IIR filter implementation
    // This is a simplified implementation - a real one would use more sophisticated DSP
    
    const lowAlpha = Math.exp(-2 * Math.PI * lowCutoff / sampleRate);
    const highAlpha = Math.exp(-2 * Math.PI * highCutoff / sampleRate);
    
    // Apply filter
    let lowpassOutput = Array(signal.length).fill(0);
    let highpassOutput = Array(signal.length).fill(0);
    let bandpassOutput = Array(signal.length).fill(0);
    
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
  
  // Find peaks in the signal
  findPeaks(signal) {
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
  
  // Calculate confidence level based on signal quality
  calculateConfidence() {
    if (!this.currentHeartRate) return 'unknown';
    
    // Factors that affect confidence:
    // 1. Number of measurements
    // 2. Signal quality
    // 3. Heart rate within normal range
    
    const historyFactor = Math.min(1, this.heartRateHistory.length / 5);
    const rangeFactor = this.currentHeartRate >= 40 && this.currentHeartRate <= 180 ? 1 : 0.5;
    const qualityFactor = this.signalQuality;
    
    const confidence = historyFactor * rangeFactor * qualityFactor;
    
    if (confidence > 0.8) return 'high';
    if (confidence > 0.5) return 'medium';
    return 'low';
  }
  
  // Calculate signal quality from variance
  calculateSignalQualityFromVariance(variance) {
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
  
  // Assess signal quality based on current frame
  assessSignalQuality(red, green, blue) {
    // Simple check: green channel should be much higher than others for good finger placement
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
  
  // Generate report for heart rate measurement
  generateReport() {
    if (!this.currentHeartRate) {
      return {
        heartRate: null,
        confidence: 'unknown',
        category: 'unknown',
        message: 'Not enough data collected to determine heart rate.'
      };
    }
    
    // Determine heart rate category
    let category, message;
    
    if (this.currentHeartRate < 60) {
      category = 'Bradycardia';
      message = 'Your heart rate is below the typical resting range (60-100 BPM). This can be normal for athletes or during sleep.';
    } else if (this.currentHeartRate <= 100) {
      category = 'Normal';
      message = 'Your heart rate is within the typical resting range (60-100 BPM).';
    } else if (this.currentHeartRate <= 120) {
      category = 'Elevated';
      message = 'Your heart rate is elevated above the typical resting range. This can be normal during light activity or stress.';
    } else {
      category = 'Tachycardia';
      message = 'Your heart rate is significantly elevated above the typical resting range. This can be normal during exercise.';
    }
    
    return {
      heartRate: this.currentHeartRate,
      confidence: this.calculateConfidence(),
      category,
      message,
      dataPoints: this.frameCounter,
      duration: (Date.now() - this.startTime) / 1000
    };
  }
}

// Export for use in main application
export { VitalsProcessor, SAMPLING_FREQUENCY, BUFFER_SIZE, MIN_VALID_FRAMES };