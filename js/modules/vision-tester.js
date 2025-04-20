// modules/vision-tester.js - Interactive vision acuity test

class VisionTester {
    constructor() {
      // Test configuration
      this.testConfig = {
        letters: [
          'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 
          'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Y', 'Z'
        ],
        levels: [
          { size: 72, logMAR: 1.0, snellen: '20/200' },
          { size: 57, logMAR: 0.9, snellen: '20/160' },
          { size: 45, logMAR: 0.8, snellen: '20/125' },
          { size: 36, logMAR: 0.7, snellen: '20/100' },
          { size: 28, logMAR: 0.6, snellen: '20/80' },
          { size: 22, logMAR: 0.5, snellen: '20/63' },
          { size: 18, logMAR: 0.4, snellen: '20/50' },
          { size: 14, logMAR: 0.3, snellen: '20/40' },
          { size: 11, logMAR: 0.2, snellen: '20/32' },
          { size: 9, logMAR: 0.1, snellen: '20/25' },
          { size: 7, logMAR: 0.0, snellen: '20/20' },
          { size: 6, logMAR: -0.1, snellen: '20/16' }
        ],
        lettersPerLine: 5
      };
      
      // Test state
      this.currentState = {
        eye: null, // 'left' or 'right'
        levelIndex: 0,
        currentLetters: [],
        userResponses: [],
        completed: false,
        leftEyeResults: null,
        rightEyeResults: null
      };
    }
    
