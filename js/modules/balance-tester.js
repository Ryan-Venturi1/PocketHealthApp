// modules/balance-tester.js - Balance testing using device orientation and motion

class BalanceTester {
    constructor() {
      // Test configuration
      this.config = {
        testDuration: 30, // Test duration in seconds
        poseTime: 10,     // Time for each pose in seconds
        poses: [
          { name: 'Standing', description: 'Stand naturally with feet shoulder-width apart' },
          { name: 'One Leg', description: 'Stand on your dominant leg with other foot lifted' },
          { name: 'Eyes Closed', description: 'Stand naturally with eyes closed' }
        ]
      };
      
      // Test state
      this.state = {
        isRunning: false,
        currentPose: 0,
        poseStartTime: null,
        poseTimeRemaining: 0,
        testStartTime: null,
        sensorData: {
          poses: [[], [], []] // Array for each pose
        },
        results: {
          poses: [null, null, null],
          overall: null
        },
        accelerometer: null,
        gyroscope: null,
        dataInterval: null,
        countdownInterval: null,
        deviceSupport: null, // null = unknown, true = supported, false = not supported
      };
    }
    
    initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="balance-test-container">
          <div id="balance-instructions" class="test-instructions">
            <h4>Balance Test</h4>
            <p>This test will measure your balance and stability using your device's motion sensors.</p>
            
            <div id="balance-device-support" class="support-message">
              Checking device compatibility...
            </div>
            
            <ol id="balance-steps" style="display:none;">
              <li>Place your phone in your pocket or hold against your chest</li>
              <li>You will be guided through three different poses</li>
              <li>Each pose will last ${this.config.poseTime} seconds</li>
              <li>Try to maintain each position as steadily as possible</li>
            </ol>
            
            <div class="pose-illustration">
              <svg width="200" height="160" viewBox="0 0 200 160">
                <ellipse cx="100" cy="140" rx="50" ry="10" fill="#e2e8f0" />
                <line x1="100" y1="140" x2="100" y2="50" stroke="#1e40af" stroke-width="4" />
                <circle cx="100" cy="35" r="15" fill="#3b82f6" />
                <line x1="100" y1="50" x2="75" y2="80" stroke="#1e40af" stroke-width="4" />
                <line x1="100" y1="50" x2="125" y2="80" stroke="#1e40af" stroke-width="4" />
                <line x1="100" y1="100" x2="75" y2="130" stroke="#1e40af" stroke-width="4" />
                <line x1="100" y1="100" x2="125" y2="130" stroke="#1e40af" stroke-width="4" />
              </svg>
            </div>
            
            <div class="button-container">
              <button id="start-balance-test" class="primary-button" disabled>Start Test</button>
            </div>
          </div>
          
          <div id="balance-test-area" class="test-area" style="display:none;">
            <h4 id="pose-title">Standing Position</h4>
            <p id="pose-description">Stand naturally with feet shoulder-width apart</p>
            
            <div class="pose-visualization">
              <div class="pose-icon" id="pose-icon">
                <!-- Icons will be set dynamically -->
              </div>
            </div>
            
            <div class="balance-countdown">
              <div class="timer-circle">
                <div id="balance-timer">10</div>
                <div class="timer-label">seconds</div>
              </div>
            </div>
            
            <div class="stability-indicator">
              <div class="bubble-container">
                <div id="stability-bubble" class="bubble"></div>
              </div>
              <div class="stability-label">Stability Indicator</div>
            </div>
          </div>
          
