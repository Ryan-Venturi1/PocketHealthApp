// modules/hearing-tester.js - Interactive hearing test using audio frequencies

class HearingTester {
    constructor() {
      // Audio context
      this.audioContext = null;
      
      // Test configuration
      this.testConfig = {
        frequencies: [250, 500, 1000, 2000, 4000, 8000], // Hz
        intensityLevels: [0, 10, 20, 30, 40, 50, 60], // dB
        testDuration: 2, // seconds
        rampDuration: 0.1 // seconds for fade in/out
      };
      
      // Test state
      this.testState = {
        isInitialized: false,
        isCalibrated: false,
        currentFrequencyIndex: 0,
        currentIntensityIndex: 3, // Start at middle intensity
        results: {},
        thresholds: {},
        testRunning: false,
        testComplete: false,
        activeOscillator: null,
        activeGainNode: null
      };
      
      // Calibration gain (would be set during true calibration)
      this.calibrationGain = 1.0;
    }
    
    async initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="hearing-test-container">
          <div id="hearing-instructions" class="test-instructions">
            <h4>Hearing Test</h4>
            <p>This test will assess your hearing across different frequencies.</p>
            <div class="setup-checklist">
              <div class="checklist-item">
                <input type="checkbox" id="headphones-check">
                <label for="headphones-check">I am using headphones or earbuds</label>
              </div>
              <div class="checklist-item">
                <input type="checkbox" id="quiet-check">
                <label for="quiet-check">I am in a quiet environment</label>
              </div>
              <div class="checklist-item">
                <input type="checkbox" id="volume-check">
                <label for="volume-check">My volume is at a comfortable level</label>
              </div>
            </div>
            <div class="button-container">
              <button id="test-sound" class="secondary-button">Test Your Sound</button>
              <button id="start-hearing-test" class="primary-button" disabled>Start Test</button>
            </div>
            <p class="note">Please check all items above to continue</p>
          </div>
          
          <div id="hearing-test-area" class="test-area" style="display:none;">
            <h4>Hearing Test</h4>
            <div class="frequency-display">
              <p>You will hear a series of tones. Press the button when you hear a tone.</p>
              <div class="current-frequency">
                Testing: <span id="current-frequency">- Hz</span>
              </div>
              <div class="frequency-progress">
                <div class="progress-bar-container">
                  <div id="frequency-progress-bar" class="progress-bar"></div>
                </div>
                <div class="progress-text">
                  Frequency <span id="current-frequency-index">1</span> of <span id="total-frequencies">6</span>
                </div>
              </div>
            </div>
            <div class="hearing-controls">
              <button id="heard-tone" class="primary-button">I Heard It</button>
              <button id="didnt-hear" class="secondary-button">I Didn't Hear Anything</button>
            </div>
          </div>
          
