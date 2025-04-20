// new-health-tests.js - Additional health tests for mobile devices

import { StorageManager } from './storage-manager.js';

/**
 * RESPIRATORY RATE MONITOR
 * Uses camera to detect chest/abdomen movement for breathing rate
 */
export class RespiratoryRateMonitor {
    constructor() {
      this.isInitialized = false;
      this.isRecording = false;
      this.videoElement = null;
      this.canvas = null;
      this.ctx = null;
      this.startTime = null;
      this.motionData = [];
      this.breathCount = 0;
      this.lastBreathTime = 0;
      this.breathingRate = null;
      this.detectionRegion = { x: 0, y: 0, width: 0, height: 0 };
      this.previousFrame = null;
      this.processingInterval = null;
      this.storageManager = new StorageManager();
    }
    
    /**
     * Initialize the respiratory rate monitor
     */
    async init(videoElementId, canvasElementId) {
      try {
        // Get video and canvas elements
        this.videoElement = document.getElementById(videoElementId);
        this.canvas = document.getElementById(canvasElementId) || document.createElement('canvas');
        
        if (!this.videoElement) {
          throw new Error('Video element not found');
        }
        
        // Set up canvas
        this.canvas.width = 320;
        this.canvas.height = 240;
        this.ctx = this.canvas.getContext('2d');
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        
        // Set up video
        this.videoElement.srcObject = stream;
        await this.videoElement.play();
        
        // Initialize detection region (center of frame)
        this.updateDetectionRegion();
        
        this.isInitialized = true;
        return true;
      } catch (error) {
        console.error('Error initializing respiratory monitor:', error);
        return false;
      }
    }
    
    /**
     * Update the region of interest for motion detection
     */
    updateDetectionRegion() {
      const videoWidth = this.videoElement.videoWidth;
      const videoHeight = this.videoElement.videoHeight;
      
      // Default to center region (typically where chest/abdomen would be)
      const regionWidth = Math.floor(videoWidth * 0.5);
      const regionHeight = Math.floor(videoHeight * 0.3);
      
      this.detectionRegion = {
        x: Math.floor((videoWidth - regionWidth) / 2),
        y: Math.floor(videoHeight * 0.4), // Slightly below center
        width: regionWidth,
        height: regionHeight
      };
    }
    
    /**
     * Start recording breathing
     */
    startRecording() {
      if (!this.isInitialized) {
        return { success: false, message: 'Respiratory monitor not initialized' };
      }
      
      if (this.isRecording) {
        return { success: false, message: 'Already recording' };
      }
      
      // Reset data
      this.motionData = [];
      this.breathCount = 0;
      this.lastBreathTime = 0;
      this.breathingRate = null;
      this.previousFrame = null;
      this.startTime = Date.now();
      
      // Start recording
      this.isRecording = true;
      
      // Start processing frames
      this.processingInterval = setInterval(() => {
        this.processFrame();
      }, 100); // 10 frames per second
      
      return { success: true, message: 'Recording started' };
    }
    
    /**
     * Stop recording and calculate results
     */
    stopRecording() {
      if (!this.isRecording) {
        return { success: false, message: 'Not recording' };
      }
      
      // Stop recording
      this.isRecording = false;
      clearInterval(this.processingInterval);
      
      // Calculate final results
      const results = this.calculateResults();
      
      return {
        success: true,
        results
      };
    }
    
    /**
     * Process a video frame to detect motion
     */
    processFrame() {
      if (!this.isRecording || !this.videoElement) return;
      
      try {
        // Draw video frame to canvas, focusing on region of interest
        this.ctx.drawImage(
          this.videoElement,
          this.detectionRegion.x, this.detectionRegion.y,
          this.detectionRegion.width, this.detectionRegion.height,
          0, 0,
          this.canvas.width, this.canvas.height
        );
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // If this is the first frame, just store it
        if (!this.previousFrame) {
          this.previousFrame = imageData;
          return;
        }
        
        // Calculate motion between frames
        const motionScore = this.calculateMotion(imageData, this.previousFrame);
        
        // Store motion data
        this.motionData.push({
          time: Date.now() - this.startTime,
          motion: motionScore
        });
        
        // Detect breaths from motion
        this.detectBreaths();
        
        // Update previous frame
        this.previousFrame = imageData;
        
        // Draw visualization
        this.drawVisualization(motionScore);
        
      } catch (error) {
        console.error('Error processing respiratory frame:', error);
      }
    }
    
    /**
     * Calculate motion between two frames
     */
    calculateMotion(currentFrame, previousFrame) {
      const current = currentFrame.data;
      const previous = previousFrame.data;
      let totalDifference = 0;
      
      // Compare pixels (using grayscale for simplicity)
      for (let i = 0; i < current.length; i += 4) {
        const currentGray = (current[i] + current[i+1] + current[i+2]) / 3;
        const previousGray = (previous[i] + previous[i+1] + previous[i+2]) / 3;
        
        totalDifference += Math.abs(currentGray - previousGray);
      }
      
      // Normalize by pixel count
      const pixelCount = current.length / 4;
      return totalDifference / pixelCount;
    }
    