    initTest(container) {
      // Create UI for initial instructions
      container.innerHTML = `
        <div class="vision-test-container">
          <div id="vision-instructions" class="test-instructions">
            <h4>Visual Acuity Test</h4>
            <p>This test will help assess your visual acuity for each eye.</p>
            <ol>
              <li>Ensure you are in a well-lit room</li>
              <li>Position yourself approximately 20 inches (50 cm) from your screen</li>
              <li>If you wear glasses for distance vision, please keep them on</li>
              <li>For accurate results, please follow all instructions carefully</li>
            </ol>
            <div class="button-container">
              <button id="start-vision-test" class="primary-button">Begin Test</button>
            </div>
          </div>
          
          <div id="cover-eye-instructions" class="test-instructions" style="display:none;">
            <h4>Cover Your Left Eye</h4>
            <p>Please cover your LEFT eye with your hand.</p>
            <p>Make sure your eye is completely covered, but don't press on it.</p>
            <div class="eye-cover-illustration">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <ellipse cx="75" cy="75" rx="70" ry="70" fill="#FDE68A" />
                <ellipse cx="75" cy="75" rx="45" ry="60" fill="#FFF" />
                <ellipse cx="75" cy="75" rx="25" ry="25" fill="#1E3A8A" />
                <rect x="0" y="55" width="75" height="45" fill="#FDE68A" />
                <path d="M0,50 Q40,75 0,100 Z" fill="#F59E42" />
              </svg>
            </div>
            <div class="button-container">
              <button id="eye-covered" class="primary-button">My eye is covered</button>
            </div>
          </div>
          
          <div id="vision-test-content" class="test-content" style="display:none;">
            <h4 id="test-header">Testing Right Eye</h4>
            <p>Read the letters below and type them in the box</p>
            <div id="letter-display" class="letter-display"></div>
            <div class="input-section">
              <input id="letter-input" type="text" placeholder="Type the letters you see..." maxlength="5">
              <button id="submit-letters" class="primary-button">Submit</button>
            </div>
          </div>
          
          <div id="switch-eye-instructions" class="test-instructions" style="display:none;">
            <h4>Now Cover Your Right Eye</h4>
            <p>Please now cover your RIGHT eye with your hand.</p>
            <p>Make sure your eye is completely covered, but don't press on it.</p>
            <div class="eye-cover-illustration">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <ellipse cx="75" cy="75" rx="70" ry="70" fill="#FDE68A" />
                <ellipse cx="75" cy="75" rx="45" ry="60" fill="#FFF" />
                <ellipse cx="75" cy="75" rx="25" ry="25" fill="#1E3A8A" />
                <rect x="75" y="55" width="75" height="45" fill="#FDE68A" />
                <path d="M150,50 Q110,75 150,100 Z" fill="#F59E42" />
              </svg>
            </div>
            <div class="button-container">
              <button id="second-eye-covered" class="primary-button">My eye is covered</button>
            </div>
          </div>
          
          <div id="vision-results" class="results-container" style="display:none;">
            <h3>Vision Test Results</h3>
            <div id="results-content"></div>
          </div>
        </div>
      `;
      
      // Add event listeners
      document.getElementById('start-vision-test').addEventListener('click', () => this.startTest());
      document.getElementById('eye-covered').addEventListener('click', () => this.startRightEyeTest());
      document.getElementById('second-eye-covered').addEventListener('click', () => this.startLeftEyeTest());
      document.getElementById('submit-letters').addEventListener('click', () => this.checkLetters());
      
      // Also allow Enter key to submit
      document.getElementById('letter-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.checkLetters();
        }
      });
    }
    
    startTest() {
      // Hide instructions, show eye covering instructions
      document.getElementById('vision-instructions').style.display = 'none';
      document.getElementById('cover-eye-instructions').style.display = 'block';
      
      // Reset test state
      this.currentState = {
        eye: null,
        levelIndex: 0,
        currentLetters: [],
        userResponses: [],
        completed: false,
        leftEyeResults: null,
        rightEyeResults: null
      };
    }
    
    startRightEyeTest() {
      // Hide eye cover instructions
      document.getElementById('cover-eye-instructions').style.display = 'none';
      document.getElementById('vision-test-content').style.display = 'block';
      
      // Set up test for right eye
      this.currentState.eye = 'right';
      this.currentState.levelIndex = 0;
      this.currentState.userResponses = [];
      
      // Generate first set of letters and display them
      this.generateLetters();
      this.displayLetters();
    }
    
    startLeftEyeTest() {
      // Hide eye switch instructions
      document.getElementById('switch-eye-instructions').style.display = 'none';
      document.getElementById('vision-test-content').style.display = 'block';
      
      // Update header
      document.getElementById('test-header').textContent = 'Testing Left Eye';
      
      // Set up test for left eye
      this.currentState.eye = 'left';
      this.currentState.levelIndex = 0;
      this.currentState.userResponses = [];
      
      // Generate first set of letters and display them
      this.generateLetters();
      this.displayLetters();
    }
    
    generateLetters() {
      // Generate random set of letters for current level
      const letters = [];
      const availableLetters = [...this.testConfig.letters];
      
      for (let i = 0; i < this.testConfig.lettersPerLine; i++) {
        // Get random letter from available set
        const randomIndex = Math.floor(Math.random() * availableLetters.length);
        letters.push(availableLetters[randomIndex]);
        
        // Remove letter to avoid duplicates
        availableLetters.splice(randomIndex, 1);
        
        // If we run out of letters, refill array
        if (availableLetters.length === 0) {
          availableLetters.push(...this.testConfig.letters);
        }
      }
      
      this.currentState.currentLetters = letters;
    }
    
    displayLetters() {
      const letterDisplay = document.getElementById('letter-display');
      const currentLevel = this.testConfig.levels[this.currentState.levelIndex];
      
      // Set font size based on current level
      const fontSize = currentLevel.size;
      
      // Create HTML for letter display
      letterDisplay.innerHTML = `
        <div class="letter-row" style="font-size: ${fontSize}px; font-family: monospace; letter-spacing: 0.2em;">
          ${this.currentState.currentLetters.join('')}
        </div>
      `;
      
      // Clear input field
      document.getElementById('letter-input').value = '';
      document.getElementById('letter-input').focus();
    }
    
    checkLetters() {
      // Get user input
      const userInput = document.getElementById('letter-input').value.toUpperCase();
      
      // Calculate correct letters
      let correctCount = 0;
      for (let i = 0; i < Math.min(userInput.length, this.currentState.currentLetters.length); i++) {
        if (userInput[i] === this.currentState.currentLetters[i]) {
          correctCount++;
        }
      }
      
      // Calculate percentage correct
      const percentCorrect = correctCount / this.testConfig.lettersPerLine;
      
      // Store response data
      this.currentState.userResponses.push({
        level: this.currentState.levelIndex,
        levelSize: this.testConfig.levels[this.currentState.levelIndex].size,
        snellen: this.testConfig.levels[this.currentState.levelIndex].snellen,
        letters: this.currentState.currentLetters.join(''),
        response: userInput,
        correctCount,
        percentCorrect
      });
      
      // Determine next step based on performance
      if (percentCorrect >= 0.6) {
        // User got at least 60% correct, move to smaller letters
        this.currentState.levelIndex++;
        
        // Check if we've reached the smallest letters or max level
        if (this.currentState.levelIndex >= this.testConfig.levels.length) {
          this.completeEyeTest();
          return;
        }
        
        // Generate new letters for next level
        this.generateLetters();
        this.displayLetters();
      } else {
        // User got less than 60% correct, end test for this eye
        this.completeEyeTest();
      }
    }
    
    completeEyeTest() {
      if (this.currentState.eye === 'right') {
        // Calculate and store right eye results
        this.currentState.rightEyeResults = this.calculateEyeResults();
        
        // Show switch eye instructions
        document.getElementById('vision-test-content').style.display = 'none';
        document.getElementById('switch-eye-instructions').style.display = 'block';
      } else {
        // Calculate left eye results
        this.currentState.leftEyeResults = this.calculateEyeResults();
        
        // Complete test and show results
        this.currentState.completed = true;
        this.showResults();
      }
    }
    
    calculateEyeResults() {
      // Find the smallest line where user got at least 60% correct
      let bestLevelIndex = -1;
      let bestSnellen = "Unknown";
      
      for (let i = this.currentState.userResponses.length - 1; i >= 0; i--) {
        const response = this.currentState.userResponses[i];
        if (response.percentCorrect >= 0.6) {
          bestLevelIndex = response.level;
          bestSnellen = response.snellen;
          break;
        }
      }
      
      // If no level passed, use the largest size
      if (bestLevelIndex === -1 && this.currentState.userResponses.length > 0) {
        bestLevelIndex = this.currentState.userResponses[0].level;
        bestSnellen = this.currentState.userResponses[0].snellen;
      }
      
      // Calculate visual acuity category
      let acuityCategory = "Unknown";
      if (bestSnellen === "20/20" || bestSnellen === "20/16") {
        acuityCategory = "Excellent";
      } else if (bestSnellen === "20/25" || bestSnellen === "20/32") {
        acuityCategory = "Good";
      } else if (bestSnellen === "20/40" || bestSnellen === "20/50") {
        acuityCategory = "Functional";
      } else if (bestSnellen === "20/63" || bestSnellen === "20/80" || bestSnellen === "20/100") {
        acuityCategory = "Moderate Impairment";
      } else {
        acuityCategory = "Significant Impairment";
      }
      
      return {
        bestLevelIndex,
        bestSnellen,
        acuityCategory,
        responses: this.currentState.userResponses
      };
    }
    
    showResults() {
      // Hide test content
      document.getElementById('vision-test-content').style.display = 'none';
      
      // Show results container
      document.getElementById('vision-results').style.display = 'block';
      
      // Determine if doctor is needed
      const needsDoctor = this.isEyeDoctorRecommended();
      
      // Determine alert level
      let alertLevel = "success";
      if (needsDoctor) {
        alertLevel = "warning";
      }
      
      // Create recommendation message
      let recommendation = "";
      if (needsDoctor) {
        recommendation = "Based on your results, we recommend consulting an eye care professional for a comprehensive eye examination.";
      } else {
        recommendation = "Your visual acuity appears to be within normal ranges. Continue with regular eye check-ups as recommended by your eye care professional.";
      }
      
      // Format results for display
      const resultsHtml = `
        <div class="result-item">
          <div class="result-header">
            <h4 class="result-title">Visual Acuity Assessment</h4>
            <span class="result-timestamp">${new Date().toLocaleString()}</span>
          </div>
          <div class="result-content">
            <div class="result-details">
              <div class="eye-results">
                <div class="right-eye">
                  <h5>Right Eye</h5>
                  <div class="detail-row">
                    <span class="detail-label">Visual Acuity:</span>
                    <span class="detail-value">${this.currentState.rightEyeResults.bestSnellen}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${this.currentState.rightEyeResults.acuityCategory}</span>
                  </div>
                </div>
                <div class="left-eye">
                  <h5>Left Eye</h5>
                  <div class="detail-row">
                    <span class="detail-label">Visual Acuity:</span>
                    <span class="detail-value">${this.currentState.leftEyeResults.bestSnellen}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${this.currentState.leftEyeResults.acuityCategory}</span>
                  </div>
                </div>
              </div>
              <div class="alert-box alert-${alertLevel}">
                <strong>${needsDoctor ? 'Professional evaluation recommended.' : 'Normal vision detected.'}</strong>
                <p>${recommendation}</p>
              </div>
              <p class="disclaimer">This test is not a substitute for a comprehensive eye examination by an eye care professional.</p>
            </div>
          </div>
        </div>
      `;
      
      // Update results content
      document.getElementById('results-content').innerHTML = resultsHtml;
      
      // Save results
      this.saveResults();
    }
    
    isEyeDoctorRecommended() {
      // Check if either eye has an acuity worse than 20/40
      const rightEyeIndex = this.currentState.rightEyeResults.bestLevelIndex;
      const leftEyeIndex = this.currentState.leftEyeResults.bestLevelIndex;
      
      // Lower index = larger letters = worse vision
      const rightEyeAcuity = this.testConfig.levels[rightEyeIndex].logMAR;
      const leftEyeAcuity = this.testConfig.levels[leftEyeIndex].logMAR;
      
      // LogMAR > 0.3 is approx. worse than 20/40
      return rightEyeAcuity > 0.3 || leftEyeAcuity > 0.3;
    }
    
    saveResults() {
      // Create summary for better eye
      // Lower logMAR value = better vision
      const rightEyeLogMAR = this.testConfig.levels[this.currentState.rightEyeResults.bestLevelIndex].logMAR;
      const leftEyeLogMAR = this.testConfig.levels[this.currentState.leftEyeResults.bestLevelIndex].logMAR;
      
      const betterEye = rightEyeLogMAR <= leftEyeLogMAR ? 'right' : 'left';
      const betterEyeSnellen = betterEye === 'right' ? 
        this.currentState.rightEyeResults.bestSnellen : 
        this.currentState.leftEyeResults.bestSnellen;
      
      const worseEye = betterEye === 'right' ? 'left' : 'right';
      const worseEyeSnellen = worseEye === 'right' ? 
        this.currentState.rightEyeResults.bestSnellen : 
        this.currentState.leftEyeResults.bestSnellen;
      
      const needsDoctor = this.isEyeDoctorRecommended();
      
      // Create a summary for storage
      const summary = `Vision test: R: ${this.currentState.rightEyeResults.bestSnellen}, L: ${this.currentState.leftEyeResults.bestSnellen}`;
      
      // Add to local storage via the controller
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('vision', {
          rightEye: {
            acuity: this.currentState.rightEyeResults.bestSnellen,
            category: this.currentState.rightEyeResults.acuityCategory
          },
          leftEye: {
            acuity: this.currentState.leftEyeResults.bestSnellen,
            category: this.currentState.leftEyeResults.acuityCategory
          },
          betterEye,
          betterEyeAcuity: betterEyeSnellen,
          worseEyeAcuity: worseEyeSnellen,
          needsDoctor,
          summary
        });
      }
    }
    
    cleanup() {
      // Nothing to clean up for this test
    }
  }
  
  export default VisionTester;