          <div id="balance-results" class="results-container" style="display:none;">
            <h3>Balance Test Results</h3>
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
      if (!document.getElementById('balance-tester-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'balance-tester-styles';
        
        styleEl.textContent = `
          .balance-test-container {
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
          
          .pose-illustration {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          
          .test-area {
            text-align: center;
            padding: 20px;
          }
          
          .pose-visualization {
            margin: 20px 0;
            display: flex;
            justify-content: center;
          }
          
          .pose-icon {
            width: 150px;
            height: 150px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .stability-indicator {
            margin: 20px auto;
            width: 200px;
          }
          
          .bubble-container {
            width: 100%;
            height: 100px;
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            position: relative;
            background-color: #f8fafc;
          }
          
          .bubble {
            position: absolute;
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.1s ease;
          }
          
          .stability-label {
            margin-top: 8px;
            font-size: 14px;
            color: #64748b;
          }
          
          .balance-countdown {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          
          .timer-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background-color: #f0f9ff;
            border: 4px solid #3b82f6;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          #balance-timer {
            font-size: 32px;
            font-weight: bold;
            color: #3b82f6;
          }
          
          .timer-label {
            font-size: 14px;
            color: #4b5563;
          }
          
          .pose-result {
            margin-bottom: 15px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 8px;
          }
          
          .pose-result h4 {
            margin-top: 0;
            color: #1e40af;
          }
          
          .balance-score-meter {
            width: 100%;
            height: 20px;
            background-color: #e2e8f0;
            border-radius: 10px;
            margin: 10px 0;
            overflow: hidden;
          }
          
          .balance-score-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 1s ease;
          }
          
          .balance-score-fill.excellent {
            background-color: #10b981;
          }
          
          .balance-score-fill.good {
            background-color: #a7f3d0;
          }
          
          .balance-score-fill.fair {
            background-color: #fde68a;
          }
          
          .balance-score-fill.poor {
            background-color: #fca5a5;
          }
        `;
        
        document.head.appendChild(styleEl);
      }
    }
    
    checkDeviceSupport() {
      const supportMessage = document.getElementById('balance-device-support');
      
      if (typeof DeviceMotionEvent !== 'undefined' || typeof DeviceOrientationEvent !== 'undefined') {
        // Device might support motion/orientation events
        
        if (typeof DeviceMotionEvent?.requestPermission === 'function' || 
            typeof DeviceOrientationEvent?.requestPermission === 'function') {
          // iOS 13+ requires permission
          supportMessage.textContent = 'This test requires motion sensor access. Click "Start Test" to request permission.';
          supportMessage.className = 'support-message';
          
          // Enable start button
          const startButton = document.getElementById('start-balance-test');
          startButton.disabled = false;
          
          this.state.deviceSupport = 'permission-required';
        } else {
          // Android or older iOS, assume it works
          supportMessage.textContent = 'Device motion sensors detected. You can start the test.';
          supportMessage.className = 'support-message supported';
          
          // Show test steps
          document.getElementById('balance-steps').style.display = 'block';
          
          // Enable start button
          const startButton = document.getElementById('start-balance-test');
          startButton.disabled = false;
          
          this.state.deviceSupport = true;
        }
      } else {
        // Device doesn't support required events
        supportMessage.textContent = 'Your device does not support motion sensors required for this test. Please try on a mobile device.';
        supportMessage.className = 'support-message unsupported';
        
        this.state.deviceSupport = false;
      }
    }
    
