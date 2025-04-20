// modules/tremor-analyzer.js - Tremor analysis using device motion sensors

class TremorAnalyzer {
    constructor() {
      // Test configuration
      this.config = {
        testDuration: 15, // seconds
        handOptions: ['right', 'left'], // Test both hands
        sampleRate: 50,   // Target samples per second
      };
      
      // Test state
      this.state = {
        isRunning: false,
        currentHand: null,
        testStartTime: null,
        timeRemaining: 0,
        sensorData: {
          right: [],
          left: []
        },
        results: {
          right: null,
          left: null
        },
        accelerometer: null,
        dataInterval: null,
        countdownInterval: null,
        deviceSupport: null, // null = unknown, true = supported, false = not supported
      };
    }
    
    initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="tremor-test-container">
          <div id="tremor-instructions" class="test-instructions">
            <h4>Tremor Analysis Test</h4>
            <p>This test will measure tremors in your hands using your device's motion sensors.</p>
            
            <div id="device-support-message" class="support-message">
              Checking device compatibility...
            </div>
            
            <ol id="test-steps" style="display:none;">
              <li>Hold your device in your hand as shown in the illustration</li>
              <li>Keep your arm extended in front of you</li>
              <li>Try to hold the device as still as possible for 15 seconds</li>
              <li>The test will measure both hands, starting with your right hand</li>
            </ol>
            
            <div class="hand-illustration">
              <svg width="200" height="120" viewBox="0 0 200 120">
                <rect x="70" y="20" width="60" height="100" rx="10" fill="#f3f4f6" stroke="#9ca3af" stroke-width="2"/>
                <path d="M50,70 Q30,50 40,20 Q60,30 70,50 L70,70" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
                <path d="M50,70 L70,70" fill="none" stroke="#d97706" stroke-width="2"/>
                <circle cx="40" cy="25" r="5" fill="#fbbf24"/>
              </svg>
            </div>
            
            <div class="button-container">
              <button id="start-tremor-test" class="primary-button" disabled>Start Test</button>
            </div>
          </div>
          
          <div id="tremor-test-area" class="test-area" style="display:none;">
            <h4 id="tremor-test-title">Testing Right Hand</h4>
            
            <div class="tremor-visualization">
              <div class="device-frame">
                <div id="tremor-indicator" class="tremor-indicator"></div>
              </div>
            </div>
            
            <div class="tremor-countdown">
              <div class="timer-circle">
                <div id="tremor-timer">15</div>
                <div class="timer-label">seconds</div>
              </div>
            </div>
            
            <p class="test-instruction">Hold your device as still as possible until the timer reaches zero.</p>
          </div>
          
          <div id="tremor-results" class="results-container" style="display:none;">
            <h3>Tremor Analysis Results</h3>
            <div id="results-content"></div>
          </div>
        </div>
      `;
      
      // Add CSS to head
      this.addStyles();
      
      // Check device support for motion sensors
      this.checkDeviceSupport();
      
      // Add event listeners
      this.addEventListeners(container);
    }
    
    addStyles() {
      // Add CSS if not already present
      if (!document.getElementById('tremor-analyzer-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'tremor-analyzer-styles';
        
        styleEl.textContent = `
          .tremor-test-container {
            max-width: 800px;
            margin: 0 auto;
          }
          
          .support-message {
            padding: 15px;
            margin: 20px 0;
            background-color: #f3f4f6;
            border-radius: 8px;
            text-align: center;
          }
          
          .support-message.supported {
            background-color: #dcfce7;
            color: #166534;
          }
          
