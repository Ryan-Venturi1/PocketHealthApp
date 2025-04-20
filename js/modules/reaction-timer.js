// modules/reaction-timer.js - Reaction time measurement

class ReactionTimer {
    constructor() {
      // Test state
      this.state = {
        isRunning: false,
        waitingForReaction: false,
        startTime: null,
        reactionTimes: [],
        falseStarts: 0,
        completed: false,
        testRound: 0,
        maxRounds: 5,
        waitTimeMin: 2000,   // Min time before stimulus (2 seconds)
        waitTimeMax: 5000    // Max time before stimulus (5 seconds)
      };
      
      // Timer variables
      this.waitTimer = null;
      this.timeoutTimer = null;
    }
    
    initTest(container) {
      // Create UI
      container.innerHTML = `
        <div class="reaction-test-container">
          <div id="reaction-instructions" class="test-instructions">
            <h4>Reaction Time Test</h4>
            <p>This test will measure your reaction speed. When the screen turns green, tap/click as quickly as possible.</p>
            <ul>
              <li>The test consists of ${this.state.maxRounds} rounds</li>
              <li>Wait for the screen to change color before clicking</li>
              <li>Clicking too early counts as a false start</li>
              <li>Try to be as quick as possible without making mistakes</li>
            </ul>
            
            <div class="button-container">
              <button id="start-reaction-test" class="primary-button">Start Test</button>
            </div>
          </div>
          
          <div id="reaction-test-area" class="reaction-test-area" style="display:none;">
            <div id="reaction-target" class="reaction-target">
              <div id="reaction-message">Wait...</div>
            </div>
            <div id="reaction-status" class="reaction-status">
              <div class="round-indicator">
                <span>Round: </span>
                <span id="current-round">1</span>/<span id="total-rounds">${this.state.maxRounds}</span>
              </div>
            </div>
          </div>
          
          <div id="reaction-results" class="results-container" style="display:none;">
            <h3>Reaction Time Results</h3>
            <div id="results-content"></div>
          </div>
        </div>
      `;
      
      // Add CSS to head
      this.addStyles();
      
      // Add event listeners
      this.addEventListeners(container);
    }
    
