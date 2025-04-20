// modules/vitals-measurer.js - Heart rate measurement using manual counting

class VitalsMeasurer {
    constructor() {
      this.timerInterval = null;
      this.countdownTime = 60; // 60 seconds = 1 minute
      this.isRunning = false;
      this.manualHeartrate = 0;
    }
    
    initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="vitals-test-container">
          <div id="vitals-instructions" class="test-instructions">
            <h4>Heart Rate Measurement</h4>
            <p>This test will help you measure your heart rate (pulse).</p>
            <ol>
              <li>Place your hand over your heart, or find your pulse by placing two fingers on your wrist below your thumb or on your neck to the side of your windpipe.</li>
              <li>Get ready to count each heartbeat you feel during the 60-second period.</li>
              <li>When you're ready, click the "Start Counting" button.</li>
              <li>After the timer ends, enter the number of beats you counted.</li>
            </ol>
            <div class="pulse-illustration">
              <svg width="200" height="160" viewBox="0 0 200 160">
                <path d="M10,80 L40,80 L50,40 L70,120 L90,30 L110,130 L130,60 L150,80 L190,80" 
                      stroke="#DC2626" stroke-width="3" fill="none" />
              </svg>
            </div>
            <div class="button-container">
              <button id="start-vitals-test" class="primary-button">Start Counting</button>
            </div>
          </div>
          
          <div id="vitals-counter" class="test-content" style="display:none;">
            <h4>Count Your Heartbeats</h4>
            <p>Count each heartbeat you feel. The timer will run for 60 seconds.</p>
            
            <div class="timer-display">
              <div class="timer-circle">
                <div id="timer-value">60</div>
                <div class="timer-label">seconds</div>
              </div>
            </div>
            
            <div id="timer-progress" class="timer-progress">
              <div id="timer-bar" class="timer-bar"></div>
            </div>
          </div>
          
          <div id="vitals-input" class="test-content" style="display:none;">
            <h4>Enter Your Heart Rate</h4>
            <p>How many heartbeats did you count in the 60-second period?</p>
            
            <div class="input-container">
              <input type="number" id="heartbeat-count" min="30" max="220" placeholder="Enter beats counted">
              <p class="input-note">Normal adult resting heart rate is typically between 60-100 beats per minute.</p>
            </div>
            
            <div class="button-container">
              <button id="submit-heartrate" class="primary-button">Submit</button>
              <button id="restart-test" class="secondary-button">Restart Test</button>
            </div>
          </div>
          