          <div id="hearing-results" class="results-container" style="display:none;">
            <h3>Hearing Test Results</h3>
            <div id="results-content"></div>
          </div>
        </div>
      `;
      
      // Set up event listeners
      this.setupEventListeners(container);
      
      // Initialize audio context
      await this.initializeAudio();
    }
    
    setupEventListeners(container) {
      // Checkbox event listeners
      container.querySelectorAll('.setup-checklist input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => this.updateStartButton(container));
      });
      
      // Test sound button
      container.querySelector('#test-sound').addEventListener('click', () => this.playTestSound());
      
      // Start test button
      container.querySelector('#start-hearing-test').addEventListener('click', () => this.startTest(container));
      
      // Heard tone button
      container.querySelector('#heard-tone').addEventListener('click', () => this.respondToTone(true));
      
      // Didn't hear button
      container.querySelector('#didnt-hear').addEventListener('click', () => this.respondToTone(false));
    }
    
    updateStartButton(container) {
      const checkboxes = container.querySelectorAll('.setup-checklist input[type="checkbox"]');
      const startButton = container.querySelector('#start-hearing-test');
      
      // Enable start button if all checkboxes are checked
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      if (startButton) {
        startButton.disabled = !allChecked;
      }
    }
    
    async initializeAudio() {
      try {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Check if audio context is running
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        this.testState.isInitialized = true;
        return true;
      } catch (error) {
        console.error('Error initializing audio context:', error);
        return false;
      }
    }
    
    async playTestSound() {
      if (!this.testState.isInitialized) {
        await this.initializeAudio();
      }
      
      try {
        // Play a 1kHz calibration tone at 20dB reference level
        await this.playTone(1000, 20, 1);
        return true;
      } catch (error) {
        console.error('Error playing test sound:', error);
        return false;
      }
    }
    
    async startTest(container) {
      if (!this.testState.isInitialized) {
        await this.initializeAudio();
      }
      
      // Show test area, hide instructions
      container.querySelector('#hearing-instructions').style.display = 'none';
      container.querySelector('#hearing-test-area').style.display = 'block';
      
      // Reset test state
      this.testState.currentFrequencyIndex = 0;
      this.testState.currentIntensityIndex = 3; // Start at middle intensity
      this.testState.results = {};
      this.testState.thresholds = {};
      this.testState.testComplete = false;
      this.testState.testRunning = true;
      
      // Start the first test
      this.presentNextTone();
    }
    
    async presentNextTone() {
      if (!this.testState.testRunning) {
        return;
      }
      
      // Check if all frequencies have been tested
      if (this.testState.currentFrequencyIndex >= this.testConfig.frequencies.length) {
        this.testState.testComplete = true;
        this.testState.testRunning = false;
        this.showResults();
        return;
      }
      
      const frequency = this.testConfig.frequencies[this.testState.currentFrequencyIndex];
      const intensity = this.testConfig.intensityLevels[this.testState.currentIntensityIndex];
      
      // Update UI
      document.getElementById('current-frequency').textContent = `${frequency} Hz`;
      document.getElementById('current-frequency-index').textContent = this.testState.currentFrequencyIndex + 1;
      
      // Update progress bar
      const progressBar = document.getElementById('frequency-progress-bar');
      if (progressBar) {
        const progress = (this.testState.currentFrequencyIndex / this.testConfig.frequencies.length) * 100;
        progressBar.style.width = `${progress}%`;
      }
      
      // Play tone
      try {
        await this.playTone(frequency, intensity);
      } catch (error) {
        console.error('Error playing tone:', error);
      }
    }
    
    async playTone(frequency, intensityDB, duration = null) {
      this.stopCurrentTone();
      
      if (!duration) {
        duration = this.testConfig.testDuration;
      }
      
      return new Promise((resolve, reject) => {
        try {
          // Create oscillator
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          // Set frequency
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          
          // Convert dB to linear gain (formula: gain = 10^(dB/20))
          // Note: 0dB reference is system-dependent, hence the calibrationGain
          const linearGain = Math.pow(10, intensityDB / 20) * this.calibrationGain;
          
          // Apply gain with ramp to avoid clicks
          gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            linearGain, 
            this.audioContext.currentTime + this.testConfig.rampDuration
          );
          gainNode.gain.setValueAtTime(
            linearGain,
            this.audioContext.currentTime + duration - this.testConfig.rampDuration
          );
          gainNode.gain.linearRampToValueAtTime(
            0,
            this.audioContext.currentTime + duration
          );
          
          // Connect audio nodes
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          // Store active nodes
          this.testState.activeOscillator = oscillator;
          this.testState.activeGainNode = gainNode;
          
          // Start and schedule stop
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + duration);
          
          // Resolve promise after tone completes
          oscillator.onended = () => {
            this.testState.activeOscillator = null;
            this.testState.activeGainNode = null;
            resolve();
          };
        } catch (error) {
          console.error('Error playing tone:', error);
          reject(error);
        }
      });
    }
    
    stopCurrentTone() {
      if (this.testState.activeOscillator) {
        try {
          this.testState.activeOscillator.stop();
          this.testState.activeOscillator.disconnect();
          this.testState.activeGainNode.disconnect();
        } catch (error) {
          // Ignore errors when stopping
        }
        
        this.testState.activeOscillator = null;
        this.testState.activeGainNode = null;
      }
    }
    
    // User response handling
    respondToTone(heard) {
      if (!this.testState.testRunning) {
        return;
      }
      
      const frequency = this.testConfig.frequencies[this.testState.currentFrequencyIndex];
      const intensity = this.testConfig.intensityLevels[this.testState.currentIntensityIndex];
      
      // Store response
      if (!this.testState.results[frequency]) {
        this.testState.results[frequency] = [];
      }
      
      this.testState.results[frequency].push({
        intensity,
        heard
      });
      
      // Adjust intensity based on response (simple up-down staircase procedure)
      if (heard) {
        // If tone was heard, decrease intensity
        this.testState.currentIntensityIndex = Math.max(0, this.testState.currentIntensityIndex - 1);
      } else {
        // If tone was not heard, increase intensity
        this.testState.currentIntensityIndex = Math.min(
          this.testConfig.intensityLevels.length - 1, 
          this.testState.currentIntensityIndex + 1
        );
      }
      
      // Check if threshold has been found for this frequency
      if (this.shouldMoveToNextFrequency()) {
        // Calculate threshold for this frequency
        this.calculateThresholdForCurrentFrequency();
        
        // Move to next frequency
        this.testState.currentFrequencyIndex++;
        this.testState.currentIntensityIndex = 3; // Reset to middle intensity
      }
      
      // Present next tone
      this.presentNextTone();
    }
    
    // Determine when to move to the next frequency
    // This is a simplified implementation - real audiometry uses more complex criteria
    shouldMoveToNextFrequency() {
      const frequency = this.testConfig.frequencies[this.testState.currentFrequencyIndex];
      const responses = this.testState.results[frequency] || [];
      
      // Need at least 3 responses for a frequency
      if (responses.length < 3) {
        return false;
      }
      
      // Check if we've reached bottom intensity and still hearing
      if (this.testState.currentIntensityIndex === 0 && responses[responses.length - 1].heard) {
        return true;
      }
      
      // Check if we've reached top intensity and still not hearing
      if (this.testState.currentIntensityIndex === this.testConfig.intensityLevels.length - 1 && 
          !responses[responses.length - 1].heard) {
        return true;
      }
      
      // Check for 3 reversals (changes in direction)
      if (responses.length >= 4) {
        let reversals = 0;
        for (let i = 1; i < responses.length; i++) {
          if ((responses[i].heard && !responses[i-1].heard) || 
              (!responses[i].heard && responses[i-1].heard)) {
            reversals++;
          }
        }
        
        return reversals >= 3;
      }
      
      return false;
    }
    
    // Calculate threshold for the current frequency
    calculateThresholdForCurrentFrequency() {
      const frequency = this.testConfig.frequencies[this.testState.currentFrequencyIndex];
      const responses = this.testState.results[frequency] || [];
      
      if (responses.length === 0) {
        this.testState.thresholds[frequency] = null;
        return;
      }
      
      // Find the lowest intensity where subject consistently heard the tone
      let lowestHeardIntensity = 100; // Start with a high value
      
      for (const response of responses) {
        if (response.heard && response.intensity < lowestHeardIntensity) {
          lowestHeardIntensity = response.intensity;
        }
      }
      
      // If lowest heard intensity is our lowest test intensity (0dB), report it as such
      if (lowestHeardIntensity === this.testConfig.intensityLevels[0]) {
        this.testState.thresholds[frequency] = lowestHeardIntensity;
        return;
      }
      
      // Find highest intensity where subject consistently did not hear the tone
      let highestNotHeardIntensity = -1; // Start with a low value
      
      for (const response of responses) {
        if (!response.heard && response.intensity > highestNotHeardIntensity) {
          highestNotHeardIntensity = response.intensity;
        }
      }
      
      // If highest not-heard intensity is our highest test intensity, report it
      if (highestNotHeardIntensity === this.testConfig.intensityLevels[this.testConfig.intensityLevels.length - 1]) {
        this.testState.thresholds[frequency] = '>60'; // Beyond our testing range
        return;
      }
      
      // If we have both heard and not-heard thresholds, calculate midpoint
      if (lowestHeardIntensity < 100 && highestNotHeardIntensity > -1) {
        this.testState.thresholds[frequency] = (lowestHeardIntensity + highestNotHeardIntensity) / 2;
      } else if (lowestHeardIntensity < 100) {
        this.testState.thresholds[frequency] = lowestHeardIntensity;
      } else {
        this.testState.thresholds[frequency] = '>60'; // Beyond our testing range
      }
    }
    
    showResults() {
      // Calculate results
      const results = this.calculateResults();
      
      // Show results container
      document.getElementById('hearing-test-area').style.display = 'none';
      document.getElementById('hearing-results').style.display = 'block';
      
      // Format results for display
      const resultRows = [];
      for (const frequency of this.testConfig.frequencies) {
        const threshold = this.testState.thresholds[frequency];
        let status;
        
        // Determine status for each frequency
        if (threshold === null) {
          status = "Not tested";
        } else if (threshold === ">60") {
          status = "Significant loss";
        } else if (threshold > 40) {
          status = "Moderate loss";
        } else if (threshold > 25) {
          status = "Mild loss";
        } else {
          status = "Normal";
        }
        
        resultRows.push(`
          <div class="detail-row">
            <span class="detail-label">${frequency} Hz:</span>
            <span class="detail-value">${threshold !== null ? (threshold === ">60" ? threshold : threshold + " dB") : "N/A"}</span>
            <span class="detail-status">${status}</span>
          </div>
        `);
      }
      
      // Format results HTML
      const resultsHtml = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Hearing Assessment</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <div class="result-details">
              <h5>Frequency Thresholds</h5>
              ${resultRows.join('')}
              <div class="alert-box alert-${results.alertLevel}">
                <strong>${results.category}</strong>
                <p>${results.description}</p>
              </div>
              <p class="disclaimer">This test is not a substitute for a professional hearing evaluation with an audiologist.</p>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHtml;
      
      // Save results
      this.saveResults(results);
    }
    
    calculateResults() {
      // Ensure thresholds for all tested frequencies
      for (const frequency of this.testConfig.frequencies) {
        if (!this.testState.thresholds[frequency] && this.testState.results[frequency]) {
          this.calculateThresholdForCurrentFrequency();
        }
      }
      
      // Determine hearing health status
      const normalThresholds = [20, 20, 20, 20, 20, 25]; // Normal hearing thresholds by frequency
      let totalDeviation = 0;
      let measuredFrequencies = 0;
      
      for (let i = 0; i < this.testConfig.frequencies.length; i++) {
        const frequency = this.testConfig.frequencies[i];
        const threshold = this.testState.thresholds[frequency];
        
        if (threshold !== null && threshold !== '>60') {
          const normalThreshold = normalThresholds[i];
          totalDeviation += Math.max(0, threshold - normalThreshold);
          measuredFrequencies++;
        } else if (threshold === '>60') {
          // Count significant loss as 40dB above normal
          totalDeviation += 40;
          measuredFrequencies++;
        }
      }
      
      // Calculate average deviation from normal thresholds
      const avgDeviation = measuredFrequencies > 0 ? totalDeviation / measuredFrequencies : 0;
      
      // Determine hearing health category
      let category, description, alertLevel;
      
      if (avgDeviation <= 15) {
        category = "Normal Hearing";
        description = "Your hearing thresholds fall within the normal range across test frequencies.";
        alertLevel = "success";
      } else if (avgDeviation <= 30) {
        category = "Mild Hearing Loss";
        description = "Your results suggest mild hearing loss. Consider a professional hearing evaluation.";
        alertLevel = "info";
      } else if (avgDeviation <= 50) {
        category = "Moderate Hearing Loss";
        description = "Your results suggest moderate hearing loss. A professional hearing evaluation is recommended.";
        alertLevel = "warning";
      } else {
        category = "Significant Hearing Loss";
        description = "Your results suggest significant hearing loss. Please consult with an audiologist.";
        alertLevel = "danger";
      }
      
      return {
        thresholds: this.testState.thresholds,
        category,
        description,
        alertLevel,
        avgDeviation,
        results: this.testState.results
      };
    }
    
    saveResults(results) {
      // Format thresholds for display
      const thresholdSummary = {};
      for (const frequency of this.testConfig.frequencies) {
        const threshold = this.testState.thresholds[frequency];
        thresholdSummary[frequency] = threshold !== null ? 
          (threshold === ">60" ? threshold : Math.round(threshold) + " dB") : "N/A";
      }
      
      // Create a summary for storage
      const summary = `Hearing test: ${results.category} (avg. deviation: ${Math.round(results.avgDeviation)} dB)`;
      
      // Add to local storage via the controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('hearing', {
          category: results.category,
          avgDeviation: Math.round(results.avgDeviation),
          thresholds: thresholdSummary,
          needsDoctor: results.alertLevel === 'warning' || results.alertLevel === 'danger',
          summary
        });
      }
    }
    
    cleanup() {
      // Stop any playing audio
      this.stopCurrentTone();
      
      // Close audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    }
  }
  
  export default HearingTester;