    /**
     * Detect breaths from motion data
     */
    detectBreaths() {
      if (this.motionData.length < 10) return;
      
      // Get last few motion scores
      const recentMotion = this.motionData.slice(-10);
      const currentMotion = recentMotion[recentMotion.length - 1].motion;
      
      // Calculate average and standard deviation
      const motionValues = recentMotion.map(m => m.motion);
      const avgMotion = motionValues.reduce((sum, val) => sum + val, 0) / motionValues.length;
      
      // Detect peak (breath) when motion exceeds threshold and is decreasing
      const threshold = avgMotion * 1.5;
      const isPeak = currentMotion > threshold && 
                    motionValues[motionValues.length - 1] < motionValues[motionValues.length - 2];
      
      const currentTime = Date.now() - this.startTime;
      const timeSinceLastBreath = currentTime - this.lastBreathTime;
      
      // Minimum 1.5 seconds between breaths (prevent false positives)
      if (isPeak && timeSinceLastBreath > 1500) {
        this.breathCount++;
        this.lastBreathTime = currentTime;
        
        // Calculate breathing rate (breaths per minute)
        const recordingDurationMinutes = (currentTime / 1000) / 60;
        this.breathingRate = recordingDurationMinutes > 0 ? 
                            this.breathCount / recordingDurationMinutes :
                            0;
      }
    }
    
    /**
     * Draw visualization of breathing
     */
    drawVisualization(motionScore) {
      // Visualization can be implemented for real-time feedback
      // This would show the motion graph and detected breaths
    }
    
