// models/hearing-tests.js
// Hearing Test Module - Audio-based Assessment

// Constants for hearing test
const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000]; // Hz
const INTENSITY_LEVELS = [0, 10, 20, 30, 40, 50, 60]; // dB
const TEST_DURATION = 2; // seconds
const RAMP_DURATION = 0.1; // seconds

class HearingTestManager {
  constructor() {
    this.reset();
    this.audioContext = null;
    this.calibrationGain = 1.0; // To be adjusted during calibration
  }
  
  reset() {
    this.isInitialized = false;
    this.isCalibrated = false;
    this.currentFrequencyIndex = 0;
    this.currentIntensityIndex = 3; // Start at middle intensity
    this.results = {};
    this.thresholds = {};
    this.testRunning = false;
    this.testComplete = false;
    this.activeOscillator = null;
    this.activeGainNode = null;
  }
  
  async initialize() {
    if (this.isInitialized) return { status: 'already_initialized' };
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Check if audio context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      return { status: 'initialized' };
    } catch (error) {
      console.error('Error initializing audio context:', error);
      return { status: 'error', message: error.message };
    }
  }
  
  async calibrate() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Play a 1kHz calibration tone at 20dB reference level
      await this.playTone(1000, 20, 3);
      
      // In a real app, we would measure device output and adjust calibrationGain
      // For now, just set a default value
      this.calibrationGain = 1.0;
      this.isCalibrated = true;
      
      return { status: 'calibrated' };
    } catch (error) {
      console.error('Error during calibration:', error);
      return { status: 'error', message: error.message };
    }
  }
  
  async startTest() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.isCalibrated) {
      await this.calibrate();
    }
    
    // Reset test state
    this.currentFrequencyIndex = 0;
    this.currentIntensityIndex = 3; // Start at middle intensity
    this.results = {};
    this.thresholds = {};
    this.testComplete = false;
    this.testRunning = true;
    
    // Start the first test
    return this.presentNextTone();
  }
  
  stopTest() {
    this.stopCurrentTone();
    this.testRunning = false;
    
    return {
      status: 'stopped',
      message: 'Test stopped before completion'
    };
  }
  
  async presentNextTone() {
    if (!this.testRunning) {
      return { status: 'not_running' };
    }
    
    // Check if all frequencies have been tested
    if (this.currentFrequencyIndex >= FREQUENCIES.length) {
      this.testComplete = true;
      this.testRunning = false;
      return this.calculateResults();
    }
    
    const frequency = FREQUENCIES[this.currentFrequencyIndex];
    const intensity = INTENSITY_LEVELS[this.currentIntensityIndex];
    
    // Play tone
    await this.playTone(frequency, intensity);
    
    return {
      status: 'playing',
      frequency,
      intensity,
      frequencyIndex: this.currentFrequencyIndex,
      totalFrequencies: FREQUENCIES.length
    };
  }
  
  async playTone(frequency, intensityDB, duration = TEST_DURATION) {
    this.stopCurrentTone();
    
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
          this.audioContext.currentTime + RAMP_DURATION
        );
        gainNode.gain.setValueAtTime(
          linearGain,
          this.audioContext.currentTime + duration - RAMP_DURATION
        );
        gainNode.gain.linearRampToValueAtTime(
          0,
          this.audioContext.currentTime + duration
        );
        
        // Connect audio nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Store active nodes
        this.activeOscillator = oscillator;
        this.activeGainNode = gainNode;
        
        // Start and schedule stop
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        // Resolve promise after tone completes
        oscillator.onended = () => {
          this.activeOscillator = null;
          this.activeGainNode = null;
          resolve({ status: 'completed' });
        };
      } catch (error) {
        console.error('Error playing tone:', error);
        reject(error);
      }
    });
  }
  
  stopCurrentTone() {
    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
        this.activeOscillator.disconnect();
        this.activeGainNode.disconnect();
      } catch (error) {
        // Ignore errors when stopping
      }
      
      this.activeOscillator = null;
      this.activeGainNode = null;
    }
  }
  
  // User response handling
  respondToTone(heard) {
    if (!this.testRunning) {
      return { status: 'not_running' };
    }
    
    const frequency = FREQUENCIES[this.currentFrequencyIndex];
    const intensity = INTENSITY_LEVELS[this.currentIntensityIndex];
    
    // Store response
    if (!this.results[frequency]) {
      this.results[frequency] = [];
    }
    
    this.results[frequency].push({
      intensity,
      heard
    });
    
    // Adjust intensity based on response (simple up-down staircase procedure)
    if (heard) {
      // If tone was heard, decrease intensity
      this.currentIntensityIndex = Math.max(0, this.currentIntensityIndex - 1);
    } else {
      // If tone was not heard, increase intensity
      this.currentIntensityIndex = Math.min(INTENSITY_LEVELS.length - 1, this.currentIntensityIndex + 1);
    }
    
    // Check if threshold has been found for this frequency
    if (this.shouldMoveToNextFrequency()) {
      // Calculate threshold for this frequency
      this.calculateThresholdForCurrentFrequency();
      
      // Move to next frequency
      this.currentFrequencyIndex++;
      this.currentIntensityIndex = 3; // Reset to middle intensity
    }
    
    // Present next tone
    return this.presentNextTone();
  }
  
  // Determine when to move to the next frequency
  // This is a simplified implementation - real audiometry uses more complex criteria
  shouldMoveToNextFrequency() {
    const frequency = FREQUENCIES[this.currentFrequencyIndex];
    const responses = this.results[frequency] || [];
    
    // Need at least 3 responses for a frequency
    if (responses.length < 3) {
      return false;
    }
    
    // Check if we've reached bottom intensity and still hearing
    if (this.currentIntensityIndex === 0 && responses[responses.length - 1].heard) {
      return true;
    }
    
    // Check if we've reached top intensity and still not hearing
    if (this.currentIntensityIndex === INTENSITY_LEVELS.length - 1 && !responses[responses.length - 1].heard) {
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
    const frequency = FREQUENCIES[this.currentFrequencyIndex];
    const responses = this.results[frequency] || [];
    
    if (responses.length === 0) {
      this.thresholds[frequency] = null;
      return;
    }
    
    // Find the lowest intensity where subject consistently heard the tone
    let lowestHeardIntensity = 100;
    
    for (const response of responses) {
      if (response.heard && response.intensity < lowestHeardIntensity) {
        lowestHeardIntensity = response.intensity;
      }
    }
    
    // If lowest heard intensity is our lowest test intensity (0dB), report it as such
    if (lowestHeardIntensity === INTENSITY_LEVELS[0]) {
      this.thresholds[frequency] = lowestHeardIntensity;
      return;
    }
    
    // Find highest intensity where subject consistently did not hear the tone
    let highestNotHeardIntensity = -1;
    
    for (const response of responses) {
      if (!response.heard && response.intensity > highestNotHeardIntensity) {
        highestNotHeardIntensity = response.intensity;
      }
    }
    
    // If highest not-heard intensity is our highest test intensity, report it
    if (highestNotHeardIntensity === INTENSITY_LEVELS[INTENSITY_LEVELS.length - 1]) {
      this.thresholds[frequency] = '>60'; // Beyond our testing range
      return;
    }
    
    // If we have both heard and not-heard thresholds, calculate midpoint
    if (lowestHeardIntensity < 100 && highestNotHeardIntensity > -1) {
      this.thresholds[frequency] = (lowestHeardIntensity + highestNotHeardIntensity) / 2;
    } else if (lowestHeardIntensity < 100) {
      this.thresholds[frequency] = lowestHeardIntensity;
    } else {
      this.thresholds[frequency] = '>60'; // Beyond our testing range
    }
  }
  
  // Calculate final test results
  calculateResults() {
    // Ensure thresholds for all tested frequencies
    for (const frequency of FREQUENCIES) {
      if (!this.thresholds[frequency] && this.results[frequency]) {
        this.calculateThresholdForCurrentFrequency();
      }
    }
    
    // Determine hearing health status
    const normalThresholds = [20, 20, 20, 20, 20, 25]; // Normal hearing thresholds by frequency
    let totalDeviation = 0;
    let measuredFrequencies = 0;
    
    for (let i = 0; i < FREQUENCIES.length; i++) {
      const frequency = FREQUENCIES[i];
      const threshold = this.thresholds[frequency];
      
      if (threshold !== null && threshold !== '>60') {
        const normalThreshold = normalThresholds[i];
        totalDeviation += Math.max(0, threshold - normalThreshold);
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
      status: 'complete',
      thresholds: this.thresholds,
      category,
      description,
      alertLevel,
      avgDeviation,
      results: this.results
    };
  }
  
  // Simulate test for development/demo purposes
  simulateTest(hearingProfile = 'normal') {
    this.reset();
    
    // Simulate different hearing profiles
    let thresholds;
    
    switch (hearingProfile) {
      case 'normal':
        thresholds = {
          250: 15,
          500: 10,
          1000: 5,
          2000: 5,
          4000: 15,
          8000: 20
        };
        break;
      case 'mild-loss':
        thresholds = {
          250: 25,
          500: 25,
          1000: 30,
          2000: 35,
          4000: 40,
          8000: 45
        };
        break;
      case 'high-frequency-loss':
        thresholds = {
          250: 15,
          500: 15,
          1000: 20,
          2000: 35,
          4000: 55,
          8000: 70
        };
        break;
      default:
        thresholds = {
          250: 15,
          500: 10,
          1000: 5,
          2000: 5,
          4000: 15,
          8000: 20
        };
    }
    
    // Set simulated thresholds
    this.thresholds = thresholds;
    
    // Simulate results
    for (const frequency of FREQUENCIES) {
      const threshold = thresholds[frequency];
      this.results[frequency] = [];
      
      // Simulate a test sequence for each frequency
      for (let i = 0; i < 5; i++) {
        const intensity = 20 + (i * 10) - 20;
        this.results[frequency].push({
          intensity,
          heard: intensity >= threshold
        });
      }
    }
    
    this.testComplete = true;
    
    // Return results
    return this.calculateResults();
  }
}

// Export for use in main application
export { HearingTestManager, FREQUENCIES, INTENSITY_LEVELS };