    addStyles() {
      // Add CSS if not already present
      if (!document.getElementById('reaction-timer-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'reaction-timer-styles';
        
        styleEl.textContent = `
          .reaction-test-container {
            max-width: 800px;
            margin: 0 auto;
          }
          
          .reaction-test-area {
            text-align: center;
            padding: 20px;
          }
          
          .reaction-target {
            width: 100%;
            height: 300px;
            border-radius: 12px;
            background-color: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.1s ease;
            margin-bottom: 20px;
          }
          
          .reaction-target.ready {
            background-color: #fecaca;
          }
          
          .reaction-target.go {
            background-color: #a7f3d0;
          }
          
          .reaction-target.false-start {
            background-color: #ff9999;
          }
          
          #reaction-message {
            font-size: 24px;
            font-weight: bold;
            color: #334155;
          }
          
          .reaction-status {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          
          .round-indicator {
            font-size: 18px;
            font-weight: 500;
            color: #334155;
          }
          
          .reaction-results-item {
            margin-bottom: 8px;
            padding: 10px;
            background-color: #f8fafc;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
          }
          
          .reaction-results-item.best {
            background-color: #dcfce7;
            font-weight: bold;
          }
          
          .reaction-chart {
            width: 100%;
            height: 200px;
            margin: 20px 0;
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
          }
        `;
        
        document.head.appendChild(styleEl);
      }
    }
    
    addEventListeners(container) {
      // Start test button
      container.querySelector('#start-reaction-test').addEventListener('click', () => {
        this.startTest();
      });
      
      // Reaction target (the clickable area)
      container.querySelector('#reaction-target').addEventListener('click', () => {
        this.handleReactionClick();
      });
    }
    
    startTest() {
      // Reset state
      this.state = {
        ...this.state,
        isRunning: true,
        waitingForReaction: false,
        startTime: null,
        reactionTimes: [],
        falseStarts: 0,
        completed: false,
        testRound: 1
      };
      
      // Hide instructions, show test area
      document.getElementById('reaction-instructions').style.display = 'none';
      document.getElementById('reaction-test-area').style.display = 'block';
      
      // Update round indicator
      document.getElementById('current-round').textContent = this.state.testRound;
      
      // Start the first round
      this.startRound();
    }
    
    startRound() {
      // Clear any existing timers
      this.clearTimers();
      
      // Set up waiting state
      const reactionTarget = document.getElementById('reaction-target');
      const reactionMessage = document.getElementById('reaction-message');
      
      reactionTarget.className = 'reaction-target ready';
      reactionMessage.textContent = 'Wait...';
      
      // Random wait time between min and max
      const waitTime = Math.floor(Math.random() * 
        (this.state.waitTimeMax - this.state.waitTimeMin)) + this.state.waitTimeMin;
      
      // Set waiting state
      this.state.waitingForReaction = false;
      
      // Set timer to show stimulus after random wait
      this.waitTimer = setTimeout(() => {
        // Show stimulus
        reactionTarget.className = 'reaction-target go';
        reactionMessage.textContent = 'CLICK NOW!';
        
        // Record start time
        this.state.startTime = performance.now();
        this.state.waitingForReaction = true;
        
        // Timeout if user doesn't click within 2 seconds
        this.timeoutTimer = setTimeout(() => {
          this.handleTimeout();
        }, 2000);
        
      }, waitTime);
    }
    
    handleReactionClick() {
      // Don't do anything if the test is not running
      if (!this.state.isRunning) return;
      
      // Clear timers
      this.clearTimers();
      
      const reactionTarget = document.getElementById('reaction-target');
      const reactionMessage = document.getElementById('reaction-message');
      
      if (this.state.waitingForReaction) {
        // Valid click after stimulus - calculate reaction time
        const endTime = performance.now();
        const reactionTime = endTime - this.state.startTime;
        
        // Store reaction time
        this.state.reactionTimes.push(reactionTime);
        
        // Show result
        reactionMessage.textContent = `${reactionTime.toFixed(1)} ms`;
        
        // Check if test is complete
        if (this.state.testRound >= this.state.maxRounds) {
          this.completeTest();
        } else {
          // Increment round and continue
          this.state.testRound++;
          document.getElementById('current-round').textContent = this.state.testRound;
          
          // Start next round after 1.5 seconds
          setTimeout(() => {
            this.startRound();
          }, 1500);
        }
        
      } else {
        // False start - clicked too early
        this.state.falseStarts++;
        
        reactionTarget.className = 'reaction-target false-start';
        reactionMessage.textContent = 'Too early! Wait for green.';
        
        // Start same round again after 1.5 seconds
        setTimeout(() => {
          this.startRound();
        }, 1500);
      }
    }
    
    handleTimeout() {
      // User didn't click within time window
      const reactionTarget = document.getElementById('reaction-target');
      const reactionMessage = document.getElementById('reaction-message');
      
      reactionTarget.className = 'reaction-target';
      reactionMessage.textContent = 'Too slow! Try again.';
      
      // Start same round again after 1.5 seconds
      setTimeout(() => {
        this.startRound();
      }, 1500);
    }
    
    clearTimers() {
      if (this.waitTimer) {
        clearTimeout(this.waitTimer);
        this.waitTimer = null;
      }
      
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
    }
    
    completeTest() {
      this.state.isRunning = false;
      this.state.completed = true;
      
      // Hide test area, show results
      document.getElementById('reaction-test-area').style.display = 'none';
      document.getElementById('reaction-results').style.display = 'block';
      
      // Calculate statistics
      const reactionTimes = [...this.state.reactionTimes]; // Create a copy
      reactionTimes.sort((a, b) => a - b); // Sort numerically
      
      const bestTime = reactionTimes[0];
      const worstTime = reactionTimes[reactionTimes.length - 1];
      
      const sum = reactionTimes.reduce((acc, val) => acc + val, 0);
      const avgTime = sum / reactionTimes.length;
      
      // Calculate median (middle value)
      let median;
      const middle = Math.floor(reactionTimes.length / 2);
      if (reactionTimes.length % 2 === 0) {
        median = (reactionTimes[middle - 1] + reactionTimes[middle]) / 2;
      } else {
        median = reactionTimes[middle];
      }
      
      // Determine performance category
      let category, description, alertLevel;
      
      if (bestTime < 200) {
        category = "Excellent";
        description = "Your reaction time is better than average. This indicates excellent neurological function.";
        alertLevel = "success";
      } else if (bestTime < 250) {
        category = "Good";
        description = "Your reaction time is within the normal range and indicates good neurological function.";
        alertLevel = "success";
      } else if (bestTime < 300) {
        category = "Average";
        description = "Your reaction time is average. Regular exercise and practice may help improve it.";
        alertLevel = "info";
      } else {
        category = "Below Average";
        description = "Your reaction time is slower than average. This could be due to fatigue, distractions, or other factors.";
        alertLevel = "warning";
      }
      
      // Format results for display
      const resultsHTML = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Reaction Time Assessment</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <div class="result-details">
              <div class="detail-row">
                <span class="detail-label">Best Time:</span>
                <span class="detail-value">${bestTime.toFixed(1)} ms</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Average Time:</span>
                <span class="detail-value">${avgTime.toFixed(1)} ms</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Median Time:</span>
                <span class="detail-value">${median.toFixed(1)} ms</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">False Starts:</span>
                <span class="detail-value">${this.state.falseStarts}</span>
              </div>
              
              <h5>Individual Results:</h5>
              <div class="reaction-results-list">
                ${reactionTimes.map((time, index) => `
                  <div class="reaction-results-item ${time === bestTime ? 'best' : ''}">
                    <span>Attempt ${index + 1}:</span>
                    <span>${time.toFixed(1)} ms</span>
                  </div>
                `).join('')}
              </div>
              
              <div class="alert-box alert-${alertLevel}">
                <strong>${category}</strong>
                <p>${description}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHTML;
      
      // Save results
      this.saveResults({
        bestTime,
        avgTime,
        median,
        falseStarts: this.state.falseStarts,
        category,
        alertLevel
      });
    }
    
    saveResults(results) {
      // Format result for storage
      const resultData = {
        bestReactionTime: results.bestTime.toFixed(1),
        averageReactionTime: results.avgTime.toFixed(1),
        medianReactionTime: results.median.toFixed(1),
        falseStarts: results.falseStarts,
        category: results.category,
        alertLevel: results.alertLevel,
        summary: `Reaction time: ${results.bestTime.toFixed(0)} ms (${results.category})`
      };
      
      // Save to storage via controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('reaction', resultData);
      }
    }
    
    cleanup() {
      // Clear any running timers
      this.clearTimers();
    }
  }
  
  export default ReactionTimer;