    /**
     * Calculate final results
     */
    async calculateResults() {
      // Get recording duration in minutes
      const durationMs = Date.now() - this.startTime;
      const durationMinutes = durationMs / 1000 / 60;
      
      // Calculate breathing rate
      const breathingRate = durationMinutes > 0 ? 
                           this.breathCount / durationMinutes :
                           0;
      
      // Determine category based on breathing rate
      let category, message, alertLevel;
      
      // Normal adult respiratory rate is 12-20 breaths per minute
      if (breathingRate < 8) {
        category = "Slow Breathing Rate";
        message = "Your breathing rate appears slower than the typical range. This could be normal during sleep or for athletes, but may require medical attention if you're experiencing symptoms.";
        alertLevel = "warning";
      } else if (breathingRate >= 8 && breathingRate <= 20) {
        category = "Normal Breathing Rate";
        message = "Your breathing rate is within the normal range for adults (12-20 breaths per minute).";
        alertLevel = "success";
      } else if (breathingRate > 20 && breathingRate <= 30) {
        category = "Elevated Breathing Rate";
        message = "Your breathing rate is above the normal range. This can be normal during light activity or stress.";
        alertLevel = "info";
      } else {
        category = "Rapid Breathing";
        message = "Your breathing rate is significantly elevated. This can be normal during exercise, but may require medical attention if at rest.";
        alertLevel = "warning";
      }
      
      const result = {
        breathingRate: Math.round(breathingRate),
        breathCount: this.breathCount,
        duration: durationMs / 1000,
        category,
        message,
        alertLevel
      };

      // Save to local storage
      this.storageManager.saveTestResult('respiratory', result);
      
      return result;
    }
  }
  
  /**
   * REACTION TIME TEST
   * Measures user's reaction time to visual stimuli
   */
  export class ReactionTimeTest {
    constructor() {
      this.isInitialized = false;
      this.isRunning = false;
      this.stimulusContainer = null;
      this.startButton = null;
      this.resultDisplay = null;
      this.testCount = 5; // Number of trials
      this.currentTest = 0;
      this.waitTimes = [];
      this.reactionTimes = [];
      this.timeoutId = null;
      this.stimulusStart = null;
      this.storageManager = new StorageManager();
    }
    
    /**
     * Initialize the reaction time test
     */
    init(containerElementId, startButtonId, resultDisplayId) {
      try {
        this.stimulusContainer = document.getElementById(containerElementId);
        this.startButton = document.getElementById(startButtonId);
        this.resultDisplay = document.getElementById(resultDisplayId);
        
        if (!this.stimulusContainer || !this.startButton) {
          throw new Error('Required elements not found');
        }
        
        // Set up event listeners
        this.startButton.addEventListener('click', () => this.startTest());
        this.stimulusContainer.addEventListener('click', () => this.handleClick());
        
        this.isInitialized = true;
        
        // Set initial state
        this.updateUI('ready');
        
        return true;
      } catch (error) {
        console.error('Error initializing reaction time test:', error);
        return false;
      }
    }
    
    /**
     * Start the reaction time test
     */
    startTest() {
      if (!this.isInitialized || this.isRunning) return;
      
      // Reset test data
      this.currentTest = 0;
      this.waitTimes = [];
      this.reactionTimes = [];
      
      // Start the first test
      this.isRunning = true;
      this.updateUI('waiting');
      this.scheduleNextStimulus();
      
      // Update button
      if (this.startButton) {
        this.startButton.textContent = 'Test in progress...';
        this.startButton.disabled = true;
      }
      
      return { success: true, message: 'Test started' };
    }
    
    /**
     * Schedule the next stimulus
     */
    scheduleNextStimulus() {
      // Random wait time between 1-5 seconds
      const waitTime = 1000 + Math.random() * 4000;
      this.waitTimes.push(waitTime);
      
      // Schedule the stimulus
      this.timeoutId = setTimeout(() => {
        this.showStimulus();
      }, waitTime);
    }
    
    /**
     * Show the visual stimulus
     */
    showStimulus() {
      this.stimulusStart = Date.now();
      this.updateUI('stimulus');
    }
    
    /**
     * Handle user click
     */
    handleClick() {
      // Ignore clicks if not running or no stimulus
      if (!this.isRunning) return;
      
      // If waiting for stimulus, this is a false start
      if (this.stimulusStart === null) {
        // Cancel scheduled stimulus
        clearTimeout(this.timeoutId);
        
        // Record false start
        this.reactionTimes.push(-1);
        
        // Show false start message
        this.updateUI('false-start');
        
        // Wait a moment, then continue
        setTimeout(() => {
          this.nextTest();
        }, 1500);
        
        return;
      }
      
      // Calculate reaction time
      const reactionTime = Date.now() - this.stimulusStart;
      this.reactionTimes.push(reactionTime);
      
      // Show reaction time
      this.updateUI('result', reactionTime);
      
      // Wait a moment, then continue
      setTimeout(() => {
        this.nextTest();
      }, 1500);
    }
    
    /**
     * Move to next test or finish
     */
    nextTest() {
      this.currentTest++;
      this.stimulusStart = null;
      
      // Check if tests are complete
      if (this.currentTest >= this.testCount) {
        this.finishTest();
        return;
      }
      
      // Set up for next test
      this.updateUI('waiting');
      this.scheduleNextStimulus();
    }
    
    /**
     * Finish the test and calculate results
     */
    finishTest() {
      this.isRunning = false;
      
      // Calculate final results
      const results = this.calculateResults();
      
      // Update UI
      this.updateUI('complete', results);
      
      // Re-enable start button
      if (this.startButton) {
        this.startButton.textContent = 'Start Test';
        this.startButton.disabled = false;
      }
      
      return {
        success: true,
        results
      };
    }
    
    /**
     * Update the UI based on test state
     */
    updateUI(state, data = null) {
      if (!this.stimulusContainer) return;
      
      switch (state) {
        case 'ready':
          this.stimulusContainer.innerHTML = `
            <div class="reaction-intro">
              <h4>Reaction Time Test</h4>
              <p>Click the start button to begin. When the screen turns green, click as quickly as possible.</p>
              <p>There will be ${this.testCount} trials.</p>
            </div>
          `;
          this.stimulusContainer.style.backgroundColor = '#f1f5f9'; // Default bg
          break;
          
        case 'waiting':
          this.stimulusContainer.innerHTML = `
            <div class="reaction-waiting">
              <p>Wait for the green screen...</p>
              <p>Test ${this.currentTest + 1} of ${this.testCount}</p>
            </div>
          `;
          this.stimulusContainer.style.backgroundColor = '#f1f5f9'; // Default bg
          break;
          
        case 'stimulus':
          this.stimulusContainer.innerHTML = `
            <div class="reaction-stimulus">
              <h3>CLICK NOW!</h3>
            </div>
          `;
          this.stimulusContainer.style.backgroundColor = '#10b981'; // Green
          break;
          
        case 'result':
          this.stimulusContainer.innerHTML = `
            <div class="reaction-result">
              <h4>Your reaction time: ${data} ms</h4>
              <p>Wait for the next test...</p>
            </div>
          `;
          this.stimulusContainer.style.backgroundColor = '#f1f5f9'; // Default bg
          break;
          
        case 'false-start':
          this.stimulusContainer.innerHTML = `
            <div class="reaction-false-start">
              <h4>False start!</h4>
              <p>Wait for the green screen before clicking.</p>
            </div>
          `;
          this.stimulusContainer.style.backgroundColor = '#ef4444'; // Red
          break;
          
        case 'complete':
          const validTimes = data.reactionTimes.filter(time => time > 0);
          const avgTime = validTimes.length > 0 ? 
            Math.round(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length) : 
            'N/A';
          
          const falseStarts = data.reactionTimes.filter(time => time < 0).length;
          
          this.stimulusContainer.innerHTML = `
            <div class="reaction-complete">
              <h4>Test Complete</h4>
              <p>Average reaction time: ${avgTime} ms</p>
              <p>False starts: ${falseStarts}</p>
              <div class="alert-box alert-${data.alertLevel}">
                <p>${data.message}</p>
              </div>
            </div>
          `;
          this.stimulusContainer.style.backgroundColor = '#f1f5f9'; // Default bg
          
          // Update result display if available
          if (this.resultDisplay) {
            this.resultDisplay.innerHTML = `
              <div class="result-item">
                <div class="result-header">
                  <h4 class="result-title">Reaction Time Test</h4>
                  <span class="result-timestamp">${new Date().toLocaleString()}</span>
                </div>
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Average Time:</span>
                    <span class="detail-value">${avgTime} ms</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Classification:</span>
                    <span class="detail-value">${data.category}</span>
                  </div>
                  <div class="alert-box alert-${data.alertLevel}">
                    <p>${data.message}</p>
                  </div>
                </div>
              </div>
            `;
          }
          break;
      }
    }
    
    /**
     * Calculate final results
     */
    calculateResults() {
      // Filter out false starts
      const validTimes = this.reactionTimes.filter(time => time > 0);
      
      // If no valid times, return error
      if (validTimes.length === 0) {
        return {
          avgReactionTime: null,
          reactionTimes: this.reactionTimes,
          category: "Incomplete",
          message: "No valid reaction times recorded. Please try again.",
          alertLevel: "warning"
        };
      }
      
      // Calculate average reaction time
      const avgReactionTime = Math.round(
        validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
      );
      
      // Determine category based on reaction time
      let category, message, alertLevel;
      
      // General categorization (can be adjusted based on age, etc.)
      if (avgReactionTime < 200) {
        category = "Very Fast";
        message = "Your reaction time is exceptionally fast, typical of elite athletes or gamers.";
        alertLevel = "success";
      } else if (avgReactionTime >= 200 && avgReactionTime < 250) {
        category = "Fast";
        message = "Your reaction time is faster than average.";
        alertLevel = "success";
      } else if (avgReactionTime >= 250 && avgReactionTime < 350) {
        category = "Average";
        message = "Your reaction time is within the normal range.";
        alertLevel = "info";
      } else if (avgReactionTime >= 350 && avgReactionTime < 450) {
        category = "Below Average";
        message = "Your reaction time is slightly slower than average.";
        alertLevel = "info";
      } else {
        category = "Slow";
        message = "Your reaction time is slower than average. Various factors can affect reaction time, including fatigue or distractions.";
        alertLevel = "warning";
      }
      
      const result = {
        avgReactionTime,
        reactionTimes: this.reactionTimes,
        falseStarts: this.reactionTimes.filter(time => time < 0).length,
        category,
        message,
        alertLevel
      };

      // Save to local storage
      this.storageManager.saveTestResult('reaction', result);
      
      return result;
    }
  }
  
  /**
   * TREMOR ANALYSIS
   * Uses device accelerometer to detect and measure hand tremors
   */
  export class TremorAnalyzer {
    constructor() {
      this.isInitialized = false;
      this.isRecording = false;
      this.accelerometerAvailable = false;
      this.recordingDuration = 10000; // 10 seconds
      this.accelerometerData = [];
      this.startTime = null;
      this.recordingTimeout = null;
      
      // DOM elements
      this.container = null;
      this.startButton = null;
      this.resultDisplay = null;
      this.storageManager = new StorageManager();
    }
    
    /**
     * Initialize the tremor analyzer
     */
    async init(containerElementId, startButtonId, resultDisplayId) {
      try {
        this.container = document.getElementById(containerElementId);
        this.startButton = document.getElementById(startButtonId);
        this.resultDisplay = document.getElementById(resultDisplayId);
        
        if (!this.container || !this.startButton) {
          throw new Error('Required elements not found');
        }
        
        // Check if accelerometer is available
        if (typeof DeviceMotionEvent !== 'undefined' && 
            typeof DeviceMotionEvent.requestPermission === 'function') {
          // iOS 13+ requires permission
          this.updateUI('permission');
        } else if ('DeviceMotionEvent' in window) {
          // Other browsers with accelerometer
          this.accelerometerAvailable = true;
          this.isInitialized = true;
          this.updateUI('ready');
        } else {
          // No accelerometer available
          this.updateUI('not-available');
          return false;
        }
        
        // Set up event listeners
        this.startButton.addEventListener('click', () => {
          if (!this.accelerometerAvailable) {
            this.requestAccelerometerPermission();
          } else {
            this.toggleRecording();
          }
        });
        
        return true;
      } catch (error) {
        console.error('Error initializing tremor analyzer:', error);
        return false;
      }
    }
    
    /**
     * Request accelerometer permission (for iOS 13+)
     */
    async requestAccelerometerPermission() {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        
        if (response === 'granted') {
          this.accelerometerAvailable = true;
          this.isInitialized = true;
          this.updateUI('ready');
        } else {
          this.updateUI('permission-denied');
        }
      } catch (error) {
        console.error('Error requesting accelerometer permission:', error);
        this.updateUI('error', error.message);
      }
    }
    
    /**
     * Start or stop recording
     */
    toggleRecording() {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    }
    
    /**
     * Start recording accelerometer data
     */
    startRecording() {
      if (!this.accelerometerAvailable || this.isRecording) return;
      
      // Reset data
      this.accelerometerData = [];
      this.startTime = Date.now();
      
      // Start recording
      this.isRecording = true;
      this.updateUI('recording');
      
      // Add accelerometer event listener
      window.addEventListener('devicemotion', this.handleMotionEvent.bind(this));
      
      // Set timeout to automatically stop recording
      this.recordingTimeout = setTimeout(() => {
        this.stopRecording();
      }, this.recordingDuration);
      
      // Update button
      if (this.startButton) {
        this.startButton.textContent = 'Stop Recording';
      }
      
      return { success: true, message: 'Recording started' };
    }
    
    /**
     * Stop recording and analyze data
     */
    stopRecording() {
      if (!this.isRecording) return;
      
      // Stop recording
      this.isRecording = false;
      clearTimeout(this.recordingTimeout);
      
      // Remove event listener
      window.removeEventListener('devicemotion', this.handleMotionEvent.bind(this));
      
      // Update UI
      this.updateUI('processing');
      
      // Process data (with slight delay to update UI)
      setTimeout(() => {
        const results = this.analyzeData();
        this.updateUI('complete', results);
        
        // Update button
        if (this.startButton) {
          this.startButton.textContent = 'Start New Recording';
        }
      }, 500);
      
      return { success: true, message: 'Recording stopped' };
    }
    
    /**
     * Handle accelerometer data
     */
    handleMotionEvent(event) {
      if (!this.isRecording) return;
      
      // Get acceleration data
      const acceleration = event.acceleration || 
                          { x: 0, y: 0, z: 0 };
      
      // Calculate time since start
      const timestamp = Date.now() - this.startTime;
      
      // Store data
      this.accelerometerData.push({
        time: timestamp,
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0
      });
      
      // Update visualization (optional)
      this.updateVisualization();
    }
    
    /**
     * Update real-time visualization
     */
    updateVisualization() {
      // This could draw a real-time graph of accelerometer data
      // For simplicity, we'll skip the implementation
    }
    
    /**
     * Analyze tremor data
     */
    analyzeData() {
      // Check if we have enough data
      if (this.accelerometerData.length < 10) {
        return {
          tremorFrequency: null,
          tremorAmplitude: null,
          category: "Insufficient Data",
          message: "Not enough accelerometer data was collected. Please try again and hold the device steady in your hand.",
          alertLevel: "warning"
        };
      }
      
      // Calculate movement metrics
      const metrics = this.calculateTremorMetrics();
      
      // Determine tremor characteristics
      let category, message, alertLevel;
      
      if (metrics.amplitude < 0.2) {
        if (metrics.frequency < 2) {
          category = "No Significant Tremor";
          message = "No significant tremor detected. Your hand appears to be steady.";
          alertLevel = "success";
        } else {
          category = "Minimal Physiological Tremor";
          message = "Minimal natural tremor detected, which is normal in all individuals.";
          alertLevel = "success";
        }
      } else if (metrics.amplitude < 0.5) {
        if (metrics.frequency < 4) {
          category = "Mild Tremor";
          message = "Mild tremor detected. This could be due to normal factors like caffeine, stress, or fatigue.";
          alertLevel = "info";
        } else {
          category = "Moderate Physiological Tremor";
          message = "Moderate physiological tremor detected. Consider factors like caffeine, medication, or fatigue that may contribute.";
          alertLevel = "info";
        }
      } else {
        category = "Significant Tremor";
        message = "Significant tremor detected. If this is persistent, consider consulting a healthcare provider.";
        alertLevel = "warning";
      }
      
      const result = {
        tremorAmplitude: metrics.tremorAmplitude,
        tremorFrequency: metrics.tremorFrequency,
        category,
        message,
        alertLevel
      };

      // Save to local storage
      this.storageManager.saveTestResult('tremor', result);
      
      return result;
    }
    
    /**
     * Calculate tremor metrics (frequency and amplitude)
     */
    calculateTremorMetrics() {
      // Extract data series
      const times = this.accelerometerData.map(d => d.time);
      const xData = this.accelerometerData.map(d => d.x);
      const yData = this.accelerometerData.map(d => d.y);
      const zData = this.accelerometerData.map(d => d.z);
      
      // Calculate magnitudes (Euclidean norm)
      const magnitudes = [];
      for (let i = 0; i < xData.length; i++) {
        const magnitude = Math.sqrt(
          xData[i] * xData[i] + 
          yData[i] * yData[i] + 
          zData[i] * zData[i]
        );
        magnitudes.push(magnitude);
      }
      
      // Remove gravity component (high-pass filter)
      const filteredMagnitudes = this.highPassFilter(magnitudes);
      
      // Calculate amplitude (RMS)
      const squaredSum = filteredMagnitudes.reduce((sum, val) => sum + val * val, 0);
      const tremorAmplitude = Math.sqrt(squaredSum / filteredMagnitudes.length);
      
      // Estimate frequency using zero-crossings method
      const zeroCrossings = this.countZeroCrossings(filteredMagnitudes);
      const recordingDurationSeconds = (times[times.length - 1] - times[0]) / 1000;
      const tremorFrequency = zeroCrossings / (2 * recordingDurationSeconds); // crossings / 2 per cycle
      
      return {
        tremorAmplitude,
        tremorFrequency
      };
    }
    
    /**
     * High-pass filter to remove gravity component
     */
    highPassFilter(data) {
      const alpha = 0.8; // Filter coefficient
      const filtered = new Array(data.length);
      
      // Initialize
      filtered[0] = data[0];
      let avg = data[0];
      
      // Apply filter
      for (let i = 1; i < data.length; i++) {
        avg = alpha * avg + (1 - alpha) * data[i];
        filtered[i] = data[i] - avg;
      }
      
      return filtered;
    }
    
    /**
     * Count zero crossings to estimate frequency
     */
    countZeroCrossings(data) {
      let crossings = 0;
      
      for (let i = 1; i < data.length; i++) {
        if ((data[i - 1] < 0 && data[i] >= 0) || 
            (data[i - 1] >= 0 && data[i] < 0)) {
          crossings++;
        }
      }
      
      return crossings;
    }
    
    /**
     * Update the UI based on analyzer state
     */
    updateUI(state, data = null) {
      if (!this.container) return;
      
      switch (state) {
        case 'permission':
          this.container.innerHTML = `
            <div class="tremor-permission">
              <h4>Accelerometer Access Required</h4>
              <p>This test needs access to your device's motion sensors to measure tremor.</p>
              <p>Click the button below to grant permission.</p>
            </div>
          `;
          if (this.startButton) {
            this.startButton.textContent = 'Grant Permission';
          }
          break;
          
        case 'permission-denied':
          this.container.innerHTML = `
            <div class="tremor-error">
              <h4>Permission Denied</h4>
              <p>Access to the accelerometer was denied. Please enable motion sensors in your browser or device settings.</p>
            </div>
          `;
          if (this.startButton) {
            this.startButton.textContent = 'Try Again';
          }
          break;
          
        case 'not-available':
          this.container.innerHTML = `
            <div class="tremor-error">
              <h4>Accelerometer Not Available</h4>
              <p>Your device does not have motion sensors or they are not accessible.</p>
              <p>This test requires a mobile device with an accelerometer.</p>
            </div>
          `;
          if (this.startButton) {
            this.startButton.disabled = true;
            this.startButton.textContent = 'Not Available';
          }
          break;
          
        case 'ready':
          this.container.innerHTML = `
            <div class="tremor-ready">
              <h4>Tremor Analysis Test</h4>
              <p>Hold your device in your hand with your arm extended straight out.</p>
              <p>Try to hold as still as possible during the ${this.recordingDuration/1000} second test.</p>
              <div class="tremor-diagram">
                <img src="assets/images/tremor-test-position.png" alt="Test Position" onerror="this.style.display='none'">
              </div>
            </div>
          `;
          if (this.startButton) {
            this.startButton.disabled = false;
            this.startButton.textContent = 'Start Recording';
          }
          break;
          
        case 'recording':
          const recordingTimeLeft = Math.round((this.recordingDuration - (Date.now() - this.startTime)) / 1000);
          this.container.innerHTML = `
            <div class="tremor-recording">
              <h4>Recording in Progress</h4>
              <p>Hold your device steady. Recording for ${recordingTimeLeft} more seconds...</p>
              <div class="tremor-progress">
                <div class="tremor-progress-bar" style="width: ${((Date.now() - this.startTime) / this.recordingDuration) * 100}%"></div>
              </div>
            </div>
          `;
          break;
          
        case 'processing':
          this.container.innerHTML = `
            <div class="tremor-processing">
              <h4>Processing Data</h4>
              <p>Analyzing accelerometer data to detect tremor patterns...</p>
            </div>
          `;
          break;
          
        case 'complete':
          const amplitude = data.tremorAmplitude ? data.tremorAmplitude.toFixed(2) : 'N/A';
          const frequency = data.tremorFrequency ? data.tremorFrequency.toFixed(1) : 'N/A';
          
          this.container.innerHTML = `
            <div class="tremor-complete">
              <h4>Tremor Analysis Results</h4>
              <div class="tremor-metrics">
                <div class="tremor-metric">
                  <h5>Tremor Amplitude</h5>
                  <p>${amplitude} m/s²</p>
                </div>
                <div class="tremor-metric">
                  <h5>Tremor Frequency</h5>
                  <p>${frequency} Hz</p>
                </div>
              </div>
              <div class="alert-box alert-${data.alertLevel}">
                <h5>${data.category}</h5>
                <p>${data.message}</p>
              </div>
            </div>
          `;
          
          // Update result display if available
          if (this.resultDisplay) {
            this.resultDisplay.innerHTML = `
              <div class="result-item">
                <div class="result-header">
                  <h4 class="result-title">Tremor Analysis</h4>
                  <span class="result-timestamp">${new Date().toLocaleString()}</span>
                </div>
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Amplitude:</span>
                    <span class="detail-value">${amplitude} m/s²</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Frequency:</span>
                    <span class="detail-value">${frequency} Hz</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${data.category}</span>
                  </div>
                  <div class="alert-box alert-${data.alertLevel}">
                    <p>${data.message}</p>
                  </div>
                </div>
              </div>
            `;
          }
          break;
          
        case 'error':
          this.container.innerHTML = `
            <div class="tremor-error">
              <h4>Error</h4>
              <p>${data || 'An unknown error occurred'}</p>
            </div>
          `;
          break;
      }
    }
  }
  
  /**
   * BALANCE TEST
   * Uses device orientation to measure balance stability
   */
  export class BalanceTest {
    constructor() {
      this.isInitialized = false;
      this.isRecording = false;
      this.orientationAvailable = false;
      this.recordingDuration = 30000; // 30 seconds
      this.orientationData = [];
      this.startTime = null;
      this.recordingTimeout = null;
      
      // DOM elements
      this.container = null;
      this.startButton = null;
      this.resultDisplay = null;
      this.storageManager = new StorageManager();
    }
    
    /**
     * Initialize the balance test
     */
    async init(containerElementId, startButtonId, resultDisplayId) {
      try {
        this.container = document.getElementById(containerElementId);
        this.startButton = document.getElementById(startButtonId);
        this.resultDisplay = document.getElementById(resultDisplayId);
        
        if (!this.container || !this.startButton) {
          throw new Error('Required elements not found');
        }
        
        // Check if orientation is available
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          // iOS 13+ requires permission
          this.updateUI('permission');
        } else if ('DeviceOrientationEvent' in window) {
          // Other browsers with orientation
          this.orientationAvailable = true;
          this.isInitialized = true;
          this.updateUI('ready');
        } else {
          // No orientation available
          this.updateUI('not-available');
          return false;
        }
        
        // Set up event listeners
        this.startButton.addEventListener('click', () => {
          if (!this.orientationAvailable) {
            this.requestOrientationPermission();
          } else {
            this.toggleRecording();
          }
        });
        
        return true;
      } catch (error) {
        console.error('Error initializing balance test:', error);
        return false;
      }
    }
    
    /**
     * Request orientation permission (for iOS 13+)
     */
    async requestOrientationPermission() {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        
        if (response === 'granted') {
          this.orientationAvailable = true;
          this.isInitialized = true;
          this.updateUI('ready');
        } else {
          this.updateUI('permission-denied');
        }
      } catch (error) {
        console.error('Error requesting orientation permission:', error);
        this.updateUI('error', error.message);
      }
    }
    
    /**
     * Toggle recording state
     */
    toggleRecording() {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    }
    
    /**
     * Start recording orientation data
     */
    startRecording() {
      if (!this.orientationAvailable || this.isRecording) return;
      
      // Reset data
      this.orientationData = [];
      this.startTime = Date.now();
      
      // Start recording
      this.isRecording = true;
      this.updateUI('recording');
      
      // Add orientation event listener
      window.addEventListener('deviceorientation', this.handleOrientationEvent.bind(this));
      
      // Set timeout to automatically stop recording
      this.recordingTimeout = setTimeout(() => {
        this.stopRecording();
      }, this.recordingDuration);
      
      // Update button
      if (this.startButton) {
        this.startButton.textContent = 'Stop Test';
      }
      
      return { success: true, message: 'Test started' };
    }
    
    /**
     * Stop recording and analyze data
     */
    stopRecording() {
      if (!this.isRecording) return;
      
      // Stop recording
      this.isRecording = false;
      clearTimeout(this.recordingTimeout);
      
      // Remove event listener
      window.removeEventListener('deviceorientation', this.handleOrientationEvent.bind(this));
      
      // Update UI
      this.updateUI('processing');
      
      // Process data (with slight delay to update UI)
      setTimeout(() => {
        const results = this.analyzeData();
        this.updateUI('complete', results);
        
        // Update button
        if (this.startButton) {
          this.startButton.textContent = 'Start New Test';
        }
      }, 500);
      
      return { success: true, message: 'Test stopped' };
    }
    
    /**
     * Handle orientation data
     */
    handleOrientationEvent(event) {
      if (!this.isRecording) return;
      
      // Get orientation data
      const orientation = {
        alpha: event.alpha || 0, // Z-axis rotation
        beta: event.beta || 0,   // X-axis rotation
        gamma: event.gamma || 0  // Y-axis rotation
      };
      
      // Calculate time since start
      const timestamp = Date.now() - this.startTime;
      
      // Store data
      this.orientationData.push({
        time: timestamp,
        ...orientation
      });
      
      // Update visualization
      this.updateVisualization(orientation);
    }
    
    /**
     * Update real-time visualization
     */
    updateVisualization(orientation) {
      if (!this.container || !orientation) return;
      
      // Find or create visualization element
      let visualElement = document.getElementById('balance-visual');
      if (!visualElement) {
        visualElement = document.createElement('div');
        visualElement.id = 'balance-visual';
        visualElement.style.width = '150px';
        visualElement.style.height = '150px';
        visualElement.style.margin = '0 auto';
        visualElement.style.marginTop = '20px';
        visualElement.style.borderRadius = '50%';
        visualElement.style.backgroundColor = '#3b82f6';
        visualElement.style.position = 'relative';
        visualElement.style.transition = 'transform 0.1s ease-out';
        
        // Add indicator dot
        const indicator = document.createElement('div');
        indicator.id = 'balance-indicator';
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        indicator.style.borderRadius = '50%';
        indicator.style.backgroundColor = 'white';
        indicator.style.position = 'absolute';
        indicator.style.top = '50%';
        indicator.style.left = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.transition = 'all 0.1s ease-out';
        
        visualElement.appendChild(indicator);
        
        const visualContainer = document.getElementById('balance-visual-container');
        if (visualContainer) {
          visualContainer.appendChild(visualElement);
        } else {
          const container = document.createElement('div');
          container.id = 'balance-visual-container';
          container.style.textAlign = 'center';
          container.appendChild(visualElement);
          this.container.appendChild(container);
        }
      }
      
      // Update indicator position based on device tilt
      const indicator = document.getElementById('balance-indicator');
      if (indicator) {
        // Constrain movement to the circle
        const maxOffset = 60; // Maximum pixel offset from center
        const betaOffset = Math.min(maxOffset, Math.max(-maxOffset, orientation.beta));
        const gammaOffset = Math.min(maxOffset, Math.max(-maxOffset, orientation.gamma));
        
        // Apply orientation to indicator position
        indicator.style.transform = `translate(
          calc(-50% + ${gammaOffset / 2}px), 
          calc(-50% + ${betaOffset / 2}px)
        )`;
        
        // Color based on stability
        const distance = Math.sqrt(betaOffset * betaOffset + gammaOffset * gammaOffset);
        const normalizedDistance = distance / maxOffset;
        
        if (normalizedDistance < 0.3) {
          indicator.style.backgroundColor = '#10b981'; // Green
        } else if (normalizedDistance < 0.6) {
          indicator.style.backgroundColor = '#f59e0b'; // Yellow
        } else {
          indicator.style.backgroundColor = '#ef4444'; // Red
        }
      }
    }
    
    /**
     * Analyze balance data
     */
    analyzeData() {
      // Check if we have enough data
      if (this.orientationData.length < 10) {
        return {
          stabilityScore: null,
          swayArea: null,
          category: "Insufficient Data",
          message: "Not enough orientation data was collected. Please try again.",
          alertLevel: "warning"
        };
      }
      
      // Calculate balance metrics
      const metrics = this.calculateBalanceMetrics();
      
      // Determine balance characteristics
      let category, message, alertLevel;
      
      if (metrics.stabilityScore > 85) {
        category = "Excellent Balance";
        message = "Your balance stability is excellent. You maintained a very steady position throughout the test.";
        alertLevel = "success";
      } else if (metrics.stabilityScore > 70) {
        category = "Good Balance";
        message = "Your balance is good. You maintained a steady position with minimal sway.";
        alertLevel = "success";
      } else if (metrics.stabilityScore > 50) {
        category = "Average Balance";
        message = "Your balance is within the normal range. Regular balance exercises can help improve stability.";
        alertLevel = "info";
      } else if (metrics.stabilityScore > 30) {
        category = "Below Average Balance";
        message = "Your balance shows some instability. Consider balance exercises and activities like yoga or tai chi.";
        alertLevel = "info";
      } else {
        category = "Balance Concerns";
        message = "Your balance test shows significant instability. Consider discussing balance concerns with a healthcare provider.";
        alertLevel = "warning";
      }
      
      const result = {
        stabilityScore: metrics.stabilityScore,
        swayArea: metrics.swayArea,
        category,
        message,
        alertLevel
      };

      // Save to local storage
      this.storageManager.saveTestResult('balance', result);
      
      return result;
    }
    
    /**
     * Calculate balance metrics
     */
    calculateBalanceMetrics() {
      // Extract beta (forward/backward tilt) and gamma (left/right tilt) data
      const betaData = this.orientationData.map(d => d.beta);
      const gammaData = this.orientationData.map(d => d.gamma);
      
      // Calculate statistical measures
      const betaVariance = this.calculateVariance(betaData);
      const gammaVariance = this.calculateVariance(gammaData);
      
      // Calculate total sway
      const totalSway = Math.sqrt(betaVariance + gammaVariance);
      
      // Calculate sway area (approximate using variance)
      const swayArea = Math.PI * Math.sqrt(betaVariance) * Math.sqrt(gammaVariance);
      
      // Calculate path length
      let pathLength = 0;
      for (let i = 1; i < this.orientationData.length; i++) {
        const dx = this.orientationData[i].beta - this.orientationData[i-1].beta;
        const dy = this.orientationData[i].gamma - this.orientationData[i-1].gamma;
        pathLength += Math.sqrt(dx*dx + dy*dy);
      }
      
      // Calculate stability score (inverse of sway, normalized to 0-100)
      const stabilityScore = Math.max(0, Math.min(100, 100 - (totalSway * 5)));
      
      return {
        stabilityScore,
        swayArea,
        pathLength,
        betaVariance,
        gammaVariance
      };
    }
    
    /**
     * Calculate variance of a data series
     */
    calculateVariance(data) {
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
      const squaredDifferences = data.map(val => Math.pow(val - mean, 2));
      return squaredDifferences.reduce((sum, val) => sum + val, 0) / data.length;
    }
    
    /**
     * Update the UI based on test state
     */
    updateUI(state, data = null) {
      if (!this.container) return;
      
      switch (state) {
        case 'permission':
          this.container.innerHTML = `
            <div class="balance-permission">
              <h4>Device Orientation Access Required</h4>
              <p>This test needs access to your device's orientation sensors to measure balance.</p>
              <p>Click the button below to grant permission.</p>
            </div>
          `;
          if (this.startButton) {
            this.startButton.textContent = 'Grant Permission';
          }
          break;
          
        case 'permission-denied':
          this.container.innerHTML = `
            <div class="balance-error">
              <h4>Permission Denied</h4>
              <p>Access to the orientation sensors was denied. Please enable sensors in your browser or device settings.</p>
            </div>
          `;
          if (this.startButton) {
            this.startButton.textContent = 'Try Again';
          }
          break;
          
        case 'not-available':
          this.container.innerHTML = `
            <div class="balance-error">
              <h4>Sensors Not Available</h4>
              <p>Your device does not have orientation sensors or they are not accessible.</p>
              <p>This test requires a mobile device with orientation sensors.</p>
            </div>
          `;
          if (this.startButton) {
            this.startButton.disabled = true;
            this.startButton.textContent = 'Not Available';
          }
          break;
          
        case 'ready':
          this.container.innerHTML = `
            <div class="balance-ready">
              <h4>Balance Stability Test</h4>
              <p>This test measures your balance stability using your device's orientation sensors.</p>
              <ol>
                <li>Place your device flat against your sternum (chest bone)</li>
                <li>Stand with your feet together</li>
                <li>Close your eyes (optional, for more challenge)</li>
                <li>Stand as still as possible for ${this.recordingDuration/1000} seconds</li>
              </ol>
              <div class="balance-diagram">
                <img src="assets/images/balance-test-position.png" alt="Test Position" onerror="this.style.display='none'">
              </div>
            </div>
          `;
          if (this.startButton) {
            this.startButton.disabled = false;
            this.startButton.textContent = 'Start Balance Test';
          }
          break;
          
        case 'recording':
          const recordingTimeLeft = Math.round((this.recordingDuration - (Date.now() - this.startTime)) / 1000);
          this.container.innerHTML = `
            <div class="balance-recording">
              <h4>Balance Test in Progress</h4>
              <p>Stand still. ${recordingTimeLeft} seconds remaining...</p>
              <div class="balance-progress">
                <div class="balance-progress-bar" style="width: ${((Date.now() - this.startTime) / this.recordingDuration) * 100}%"></div>
              </div>
              <div id="balance-visual-container"></div>
            </div>
          `;
          break;
          
        case 'processing':
          this.container.innerHTML = `
            <div class="balance-processing">
              <h4>Processing Data</h4>
              <p>Analyzing balance stability...</p>
            </div>
          `;
          break;
          
        case 'complete':
          const stabilityScore = data.stabilityScore ? Math.round(data.stabilityScore) : 'N/A';
          
          this.container.innerHTML = `
            <div class="balance-complete">
              <h4>Balance Test Results</h4>
              <div class="balance-score">
                <div class="score-display">
                  <div class="score-circle" style="background: conic-gradient(#10b981 0% ${stabilityScore}%, #f1f5f9 ${stabilityScore}% 100%);">
                    <div class="score-value">${stabilityScore}</div>
                  </div>
                  <div class="score-label">Stability Score</div>
                </div>
              </div>
              <div class="alert-box alert-${data.alertLevel}">
                <h5>${data.category}</h5>
                <p>${data.message}</p>
              </div>
            </div>
          `;
          
          // Update result display if available
          if (this.resultDisplay) {
            this.resultDisplay.innerHTML = `
              <div class="result-item">
                <div class="result-header">
                  <h4 class="result-title">Balance Stability Test</h4>
                  <span class="result-timestamp">${new Date().toLocaleString()}</span>
                </div>
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Stability Score:</span>
                    <span class="detail-value">${stabilityScore}/100</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${data.category}</span>
                  </div>
                  <div class="alert-box alert-${data.alertLevel}">
                    <p>${data.message}</p>
                  </div>
                </div>
              </div>
            `;
          }
          break;
          
        case 'error':
          this.container.innerHTML = `
            <div class="balance-error">
              <h4>Error</h4>
              <p>${data || 'An unknown error occurred'}</p>
            </div>
          `;
          break;
      }
    }
  }
  
  // Export all test modules
  export default {
    RespiratoryRateMonitor,
    ReactionTimeTest,
    TremorAnalyzer,
    BalanceTest
  };