          <div id="vitals-results" class="results-container" style="display:none;">
            <h3>Heart Rate Results</h3>
            <div id="results-content"></div>
          </div>
        </div>
      `;
      
      // Add event listeners
      this.addEventListeners(container);
    }
    
    addEventListeners(container) {
      // Start button
      container.querySelector('#start-vitals-test').addEventListener('click', () => {
        this.startCountdown();
      });
      
      // Submit button
      container.querySelector('#submit-heartrate').addEventListener('click', () => {
        this.submitHeartRate();
      });
      
      // Restart button
      container.querySelector('#restart-test').addEventListener('click', () => {
        this.resetTest();
      });
    }
    
    startCountdown() {
      // Show counter, hide instructions
      document.getElementById('vitals-instructions').style.display = 'none';
      document.getElementById('vitals-counter').style.display = 'block';
      
      this.isRunning = true;
      this.countdownTime = 60;
      
      // Update UI
      document.getElementById('timer-value').textContent = this.countdownTime;
      document.getElementById('timer-bar').style.width = '100%';
      
      // Start the countdown
      this.timerInterval = setInterval(() => {
        this.countdownTime--;
        
        // Update timer display
        document.getElementById('timer-value').textContent = this.countdownTime;
        
        // Update progress bar
        const progressPercent = (this.countdownTime / 60) * 100;
        document.getElementById('timer-bar').style.width = `${progressPercent}%`;
        
        // Check if countdown is complete
        if (this.countdownTime <= 0) {
          this.stopCountdown();
          this.showInputForm();
        }
      }, 1000);
    }
    
    stopCountdown() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.isRunning = false;
    }
    
    showInputForm() {
      // Hide counter, show input form
      document.getElementById('vitals-counter').style.display = 'none';
      document.getElementById('vitals-input').style.display = 'block';
      
      // Focus on input field
      document.getElementById('heartbeat-count').focus();
    }
    
    submitHeartRate() {
      // Get entered heart rate
      const heartbeatInput = document.getElementById('heartbeat-count');
      const heartbeatCount = parseInt(heartbeatInput.value);
      
      // Validate input
      if (isNaN(heartbeatCount) || heartbeatCount < 30 || heartbeatCount > 220) {
        alert('Please enter a valid number between 30 and 220.');
        return;
      }
      
      // Store the heart rate
      this.manualHeartrate = heartbeatCount;
      
      // Show results
      this.showResults();
    }
    
    showResults() {
      // Hide input form, show results
      document.getElementById('vitals-input').style.display = 'none';
      document.getElementById('vitals-results').style.display = 'block';
      
      // Determine heart rate category
      let category, description, alertLevel;
      
      if (this.manualHeartrate < 60) {
        category = "Bradycardia (Low Heart Rate)";
        description = "Your heart rate is below the typical resting range. This might be normal for athletes, but could indicate an issue for others.";
        alertLevel = "warning";
      } else if (this.manualHeartrate <= 100) {
        category = "Normal Heart Rate";
        description = "Your heart rate is within the normal resting range for adults.";
        alertLevel = "success";
      } else {
        category = "Tachycardia (Elevated Heart Rate)";
        description = "Your heart rate is above the typical resting range. This could be due to activity, stress, medication, or other factors.";
        alertLevel = "warning";
      }
      
      // Create recommendations based on results
      let recommendations = [];
      
      if (this.manualHeartrate < 50 || this.manualHeartrate > 120) {
        recommendations.push("Consider consulting with a healthcare provider if this is your typical resting heart rate.");
      }
      
      if (this.manualHeartrate > 100) {
        recommendations.push("Try to relax and measure again when you've been at rest for at least 10 minutes.");
      }
      
      if (this.manualHeartrate < 60) {
        recommendations.push("If you're not an athlete and regularly have a low heart rate, mention this to your doctor at your next check-up.");
      }
      
      // Format recommendations
      const recommendationsHtml = recommendations.length > 0 ? 
        `<ul>${recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>` : 
        '';
      
      // Create results HTML
      const resultsHtml = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Heart Rate Measurement</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <div class="result-details">
              <div class="detail-row">
                <span class="detail-label">Heart Rate:</span>
                <span class="detail-value">${this.manualHeartrate} BPM</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${category}</span>
              </div>
              <div class="alert-box alert-${alertLevel}">
                <strong>${category}</strong>
                <p>${description}</p>
                ${recommendationsHtml}
              </div>
              <p class="disclaimer">This is not a medical diagnosis. For concerns about your heart rate, please consult a healthcare professional.</p>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHtml;
      
      // Save results
      this.saveResults(category, alertLevel);
    }
    
    saveResults(category, alertLevel) {
      // Create result object
      const result = {
        heartRate: this.manualHeartrate,
        category: category,
        alertLevel: alertLevel,
        timestamp: new Date().toISOString(),
        summary: `Heart rate: ${this.manualHeartrate} BPM (${category})`
      };
      
      // Save to storage via controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('vitals', result);
      }
    }
    
    resetTest() {
      // Stop any running timer
      this.stopCountdown();
      
      // Reset UI
      document.getElementById('vitals-input').style.display = 'none';
      document.getElementById('vitals-results').style.display = 'none';
      document.getElementById('vitals-instructions').style.display = 'block';
      
      // Clear input
      const heartbeatInput = document.getElementById('heartbeat-count');
      if (heartbeatInput) {
        heartbeatInput.value = '';
      }
    }
    
    cleanup() {
      // Stop any running timer
      this.stopCountdown();
    }
  }
  
  export default VitalsMeasurer;