          .support-message.unsupported {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .hand-illustration {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          
          .test-area {
            text-align: center;
            padding: 20px;
          }
          
          .tremor-visualization {
            margin: 20px 0;
            position: relative;
            height: 200px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .device-frame {
            width: 100px;
            height: 180px;
            background-color: #f3f4f6;
            border: 2px solid #9ca3af;
            border-radius: 10px;
            position: relative;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .tremor-indicator {
            position: absolute;
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: transform 0.1s ease;
          }
          
          .tremor-countdown {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          
          .timer-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background-color: #f0f9ff;
            border: 4px solid #3b82f6;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          #tremor-timer {
            font-size: 40px;
            font-weight: bold;
            color: #3b82f6;
          }
          
          .timer-label {
            font-size: 14px;
            color: #4b5563;
          }
          
          .test-instruction {
            margin-top: 20px;
            font-size: 16px;
            color: #4b5563;
          }
          
          .hand-result {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 8px;
          }
          
          .hand-result h4 {
            margin-top: 0;
            color: #1e40af;
          }
          
          .tremor-meter {
            width: 100%;
            height: 20px;
            background-color: #e2e8f0;
            border-radius: 10px;
            margin: 10px 0;
            overflow: hidden;
          }
          
          .tremor-meter-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 1s ease;
          }
          
          .tremor-meter-fill.low {
            background-color: #a7f3d0;
          }
          
          .tremor-meter-fill.moderate {
            background-color: #fde68a;
          }
          
          .tremor-meter-fill.high {
            background-color: #fca5a5;
          }
        `;
        
        document.head.appendChild(styleEl);
      }
    }
    
    checkDeviceSupport() {
      const supportMessage = document.getElementById('device-support-message');
      
      if (typeof DeviceMotionEvent !== 'undefined') {
        // Device might support motion events
        
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          // iOS 13+ requires permission
          supportMessage.textContent = 'This test requires motion sensor access. Click "Start Test" to request permission.';
          supportMessage.className = 'support-message';
          
          // Enable start button
          const startButton = document.getElementById('start-tremor-test');
          startButton.disabled = false;
          
          this.state.deviceSupport = 'permission-required';
        } else {
          // Android or older iOS, assume it works
          supportMessage.textContent = 'Device motion sensors detected. You can start the test.';
          supportMessage.className = 'support-message supported';
          
          // Show test steps
          document.getElementById('test-steps').style.display = 'block';
          
          // Enable start button
          const startButton = document.getElementById('start-tremor-test');
          startButton.disabled = false;
          
          this.state.deviceSupport = true;
        }
      } else {
        // Device doesn't support motion events
        supportMessage.textContent = 'Your device does not support motion sensors required for this test. Please try on a mobile device.';
        supportMessage.className = 'support-message unsupported';
        
        this.state.deviceSupport = false;
      }
    }
    
    addEventListeners(container) {
      // Start test button
      const startButton = document.getElementById('start-tremor-test');
      startButton.addEventListener('click', () => {
        if (this.state.deviceSupport === 'permission-required') {
          // Request permission for iOS
          DeviceMotionEvent.requestPermission().then(response => {
            if (response === 'granted') {
              // Permission granted, update UI
              document.getElementById('device-support-message').textContent = 'Permission granted. You can start the test.';
              document.getElementById('device-support-message').className = 'support-message supported';
              
              // Show test steps
              document.getElementById('test-steps').style.display = 'block';
              
              this.state.deviceSupport = true;
            } else {
              // Permission denied
              document.getElementById('device-support-message').textContent = 'Motion sensor access denied. Please allow access to perform the test.';
              document.getElementById('device-support-message').className = 'support-message unsupported';
              
              this.state.deviceSupport = false;
            }
          }).catch(error => {
            console.error('Error requesting device motion permission:', error);
            document.getElementById('device-support-message').textContent = 'Error requesting sensor permission. Please try again.';
            document.getElementById('device-support-message').className = 'support-message unsupported';
          });
        } else if (this.state.deviceSupport === true) {
          // Start the test
          this.startTest();
        }
      });
    }
    
    startTest() {
      // Reset state
      this.state = {
        ...this.state,
        isRunning: true,
        currentHand: 'right',
        testStartTime: null,
        timeRemaining: this.config.testDuration,
        sensorData: {
          right: [],
          left: []
        },
        results: {
          right: null,
          left: null
        }
      };
      
      // Hide instructions, show test area
      document.getElementById('tremor-instructions').style.display = 'none';
      document.getElementById('tremor-test-area').style.display = 'block';
      
      // Update title
      document.getElementById('tremor-test-title').textContent = 'Testing Right Hand';
      
      // Start the test for the right hand
      this.startHandTest('right');
    }
    
    startHandTest(hand) {
      this.state.currentHand = hand;
      this.state.testStartTime = Date.now();
      this.state.timeRemaining = this.config.testDuration;
      
      // Update timer display
      document.getElementById('tremor-timer').textContent = this.state.timeRemaining;
      
      // Set up accelerometer listener
      this.setupAccelerometer();
      
      // Set up countdown timer
      this.state.countdownInterval = setInterval(() => {
        this.state.timeRemaining--;
        
        // Update timer display
        document.getElementById('tremor-timer').textContent = this.state.timeRemaining;
        
        // Check if time is up
        if (this.state.timeRemaining <= 0) {
          this.completeHandTest();
        }
      }, 1000);
    }
    
    setupAccelerometer() {
      // Sample interval in milliseconds (target 50Hz)
      const sampleInterval = Math.floor(1000 / this.config.sampleRate);
      
      // Set up device motion event listener
      window.addEventListener('devicemotion', this.handleMotionEvent.bind(this));
      
      // Set up regular sampling interval
      this.state.dataInterval = setInterval(() => {
        // This interval ensures we get regular samples even if device events are irregular
        if (this.state.accelerometer) {
          const { x, y, z } = this.state.accelerometer;
          
          // Store data for current hand
          this.state.sensorData[this.state.currentHand].push({
            timestamp: Date.now() - this.state.testStartTime,
            x, y, z,
            magnitude: Math.sqrt(x*x + y*y + z*z)
          });
          
          // Update visualization
          this.updateTremorVisualization(x, y);
        }
      }, sampleInterval);
    }
    
    handleMotionEvent(event) {
      if (!this.state.isRunning) return;
      
      // Store current acceleration data
      this.state.accelerometer = {
        x: event.accelerationIncludingGravity.x || 0,
        y: event.accelerationIncludingGravity.y || 0,
        z: event.accelerationIncludingGravity.z || 0
      };
    }
    
    updateTremorVisualization(x, y) {
      // Scale factors (adjust based on testing)
      const scaleX = 2;
      const scaleY = 2;
      
      // Calculate offsets based on acceleration (limit to reasonable range)
      const offsetX = Math.max(-20, Math.min(20, x * scaleX));
      const offsetY = Math.max(-20, Math.min(20, y * scaleY));
      
      // Update tremor indicator position
      const indicator = document.getElementById('tremor-indicator');
      if (indicator) {
        indicator.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
      }
    }
    
    completeHandTest() {
      // Stop data collection
      this.clearTimers();
      window.removeEventListener('devicemotion', this.handleMotionEvent.bind(this));
      
      // Analysis - calculate tremor metrics
      const handData = this.state.sensorData[this.state.currentHand];
      const tremors = this.analyzeTremors(handData);
      
      // Store results
      this.state.results[this.state.currentHand] = tremors;
      
      // Check if we need to test the other hand
      if (this.state.currentHand === 'right') {
        // Switch to left hand
        this.state.currentHand = 'left';
        
        // Update UI
        document.getElementById('tremor-test-title').textContent = 'Testing Left Hand';
        document.getElementById('tremor-timer').textContent = this.config.testDuration;
        
        // Allow a brief pause before starting left hand test
        setTimeout(() => {
          this.startHandTest('left');
        }, 2000);
        
      } else {
        // Both hands tested, show results
        this.completeTest();
      }
    }
    
    analyzeTremors(data) {
      // This is a simplified analysis - a real implementation would use
      // frequency domain analysis, but that's beyond the scope of this demo
      
      if (data.length === 0) {
        return {
          intensity: 0,
          frequency: 0,
          regularity: 0,
          tremorScore: 0,
          category: 'No Data',
          alertLevel: 'error'
        };
      }
      
      // Calculate acceleration variance (measure of tremor intensity)
      const magnitudes = data.map(d => d.magnitude);
      const avgMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;
      
      // Calculate variance
      let variance = 0;
      for (let i = 0; i < magnitudes.length; i++) {
        variance += Math.pow(magnitudes[i] - avgMagnitude, 2);
      }
      variance /= magnitudes.length;
      
      // Calculate first differences (approximate of frequency)
      const diffs = [];
      for (let i = 1; i < magnitudes.length; i++) {
        diffs.push(Math.abs(magnitudes[i] - magnitudes[i-1]));
      }
      
      // Average differences (higher = more rapid changes)
      const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
      
      // Standard deviation of differences (measure of regularity)
      let diffVariance = 0;
      for (let i = 0; i < diffs.length; i++) {
        diffVariance += Math.pow(diffs[i] - avgDiff, 2);
      }
      diffVariance /= diffs.length;
      const diffStdDev = Math.sqrt(diffVariance);
      
      // Normalize values to 0-100 scale using empirical thresholds
      // These would be calibrated with real data in a production system
      const intensityScore = Math.min(100, Math.max(0, variance * 100));
      const frequencyScore = Math.min(100, Math.max(0, avgDiff * 200));
      const regularityScore = Math.min(100, Math.max(0, 100 - (diffStdDev * 300)));
      
      // Weighted combination of factors
      const tremorScore = Math.round(
        (intensityScore * 0.5) + 
        (frequencyScore * 0.3) + 
        (regularityScore * 0.2)
      );
      
      // Determine category
      let category, alertLevel;
      
      if (tremorScore < 20) {
        category = "No Significant Tremor";
        alertLevel = "success";
      } else if (tremorScore < 40) {
        category = "Mild Tremor";
        alertLevel = "info";
      } else if (tremorScore < 70) {
        category = "Moderate Tremor";
        alertLevel = "warning";
      } else {
        category = "Significant Tremor";
        alertLevel = "danger";
      }
      
      return {
        intensity: Math.round(intensityScore),
        frequency: Math.round(frequencyScore),
        regularity: Math.round(regularityScore),
        tremorScore: tremorScore,
        category,
        alertLevel
      };
    }
    
    completeTest() {
      this.state.isRunning = false;
      
      // Hide test area, show results
      document.getElementById('tremor-test-area').style.display = 'none';
      document.getElementById('tremor-results').style.display = 'block';
      
      // Get results for both hands
      const rightResults = this.state.results.right;
      const leftResults = this.state.results.left;
      
      // Determine overall tremor score (higher of two hands)
      const overallScore = Math.max(rightResults.tremorScore, leftResults.tremorScore);
      
      // Determine category
      let overallCategory, overallDescription, overallAlertLevel;
      
      if (overallScore < 20) {
        overallCategory = "No Significant Tremor";
        overallDescription = "Your test results do not indicate a significant tremor. This is normal.";
        overallAlertLevel = "success";
      } else if (overallScore < 40) {
        overallCategory = "Mild Tremor";
        overallDescription = "Your test results indicate a mild tremor. This could be normal physiological tremor, which most people have to some degree.";
        overallAlertLevel = "info";
      } else if (overallScore < 70) {
        overallCategory = "Moderate Tremor";
        overallDescription = "Your test results indicate a moderate tremor. This may be worth mentioning to a healthcare provider at your next visit.";
        overallAlertLevel = "warning";
      } else {
        overallCategory = "Significant Tremor";
        overallDescription = "Your test results indicate a significant tremor. Consider consulting with a healthcare provider about these results.";
        overallAlertLevel = "danger";
      }
      
      // Determine if medical consultation is recommended
      const needsDoctor = overallScore >= 50;
      
      // Create and display results HTML
      const resultsHTML = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Tremor Analysis</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <div class="result-details">
              <div class="hand-result">
                <h4>Right Hand</h4>
                <div class="detail-row">
                  <span class="detail-label">Tremor Score:</span>
                  <span class="detail-value">${rightResults.tremorScore}%</span>
                </div>
                <div class="tremor-meter">
                  <div class="tremor-meter-fill ${rightResults.tremorScore < 40 ? 'low' : rightResults.tremorScore < 70 ? 'moderate' : 'high'}" 
                       style="width: ${rightResults.tremorScore}%"></div>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${rightResults.category}</span>
                </div>
              </div>
              
              <div class="hand-result">
                <h4>Left Hand</h4>
                <div class="detail-row">
                  <span class="detail-label">Tremor Score:</span>
                  <span class="detail-value">${leftResults.tremorScore}%</span>
                </div>
                <div class="tremor-meter">
                  <div class="tremor-meter-fill ${leftResults.tremorScore < 40 ? 'low' : leftResults.tremorScore < 70 ? 'moderate' : 'high'}" 
                       style="width: ${leftResults.tremorScore}%"></div>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${leftResults.category}</span>
                </div>
              </div>
              
              <div class="alert-box alert-${overallAlertLevel}">
                <strong>${overallCategory}</strong>
                <p>${overallDescription}</p>
                ${needsDoctor ? '<p><strong>Recommendation:</strong> Consider discussing these results with a healthcare provider.</p>' : ''}
              </div>
              
              <p class="disclaimer">This is not a medical diagnosis. Tremors can be caused by many factors including fatigue, caffeine, medication, or medical conditions. For concerns about tremors, please consult a healthcare professional.</p>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHTML;
      
      // Save results
      this.saveResults({
        rightHand: rightResults,
        leftHand: leftResults,
        overallScore,
        overallCategory,
        overallAlertLevel,
        needsDoctor
      });
    }
    
    saveResults(results) {
      // Format results for storage
      const resultData = {
        rightHandScore: results.rightHand.tremorScore,
        leftHandScore: results.leftHand.tremorScore,
        rightHandCategory: results.rightHand.category,
        leftHandCategory: results.leftHand.category,
        overallScore: results.overallScore,
        overallCategory: results.overallCategory,
        needsDoctor: results.needsDoctor,
        alertLevel: results.overallAlertLevel,
        summary: `Tremor analysis: ${results.overallScore}% (${results.overallCategory})`
      };
      
      // Save to storage via controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('tremor', resultData);
      }
    }
    
    clearTimers() {
      // Clear data collection interval
      if (this.state.dataInterval) {
        clearInterval(this.state.dataInterval);
        this.state.dataInterval = null;
      }
      
      // Clear countdown timer
      if (this.state.countdownInterval) {
        clearInterval(this.state.countdownInterval);
        this.state.countdownInterval = null;
      }
    }
    
    cleanup() {
      // Remove event listeners
      window.removeEventListener('devicemotion', this.handleMotionEvent.bind(this));
      
      // Clear timers
      this.clearTimers();
    }
  }
  
  export default TremorAnalyzer;