    addEventListeners(container) {
      // Start test button
      const startButton = document.getElementById('start-balance-test');
      startButton.addEventListener('click', () => {
        if (this.state.deviceSupport === 'permission-required') {
          // Request permission for iOS
          const requestMotion = DeviceMotionEvent?.requestPermission?.bind(DeviceMotionEvent);
          const requestOrientation = DeviceOrientationEvent?.requestPermission?.bind(DeviceOrientationEvent);
          
          // Request permissions
          Promise.all([
            requestMotion ? requestMotion() : Promise.resolve('granted'),
            requestOrientation ? requestOrientation() : Promise.resolve('granted')
          ]).then(([motionPermission, orientationPermission]) => {
            if (motionPermission === 'granted' && orientationPermission === 'granted') {
              // Permission granted, update UI
              document.getElementById('balance-device-support').textContent = 'Permissions granted. You can start the test.';
              document.getElementById('balance-device-support').className = 'support-message supported';
              
              // Show test steps
              document.getElementById('balance-steps').style.display = 'block';
              
              this.state.deviceSupport = true;
            } else {
              // Permission denied
              document.getElementById('balance-device-support').textContent = 'Sensor access denied. Please allow access to perform the test.';
              document.getElementById('balance-device-support').className = 'support-message unsupported';
              
              this.state.deviceSupport = false;
            }
          }).catch(error => {
            console.error('Error requesting sensor permissions:', error);
            document.getElementById('balance-device-support').textContent = 'Error requesting sensor permissions. Please try again.';
            document.getElementById('balance-device-support').className = 'support-message unsupported';
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
        currentPose: 0,
        poseStartTime: null,
        poseTimeRemaining: this.config.poseTime,
        testStartTime: Date.now(),
        sensorData: {
          poses: [[], [], []]
        },
        results: {
          poses: [null, null, null],
          overall: null
        }
      };
      
      // Hide instructions, show test area
      document.getElementById('balance-instructions').style.display = 'none';
      document.getElementById('balance-test-area').style.display = 'block';
      
      // Start the first pose
      this.startPose(0);
    }
    
    startPose(poseIndex) {
      this.state.currentPose = poseIndex;
      this.state.poseStartTime = Date.now();
      this.state.poseTimeRemaining = this.config.poseTime;
      
      // Update UI for current pose
      const pose = this.config.poses[poseIndex];
      document.getElementById('pose-title').textContent = pose.name + ' Position';
      document.getElementById('pose-description').textContent = pose.description;
      
      // Update timer display
      document.getElementById('balance-timer').textContent = this.state.poseTimeRemaining;
      
      // Set pose icon
      this.setPoseIcon(poseIndex);
      
      // Set up sensor listeners
      this.setupSensors();
      
      // Set up countdown timer
      this.state.countdownInterval = setInterval(() => {
        this.state.poseTimeRemaining--;
        
        // Update timer display
        document.getElementById('balance-timer').textContent = this.state.poseTimeRemaining;
        
        // Check if time is up for current pose
        if (this.state.poseTimeRemaining <= 0) {
          this.completePose();
        }
      }, 1000);
    }
    
    setPoseIcon(poseIndex) {
      const poseIcon = document.getElementById('pose-icon');
      
      // Set icon based on pose
      switch(poseIndex) {
        case 0: // Standing
          poseIcon.innerHTML = `
            <svg width="100" height="130" viewBox="0 0 100 130">
              <line x1="50" y1="120" x2="50" y2="40" stroke="#1e40af" stroke-width="4" />
              <circle cx="50" cy="25" r="15" fill="#3b82f6" />
              <line x1="50" y1="40" x2="25" y2="70" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="40" x2="75" y2="70" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="90" x2="35" y2="120" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="90" x2="65" y2="120" stroke="#1e40af" stroke-width="4" />
            </svg>
          `;
          break;
        case 1: // One Leg
          poseIcon.innerHTML = `
            <svg width="100" height="130" viewBox="0 0 100 130">
              <line x1="50" y1="120" x2="50" y2="40" stroke="#1e40af" stroke-width="4" />
              <circle cx="50" cy="25" r="15" fill="#3b82f6" />
              <line x1="50" y1="40" x2="25" y2="70" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="40" x2="75" y2="70" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="90" x2="40" y2="120" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="90" x2="60" y2="70" stroke="#1e40af" stroke-width="4" />
            </svg>
          `;
          break;
        case 2: // Eyes Closed
          poseIcon.innerHTML = `
            <svg width="100" height="130" viewBox="0 0 100 130">
              <line x1="50" y1="120" x2="50" y2="40" stroke="#1e40af" stroke-width="4" />
              <circle cx="50" cy="25" r="15" fill="#3b82f6" />
              <line x1="40" y1="20" x2="45" y2="20" stroke="#ffffff" stroke-width="2" />
              <line x1="55" y1="20" x2="60" y2="20" stroke="#ffffff" stroke-width="2" />
              <line x1="50" y1="40" x2="25" y2="70" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="40" x2="75" y2="70" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="90" x2="35" y2="120" stroke="#1e40af" stroke-width="4" />
              <line x1="50" y1="90" x2="65" y2="120" stroke="#1e40af" stroke-width="4" />
            </svg>
          `;
          break;
      }
    }
    
    setupSensors() {
      // Sample interval (aim for 20Hz)
      const sampleInterval = 50; // milliseconds
      
      // Set up device motion event listener
      window.addEventListener('devicemotion', this.handleMotionEvent.bind(this));
      window.addEventListener('deviceorientation', this.handleOrientationEvent.bind(this));
      
      // Set up regular sampling interval
      this.state.dataInterval = setInterval(() => {
        if (this.state.accelerometer || this.state.gyroscope) {
          // Store data for current pose
          const poseData = {
            timestamp: Date.now() - this.state.poseStartTime,
            accelerometer: this.state.accelerometer ? { ...this.state.accelerometer } : null,
            gyroscope: this.state.gyroscope ? { ...this.state.gyroscope } : null
          };
          
          this.state.sensorData.poses[this.state.currentPose].push(poseData);
          
          // Update visualization
          this.updateStabilityIndicator(poseData);
        }
      }, sampleInterval);
    }
    
    handleMotionEvent(event) {
      if (!this.state.isRunning) return;
      
      // Store acceleration data
      if (event.accelerationIncludingGravity) {
        this.state.accelerometer = {
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0
        };
      }
    }
    
    handleOrientationEvent(event) {
      if (!this.state.isRunning) return;
      
      // Store orientation data
      this.state.gyroscope = {
        alpha: event.alpha || 0, // Z-axis rotation [0, 360)
        beta: event.beta || 0,   // X-axis rotation [-180, 180]
        gamma: event.gamma || 0  // Y-axis rotation [-90, 90]
      };
    }
    
    updateStabilityIndicator(data) {
      // Compute stability based on sensor data
      let offsetX = 0;
      let offsetY = 0;
      
      if (data.gyroscope) {
        // Scale factors for visualization
        const scaleX = 1.5;
        const scaleY = 1.5;
        
        // Use gyroscope data (gamma affects left-right, beta affects front-back)
        offsetX = Math.max(-40, Math.min(40, data.gyroscope.gamma * scaleX));
        offsetY = Math.max(-40, Math.min(40, data.gyroscope.beta * scaleY));
      } else if (data.accelerometer) {
        // Fallback to accelerometer if gyroscope not available
        const scaleX = 5;
        const scaleY = 5;
        
        offsetX = Math.max(-40, Math.min(40, data.accelerometer.x * scaleX));
        offsetY = Math.max(-40, Math.min(40, data.accelerometer.y * scaleY));
      }
      
      // Update bubble position
      const bubble = document.getElementById('stability-bubble');
      if (bubble) {
        bubble.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        
        // Visualize wobble amount
        const wobbleAmount = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const maxRadius = 40;
        const minSize = 20;
        const maxSize = 40;
        
        // Size bubble based on wobble (more wobble = bigger bubble)
        const bubbleSize = minSize + ((wobbleAmount / maxRadius) * (maxSize - minSize));
        bubble.style.width = `${bubbleSize}px`;
        bubble.style.height = `${bubbleSize}px`;
        
        // Color bubble based on wobble (green to red)
        const stabilityRatio = Math.min(1, wobbleAmount / maxRadius);
        const red = Math.round(59 + (stabilityRatio * 200));
        const green = Math.round(160 - (stabilityRatio * 80));
        const blue = Math.round(253 - (stabilityRatio * 200));
        
        bubble.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
      }
    }
    
    completePose() {
      // Clear timers and event listeners
      this.clearTimers();
      window.removeEventListener('devicemotion', this.handleMotionEvent.bind(this));
      window.removeEventListener('deviceorientation', this.handleOrientationEvent.bind(this));
      
      // Analyze results for current pose
      const poseData = this.state.sensorData.poses[this.state.currentPose];
      const poseResult = this.analyzePoseBalance(poseData);
      
      // Store results
      this.state.results.poses[this.state.currentPose] = poseResult;
      
      // Check if we need to move to the next pose
      if (this.state.currentPose < this.config.poses.length - 1) {
        // Move to next pose
        const nextPose = this.state.currentPose + 1;
        
        // Show transition message
        document.getElementById('pose-title').textContent = 'Prepare for Next Pose';
        document.getElementById('pose-description').textContent = this.config.poses[nextPose].description;
        
        // Pause briefly before starting next pose
        setTimeout(() => {
          this.startPose(nextPose);
        }, 3000);
        
      } else {
        // All poses tested, analyze overall results
        this.completeTest();
      }
    }
    
    analyzePoseBalance(data) {
      if (data.length === 0) {
        return {
          stabilityScore: 0,
          wobbleIntensity: 0,
          balanceScore: 0,
          category: 'No Data',
          alertLevel: 'error'
        };
      }
      
      // Calculate stability metrics
      let totalGyroInstability = 0;
      let totalAccelInstability = 0;
      let samples = 0;
      
      for (const sample of data) {
        if (sample.gyroscope) {
          // Calculate instability from gyroscope
          const betaInstability = Math.abs(sample.gyroscope.beta);
          const gammaInstability = Math.abs(sample.gyroscope.gamma);
          
          totalGyroInstability += Math.sqrt(betaInstability * betaInstability + gammaInstability * gammaInstability);
          samples++;
        }
        
        if (sample.accelerometer) {
          // Calculate instability from accelerometer
          const xInstability = Math.abs(sample.accelerometer.x);
          const yInstability = Math.abs(sample.accelerometer.y);
          
          totalAccelInstability += Math.sqrt(xInstability * xInstability + yInstability * yInstability);
        }
      }
      
      // Average instability
      const avgGyroInstability = samples > 0 ? totalGyroInstability / samples : 0;
      const avgAccelInstability = data.length > 0 ? totalAccelInstability / data.length : 0;
      
      // Calculate stability score (0-100, higher is better)
      // Scale factors would be calibrated in a real application
      const gyroStabilityScore = Math.max(0, 100 - (avgGyroInstability * 5));
      const accelStabilityScore = Math.max(0, 100 - (avgAccelInstability * 10));
      
      // Combine scores - prefer gyroscope if available
      const stabilityScore = samples > 0 ? gyroStabilityScore : accelStabilityScore;
      
      // Calculate wobble intensity as the inverse of stability
      const wobbleIntensity = 100 - stabilityScore;
      
      // Balance score is directly related to stability
      const balanceScore = Math.round(stabilityScore);
      
      // Determine category
      let category, alertLevel;
      
      if (balanceScore >= 80) {
        category = "Excellent Balance";
        alertLevel = "success";
      } else if (balanceScore >= 60) {
        category = "Good Balance";
        alertLevel = "success";
      } else if (balanceScore >= 40) {
        category = "Fair Balance";
        alertLevel = "warning";
      } else {
        category = "Poor Balance";
        alertLevel = "danger";
      }
      
      return {
        stabilityScore: Math.round(stabilityScore),
        wobbleIntensity: Math.round(wobbleIntensity),
        balanceScore,
        category,
        alertLevel
      };
    }
    
    completeTest() {
      this.state.isRunning = false;
      
      // Hide test area, show results
      document.getElementById('balance-test-area').style.display = 'none';
      document.getElementById('balance-results').style.display = 'block';
      
      // Calculate overall balance score (weighted average of individual poses)
      // Different poses have different difficulty levels
      const weights = [0.2, 0.4, 0.4]; // Standing, One Leg, Eyes Closed
      let weightedSum = 0;
      let totalWeight = 0;
      
      for (let i = 0; i < this.state.results.poses.length; i++) {
        if (this.state.results.poses[i]) {
          weightedSum += this.state.results.poses[i].balanceScore * weights[i];
          totalWeight += weights[i];
        }
      }
      
      const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      
      // Determine overall category
      let overallCategory, overallDescription, overallAlertLevel;
      
      if (overallScore >= 80) {
        overallCategory = "Excellent Balance";
        overallDescription = "Your balance is excellent across different poses. This indicates good neurological function and core stability.";
        overallAlertLevel = "success";
      } else if (overallScore >= 60) {
        overallCategory = "Good Balance";
        overallDescription = "Your balance is good. Regular balance exercises can help maintain or improve this level.";
        overallAlertLevel = "success";
      } else if (overallScore >= 40) {
        overallCategory = "Fair Balance";
        overallDescription = "Your balance is fair. Consider incorporating balance exercises into your routine.";
        overallAlertLevel = "warning";
      } else {
        overallCategory = "Poor Balance";
        overallDescription = "Your balance test results are below average. Consider discussing this with a healthcare provider and incorporating balance exercises.";
        overallAlertLevel = "danger";
      }
      
      // Determine if medical consultation is recommended
      const needsDoctor = overallScore < 40;
      
      // Create results HTML
      const resultsHTML = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Balance Assessment</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <div class="result-details">
              ${this.state.results.poses.map((result, index) => `
                <div class="pose-result">
                  <h4>${this.config.poses[index].name} Position</h4>
                  <div class="detail-row">
                    <span class="detail-label">Balance Score:</span>
                    <span class="detail-value">${result ? result.balanceScore : 'N/A'}%</span>
                  </div>
                  ${result ? `
                  <div class="balance-score-meter">
                    <div class="balance-score-fill ${
                      result.balanceScore >= 80 ? 'excellent' : 
                      result.balanceScore >= 60 ? 'good' : 
                      result.balanceScore >= 40 ? 'fair' : 'poor'
                    }" style="width: ${result.balanceScore}%"></div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${result.category}</span>
                  </div>
                  ` : '<p>No data collected for this pose.</p>'}
                </div>
              `).join('')}
              
              <div class="pose-result">
                <h4>Overall Balance</h4>
                <div class="detail-row">
                  <span class="detail-label">Overall Score:</span>
                  <span class="detail-value">${overallScore}%</span>
                </div>
                <div class="balance-score-meter">
                  <div class="balance-score-fill ${
                    overallScore >= 80 ? 'excellent' : 
                    overallScore >= 60 ? 'good' : 
                    overallScore >= 40 ? 'fair' : 'poor'
                  }" style="width: ${overallScore}%"></div>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${overallCategory}</span>
                </div>
              </div>
              
              <div class="alert-box alert-${overallAlertLevel}">
                <strong>${overallCategory}</strong>
                <p>${overallDescription}</p>
                ${needsDoctor ? '<p><strong>Recommendation:</strong> Consider discussing these results with a healthcare provider.</p>' : ''}
              </div>
              
              <p class="disclaimer">This is not a medical diagnosis. For concerns about balance or stability, please consult a healthcare professional.</p>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHTML;
      
      // Save results
      this.saveResults({
        poses: this.state.results.poses,
        overallScore,
        overallCategory,
        overallAlertLevel,
        needsDoctor
      });
    }
    
    saveResults(results) {
      // Format results for storage
      const resultData = {
        standingScore: results.poses[0]?.balanceScore || 0,
        oneLogScore: results.poses[1]?.balanceScore || 0,
        eyesClosedScore: results.poses[2]?.balanceScore || 0,
        balanceScore: results.overallScore,
        category: results.overallCategory,
        needsDoctor: results.needsDoctor,
        alertLevel: results.overallAlertLevel,
        summary: `Balance test: ${results.overallScore}% (${results.overallCategory})`
      };
      
      // Save to storage via controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('balance', resultData);
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
      window.removeEventListener('deviceorientation', this.handleOrientationEvent.bind(this));
      
      // Clear timers
      this.clearTimers();
    }
  }
  
  export default BalanceTester;