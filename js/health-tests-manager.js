// js/health-tests-manager.js - Health Tests Dashboard and Local Storage

/**
 * Manages the health tests, their data, and UI interactions
 */
class HealthTestsManager {
  constructor() {
    this.tests = this.getAvailableTests();
    this.recommendedTests = [
      'skin', 'vision', 'vitals', 'hearing'
    ];
    this.savedResults = this.loadTestResults();
    this.userProfile = this.loadUserProfile();
  }
  
  /**
   * Initialize the health tests dashboard
   */
  initializeDashboard() {
    const healthTestsPage = document.getElementById('health-tests-page');
    if (!healthTestsPage) return;
    
    healthTestsPage.innerHTML = this.generateDashboardHTML();
    
    // Add event listeners for test cards
    document.querySelectorAll('.test-card').forEach(card => {
      card.addEventListener('click', (event) => {
        const testType = card.dataset.test;
        this.openTest(testType);
      });
    });
    
    // Add event listener for back buttons
    document.addEventListener('click', (event) => {
      if (event.target.closest('.back-btn')) {
        this.backToTestsDashboard();
      }
    });
  }
  
  /**
   * Generate HTML for the tests dashboard
   */
  generateDashboardHTML() {
    // Create sections for recommended and other tests
    const recommendedTests = this.tests.filter(test => 
      this.recommendedTests.includes(test.id)
    );
    
    const otherTests = this.tests.filter(test => 
      !this.recommendedTests.includes(test.id)
    );
    
    return `
      <div class="tests-container">
        <h3>Health Tests</h3>
        <p class="module-description">Assess your health with these diagnostic tools</p>
        
        <div class="recommended-section">
          <h4>Recommended Tests</h4>
          <div class="tests-grid">
            ${recommendedTests.map(test => this.generateTestCardHTML(test)).join('')}
          </div>
        </div>
        
        <div class="other-tests-section">
          <h4>More Tests</h4>
          <div class="tests-grid">
            ${otherTests.map(test => this.generateTestCardHTML(test)).join('')}
          </div>
        </div>
        
        <div class="testing-history">
          <h4>Recent Results</h4>
          ${this.generateRecentResultsHTML()}
        </div>
      </div>
    `;
  }
  
  /**
   * Generate HTML for a single test card
   */
  generateTestCardHTML(test) {
    return `
      <div class="test-card" data-test="${test.id}">
        <div class="test-icon ${test.id}">
          <img src="assets/images/icons/${test.id}.svg" alt="${test.name}" 
               onerror="this.outerHTML='<div class=\'icon-fallback\'>${test.id.charAt(0).toUpperCase()}</div>'">
        </div>
        <div class="test-info">
          <h4>${test.name}</h4>
          <p>${test.description}</p>
        </div>
        <div class="test-status">
          ${this.getTestStatusHTML(test.id)}
        </div>
      </div>
    `;
  }
  
  /**
   * Generate status indicator for a test
   */
  getTestStatusHTML(testId) {
    const results = this.savedResults[testId] || [];
    if (results.length === 0) {
      return '<span class="status-dot new"></span>';
    }
    
    const lastResult = results[results.length - 1];
    const resultDate = new Date(lastResult.timestamp);
    const today = new Date();
    const daysDiff = Math.floor((today - resultDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 7) {
      return '<span class="status-dot recent" title="Recently tested"></span>';
    } else {
      return '<span class="status-dot old" title="Test again"></span>';
    }
  }
  
  /**
   * Generate HTML for recent test results
   */
  generateRecentResultsHTML() {
    let allResults = [];
    
    // Collect results from all test types
    Object.keys(this.savedResults).forEach(testId => {
      const testResults = this.savedResults[testId].map(result => ({
        ...result,
        testId,
        testName: this.tests.find(t => t.id === testId)?.name || testId
      }));
      allResults = [...allResults, ...testResults];
    });
    
    // Sort by timestamp, most recent first
    allResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 3 most recent
    const recentResults = allResults.slice(0, 3);
    
    if (recentResults.length === 0) {
      return `<p class="no-results">No test results yet. Complete a test to see your results here.</p>`;
    }
    
    return `
      <div class="results-list">
        ${recentResults.map(result => this.generateResultItemHTML(result)).join('')}
        ${allResults.length > 3 ? 
          `<a href="#history" class="view-all-link">View all ${allResults.length} results</a>` : 
          ''}
      </div>
    `;
  }
  
  /**
   * Generate HTML for a single result item
   */
  generateResultItemHTML(result) {
    const date = new Date(result.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `
      <div class="result-item" data-test="${result.testId}" data-id="${result.id}">
        <div class="result-icon ${result.testId}">
          <img src="assets/images/icons/${result.testId}.svg" alt="${result.testName}" 
               onerror="this.outerHTML='<div class=\'icon-fallback\'>${result.testId.charAt(0).toUpperCase()}</div>'">
        </div>
        <div class="result-info">
          <h5>${result.testName} Result</h5>
          <p>${result.summary}</p>
          <span class="result-date">${formattedDate}</span>
        </div>
        <button class="view-result-btn" data-test="${result.testId}" data-id="${result.id}">
          View
        </button>
      </div>
    `;
  }
  
  /**
   * Open a specific test interface
   */
  openTest(testType) {
    const test = this.tests.find(t => t.id === testType);
    if (!test) return;
    
    const healthTestsPage = document.getElementById('health-tests-page');
    if (!healthTestsPage) return;
    
    // Update URL hash without navigation
    history.pushState(null, '', `#health-tests/${testType}`);
    
    // Generate test-specific HTML
    healthTestsPage.innerHTML = `
      <button class="btn-secondary back-btn">
        <img src="assets/images/icons/arrow-left.svg" alt="Back"> Back to Tests
      </button>
      
      <h3>${test.name}</h3>
      <p class="module-description">${test.description}</p>
      
      <div id="test-container-${testType}" class="test-container">
        ${this.generateTestContentHTML(test)}
      </div>
    `;
    
    // Initialize test-specific functionality
    this.initializeTestModule(testType);
  }
  
  /**
   * Generate content for a specific test
   */
  generateTestContentHTML(test) {
    switch (test.id) {
      case 'vision':
        return this.generateVisionTestHTML();
      case 'hearing':
        return this.generateHearingTestHTML();
      case 'vitals':
        return this.generateVitalsTestHTML();
      case 'skin':
        return this.generateSkinTestHTML();
      case 'wound':
        return this.generateWoundTestHTML();
      case 'motion':
        return this.generateMotionTestHTML();
      default:
        return `
          <div class="placeholder-test">
            <div class="test-icon ${test.id}">
              <img src="assets/images/icons/${test.id}.svg" alt="${test.name}" 
                   onerror="this.outerHTML='<div class=\'icon-fallback\'>${test.id.charAt(0).toUpperCase()}</div>'">
            </div>
            <h4>Test Simulation</h4>
            <p>This is a demonstration of the ${test.name} test. In a real implementation, this would include interactive elements.</p>
            
            <div class="test-options">
              <button class="btn-primary" id="simulate-test-${test.id}">Simulate Test</button>
            </div>
            
            <div id="test-results-${test.id}" class="test-results">
              <h4>Results</h4>
              <p class="no-results">Complete the test to see your results.</p>
            </div>
          </div>
        `;
    }
  }
  
  /**
   * Initialize the specific test functionality
   */
  initializeTestModule(testType) {
    // Add event listener for simulation button
    const simulateButton = document.getElementById(`simulate-test-${testType}`);
    if (simulateButton) {
      simulateButton.addEventListener('click', () => {
        this.simulateTestResult(testType);
      });
    }
    
    // Add test-specific initialization
    switch (testType) {
      case 'vision':
        this.initializeVisionTest();
        break;
      case 'hearing':
        this.initializeHearingTest();
        break;
      case 'vitals':
        this.initializeVitalsTest();
        break;
      // Add more test initializations as needed
    }
  }
  
  /**
   * Simulate a test result for demonstration
   */
  simulateTestResult(testType) {
    const test = this.tests.find(t => t.id === testType);
    if (!test) return;
    
    const resultId = `${testType}-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Create a simulated result
    let result;
    switch (testType) {
      case 'vision':
        result = {
          id: resultId,
          timestamp,
          summary: "Visual acuity: 20/30 - Mild impairment",
          details: {
            acuity: "20/30",
            correctAnswers: 7,
            totalQuestions: 10,
            recommendation: "Consider a comprehensive eye exam."
          }
        };
        break;
      case 'hearing':
        result = {
          id: resultId,
          timestamp,
          summary: "Normal hearing detected across frequencies",
          details: {
            overallStatus: "Normal",
            frequencies: {
              low: "Normal",
              mid: "Normal",
              high: "Normal"
            },
            recommendation: "Retest in 12 months."
          }
        };
        break;
      case 'vitals':
        result = {
          id: resultId,
          timestamp,
          summary: "Heart rate: 72 bpm (Normal range)",
          details: {
            heartRate: 72,
            confidence: "high",
            status: "Normal",
            recommendation: "Your heart rate is within normal range."
          }
        };
        break;
      case 'skin':
        result = {
          id: resultId,
          timestamp,
          summary: "Skin analysis: Normal, no concerns detected",
          details: {
            primaryAssessment: "Normal skin",
            confidence: 0.92,
            concerns: "None detected",
            recommendation: "Continue regular skin checks."
          }
        };
        break;
      default:
        result = {
          id: resultId,
          timestamp,
          summary: `${test.name} test completed successfully`,
          details: {
            status: "Normal",
            recommendation: "No issues detected."
          }
        };
    }
    
    // Save the result
    this.saveTestResult(testType, result);
    
    // Update the UI
    const resultsContainer = document.getElementById(`test-results-${testType}`);
    if (resultsContainer) {
      resultsContainer.innerHTML = this.generateTestResultHTML(result, test);
    }
    
    // Also add an activity record that could be shown on dashboard
    this.addActivityRecord({
      type: testType,
      detail: result.summary,
      timestamp: timestamp,
      resultId: resultId
    });
  }
  
  /**
   * Generate HTML for a test result
   */
  generateTestResultHTML(result, test) {
    return `
      <h4>Results</h4>
      <div class="result-card">
        <div class="result-header">
          <h5>${test.name} Assessment</h5>
          <span class="result-date">${new Date(result.timestamp).toLocaleString()}</span>
        </div>
        <div class="result-body">
          <div class="result-summary">
            <p><strong>${result.summary}</strong></p>
          </div>
          <div class="result-details">
            ${this.generateResultDetailsHTML(result, test)}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate HTML for result details based on test type
   */
  generateResultDetailsHTML(result, test) {
    switch (test.id) {
      case 'vision':
        return `
          <div class="detail-item">
            <div class="detail-label">Visual Acuity:</div>
            <div class="detail-value">${result.details.acuity}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Score:</div>
            <div class="detail-value">${result.details.correctAnswers}/${result.details.totalQuestions}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Recommendation:</div>
            <div class="detail-value">${result.details.recommendation}</div>
          </div>
        `;
      case 'hearing':
        return `
          <div class="detail-item">
            <div class="detail-label">Status:</div>
            <div class="detail-value">${result.details.overallStatus}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Low Frequencies:</div>
            <div class="detail-value">${result.details.frequencies.low}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Mid Frequencies:</div>
            <div class="detail-value">${result.details.frequencies.mid}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">High Frequencies:</div>
            <div class="detail-value">${result.details.frequencies.high}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Recommendation:</div>
            <div class="detail-value">${result.details.recommendation}</div>
          </div>
        `;
      case 'vitals':
        return `
          <div class="detail-item">
            <div class="detail-label">Heart Rate:</div>
            <div class="detail-value">${result.details.heartRate} bpm</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Status:</div>
            <div class="detail-value">${result.details.status}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Confidence:</div>
            <div class="detail-value">${result.details.confidence}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Recommendation:</div>
            <div class="detail-value">${result.details.recommendation}</div>
          </div>
        `;
      default:
        return `
          <div class="detail-item">
            <div class="detail-label">Status:</div>
            <div class="detail-value">${result.details.status}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Recommendation:</div>
            <div class="detail-value">${result.details.recommendation}</div>
          </div>
        `;
    }
  }
  
  /**
   * Return to the tests dashboard
   */
  backToTestsDashboard() {
    // Update URL hash without navigation
    history.pushState(null, '', '#health-tests');
    
    // Reinitialize the dashboard
    this.initializeDashboard();
  }
  
  /**
   * Save a test result to localStorage
   */
  saveTestResult(testType, result) {
    // Get existing results for this test
    const results = this.savedResults[testType] || [];
    
    // Add new result
    results.push(result);
    
    // Update saved results
    this.savedResults[testType] = results;
    
    // Save to localStorage
    localStorage.setItem('healthTestResults', JSON.stringify(this.savedResults));
  }
  
  /**
   * Add an activity record for the dashboard
   */
  addActivityRecord(activity) {
    // Get existing activities
    const activities = JSON.parse(localStorage.getItem('healthActivities') || '[]');
    
    // Add new activity
    activities.unshift(activity); // Add to beginning
    
    // Limit to 50 activities
    const limitedActivities = activities.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem('healthActivities', JSON.stringify(limitedActivities));
  }
  
  /**
   * Load test results from localStorage
   */
  loadTestResults() {
    const savedResults = localStorage.getItem('healthTestResults');
    return savedResults ? JSON.parse(savedResults) : {};
  }
  
  /**
   * Load user profile from localStorage
   */
  loadUserProfile() {
    const savedProfile = localStorage.getItem('userProfile');
    return savedProfile ? JSON.parse(savedProfile) : {
      name: 'User',
      email: 'user@example.com',
      dob: null,
      gender: null
    };
  }
  
  /**
   * Get all available tests
   */
  getAvailableTests() {
    return [
      {
        id: 'skin',
        name: 'Skin Analysis',
        description: 'Analyze skin conditions, lesions, and rashes'
      },
      {
        id: 'wound',
        name: 'Wound Assessment',
        description: 'Check wounds for signs of infection or healing'
      },
      {
        id: 'vision',
        name: 'Vision Test',
        description: 'Basic vision screening tests and eye exams'
      },
      {
        id: 'hearing',
        name: 'Hearing Test',
        description: 'Hearing screening and frequency tests'
      },
      {
        id: 'vitals',
        name: 'Vital Signs',
        description: 'Measure heart rate and other vital metrics'
      },
      {
        id: 'motion',
        name: 'Range of Motion',
        description: 'Analyze joint flexibility and movement range'
      },
      {
        id: 'reaction',
        name: 'Reaction Time',
        description: 'Measure reaction speed and accuracy'
      },
      {
        id: 'tremor',
        name: 'Tremor Analysis',
        description: 'Assess tremor severity and patterns'
      },
      {
        id: 'balance',
        name: 'Balance Test',
        description: 'Evaluate stability and coordination'
      }
    ];
  }
  
  /* Template generators for specific tests */
  
  generateVisionTestHTML() {
    return `
      <div class="vision-test">
        <div class="test-options">
          <div class="option-card active" data-test="acuity">
            <div class="option-icon">
              <img src="assets/images/icons/vision-acuity.svg" alt="Visual Acuity">
            </div>
            <div class="option-info">
              <h5>Visual Acuity</h5>
              <p>Test how well you can see at different distances</p>
            </div>
          </div>
          <div class="option-card" data-test="color">
            <div class="option-icon">
              <img src="assets/images/icons/vision-color.svg" alt="Color Vision">
            </div>
            <div class="option-info">
              <h5>Color Vision</h5>
              <p>Test your ability to distinguish between colors</p>
            </div>
          </div>
          <div class="option-card" data-test="astigmatism">
            <div class="option-icon">
              <img src="assets/images/icons/vision-astigmatism.svg" alt="Astigmatism">
            </div>
            <div class="option-info">
              <h5>Astigmatism</h5>
              <p>Test for irregular curvature of the eye</p>
            </div>
          </div>
        </div>
        
        <div class="test-area">
          <div id="vision-test-content" class="test-content">
            <div class="start-screen">
              <h4>Visual Acuity Test</h4>
              <p>This test measures how well you can see at different distances.</p>
              <ol class="test-instructions">
                <li>Position yourself about 40cm (16 inches) from the screen</li>
                <li>If you wear glasses or contacts, keep them on</li>
                <li>You'll be shown a series of letters at different sizes</li>
                <li>Identify each letter by clicking on the correct option</li>
              </ol>
              <button class="btn-primary" id="start-vision-test">Start Test</button>
            </div>
          </div>
        </div>
        
        <div id="vision-test-results" class="test-results">
          <h4>Results</h4>
          <p class="no-results">Complete the test to see your results.</p>
        </div>
      </div>
    `;
  }
  
  generateHearingTestHTML() {
    return `
      <div class="hearing-test">
        <div class="test-setup">
          <h4>Hearing Test Setup</h4>
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
          <button class="btn-primary" id="start-hearing-test" disabled>Start Test</button>
          <p class="setup-note">Please check all items above to continue</p>
        </div>
        
        <div class="test-area hidden" id="hearing-test-area">
          <div id="hearing-test-content" class="test-content">
            <!-- Test content will be inserted here -->
          </div>
        </div>
        
        <div id="hearing-test-results" class="test-results">
          <h4>Results</h4>
          <p class="no-results">Complete the test to see your results.</p>
        </div>
      </div>
    `;
  }
  
  generateVitalsTestHTML() {
    return `
      <div class="vitals-test">
        <div class="camera-container">
          <video id="video-vitals" autoplay playsinline></video>
          <div class="pulse-indicator">
            <div class="pulse-circle"></div>
            <div id="pulse-instructions">Place your finger on the camera lens</div>
          </div>
        </div>
        
        <div class="button-container">
          <button id="start-vitals" class="primary-button">Start Measurement</button>
          <button id="stop-vitals" class="secondary-button" disabled>Stop</button>
        </div>
        
        <div class="measurement-display">
          <div class="measurement-timer">
            <span id="measurement-time">0</span>s
          </div>
          <div class="pulse-display">
            <svg id="pulse-graph" width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
              <polyline id="pulse-line" points="" fill="none" stroke="#ef4444" stroke-width="2"></polyline>
            </svg>
          </div>
        </div>
        
        <div id="vitals-results" class="test-results">
          <h4>Results</h4>
          <p class="no-results">Complete the measurement to see your results.</p>
        </div>
      </div>
    `;
  }
  
  generateSkinTestHTML() {
    return `
      <div class="skin-test">
        <div class="camera-container">
          <video id="video-skin" autoplay playsinline></video>
          <div id="focus-indicator" class="focus-indicator"></div>
          <div id="guidance-container" class="guidance-container">
            <div id="guidance-message" class="guidance-message">Position camera near the skin area</div>
            <div class="guidance-progress">
              <div id="guidance-progress-bar" class="guidance-progress-bar" style="width: 0%"></div>
            </div>
          </div>
        </div>
        
        <div class="button-container">
          <button id="capture-skin" class="primary-button">Capture Image</button>
          <button id="switch-camera" class="secondary-button">Switch Camera</button>
        </div>
        
        <div id="skin-results" class="test-results">
          <h4>Analysis Results</h4>
          <p class="no-results">Capture an image to begin analysis.</p>
        </div>
      </div>
    `;
  }
  
  generateWoundTestHTML() {
    return `
      <div class="wound-test">
        <div class="camera-container">
          <video id="video-wound" autoplay playsinline></video>
          <div id="focus-indicator" class="focus-indicator"></div>
          <div class="reference-overlay">
            <div class="measurement-guide"></div>
          </div>
        </div>
        
        <div class="wound-input-group">
          <label for="wound-age">How old is this wound?</label>
          <select id="wound-age">
            <option value="0">Less than 6 hours</option>
            <option value="1">6-24 hours</option>
            <option value="2">1-3 days</option>
            <option value="3">More than 3 days</option>
          </select>
        </div>
        
        <div class="button-container">
          <button id="capture-wound" class="primary-button">Capture Image</button>
          <button id="switch-camera" class="secondary-button">Switch Camera</button>
        </div>
        
        <div id="wound-results" class="test-results">
          <h4>Assessment Results</h4>
          <p class="no-results">Capture an image to begin assessment.</p>
        </div>
      </div>
    `;
  }
  
  generateMotionTestHTML() {
    return `
      <div class="motion-test">
        <div class="motion-selection">
          <div class="motion-option active" data-joint="shoulder">
            <img src="assets/images/icons/joint-shoulder.svg" alt="Shoulder">
            <span>Shoulder</span>
          </div>
          <div class="motion-option" data-joint="elbow">
            <img src="assets/images/icons/joint-elbow.svg" alt="Elbow">
            <span>Elbow</span>
          </div>
          <div class="motion-option" data-joint="knee">
            <img src="assets/images/icons/joint-knee.svg" alt="Knee">
            <span>Knee</span>
          </div>
          <div class="motion-option" data-joint="ankle">
            <img src="assets/images/icons/joint-ankle.svg" alt="Ankle">
            <span>Ankle</span>
          </div>
        </div>
        
        <div class="camera-container">
          <video id="video-motion" autoplay playsinline></video>
          <div class="motion-guide">
            <p>Raise and lower your arm straight out to the side</p>
          </div>
        </div>
        
        <div class="button-container">
          <button id="start-motion" class="primary-button">Start Recording</button>
          <button id="stop-motion" class="secondary-button" disabled>Stop</button>
        </div>
        
        <div id="motion-results" class="test-results">
          <h4>Range of Motion Results</h4>
          <p class="no-results">Complete the measurement to see your results.</p>
        </div>
      </div>
    `;
  }
  
  /* Test-specific initialization functions */
  
  initializeVisionTest() {
    // Add checkbox listeners for hearing test setup
    const checkboxes = document.querySelectorAll('.setup-checklist input[type="checkbox"]');
    const startButton = document.getElementById('start-hearing-test');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        if (startButton) {
          startButton.disabled = !allChecked;
        }
      });
    });
    
    // Add event listeners for vision test options
    document.querySelectorAll('.option-card').forEach(card => {
      card.addEventListener('click', (event) => {
        // Set active class
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Update test content
        const testType = card.dataset.test;
        const testContent = document.getElementById('vision-test-content');
        if (testContent) {
          // In a full implementation, we'd load different content based on test type
          testContent.innerHTML = `
            <div class="start-screen">
              <h4>${card.querySelector('h5').textContent}</h4>
              <p>${card.querySelector('p').textContent}</p>
              <button class="btn-primary" id="start-vision-test">Start Test</button>
            </div>
          `;
          
          // Add event listener to the new start button
          const startButton = document.getElementById('start-vision-test');
          if (startButton) {
            startButton.addEventListener('click', () => {
              this.simulateTestResult('vision');
            });
          }
        }
      });
    });
    
    // Add event listener to start button
    const startButton = document.getElementById('start-vision-test');
    if (startButton) {
      startButton.addEventListener('click', () => {
        this.simulateTestResult('vision');
      });
    }
  }
  
  initializeHearingTest() {
    // Add checkbox listeners for hearing test setup
    const checkboxes = document.querySelectorAll('.setup-checklist input[type="checkbox"]');
    const startButton = document.getElementById('start-hearing-test');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        if (startButton) {
          startButton.disabled = !allChecked;
        }
      });
    });
    
    // Add event listener to start button
    if (startButton) {
      startButton.addEventListener('click', () => {
        // Hide setup, show test area
        document.querySelector('.test-setup').classList.add('hidden');
        document.getElementById('hearing-test-area').classList.remove('hidden');
        
        // Set test content
        const testContent = document.getElementById('hearing-test-content');
        if (testContent) {
          testContent.innerHTML = `
            <div class="hearing-test-ui">
              <h4>Hearing Test</h4>
              <p>You will hear a series of tones. Press the "I Heard It" button when you hear a tone.</p>
              <div class="test-controls">
                <button class="btn-primary" id="heard-tone-btn">I Heard It</button>
                <button class="btn-secondary" id="didnt-hear-btn">I Didn't Hear It</button>
              </div>
              <div class="test-progress">
                <div class="progress-label">Test Progress</div>
                <div class="progress-bar-container">
                  <div class="progress-bar" style="width: 0%"></div>
                </div>
              </div>
            </div>
          `;
          
          // Add event listeners to buttons
          const heardButton = document.getElementById('heard-tone-btn');
          const notHeardButton = document.getElementById('didnt-hear-btn');
          
          if (heardButton && notHeardButton) {
            let progress = 0;
            const progressBar = testContent.querySelector('.progress-bar');
            
            // Simulate test steps
            const simulateStep = () => {
              progress += 20;
              if (progressBar) {
                progressBar.style.width = `${progress}%`;
              }
              
              if (progress >= 100) {
                this.simulateTestResult('hearing');
                return;
              }
              
              // Schedule next step
              setTimeout(simulateStep, 2000);
            };
            
            // Start simulation
            simulateStep();
            
            // Add event listeners
            heardButton.addEventListener('click', () => {
              // This would process the user's response in a real implementation
              console.log('User heard the tone');
            });
            
            notHeardButton.addEventListener('click', () => {
              // This would process the user's response in a real implementation
              console.log('User did not hear the tone');
            });
          }
        }
      });
    }
  }
  
  initializeVitalsTest() {
    // Simulate camera access
    const videoElement = document.getElementById('video-vitals');
    const startButton = document.getElementById('start-vitals');
    const stopButton = document.getElementById('stop-vitals');
    
    if (startButton) {
      startButton.addEventListener('click', () => {
        // In a real implementation, we'd initialize the camera here
        // For simulation, we'll just update UI elements
        
        startButton.disabled = true;
        stopButton.disabled = false;
        
        const pulseInstructions = document.getElementById('pulse-instructions');
        if (pulseInstructions) {
          pulseInstructions.textContent = 'Measuring pulse...';
        }
        
        const pulseCircle = document.querySelector('.pulse-circle');
        if (pulseCircle) {
          pulseCircle.classList.add('pulse-animation');
        }
        
        // Simulate measurement time
        let time = 0;
        const timeDisplay = document.getElementById('measurement-time');
        const timerInterval = setInterval(() => {
          time++;
          if (timeDisplay) {
            timeDisplay.textContent = time;
          }
          
          // Update pulse graph
          this.updatePulseGraph(time);
          
          // Complete after 15 seconds
          if (time >= 15) {
            clearInterval(timerInterval);
            this.simulateTestResult('vitals');
            
            startButton.disabled = false;
            stopButton.disabled = true;
            
            if (pulseInstructions) {
              pulseInstructions.textContent = 'Measurement complete';
            }
            
            if (pulseCircle) {
              pulseCircle.classList.remove('pulse-animation');
            }
          }
        }, 1000);
        
        // Handle stop button
        stopButton.addEventListener('click', () => {
          clearInterval(timerInterval);
          startButton.disabled = false;
          stopButton.disabled = true;
          
          if (pulseInstructions) {
            pulseInstructions.textContent = 'Measurement stopped';
          }
          
          if (pulseCircle) {
            pulseCircle.classList.remove('pulse-animation');
          }
        });
      });
    }
  }
  
  /**
   * Update the pulse graph for the vitals test
   */
  updatePulseGraph(time) {
    const pulseGraph = document.getElementById('pulse-line');
    if (!pulseGraph) return;
    
    // Get current points
    let points = pulseGraph.getAttribute('points') || '';
    
    // Generate a new point
    // Simulated heartbeat pattern
    const x = time * 20; // 20 pixels per second
    const baseY = 50; // Center of the graph
    const amplitude = 30; // Height of the pulse
    const frequency = time % 1 < 0.2 ? 3 : 0.5; // Create a "beat" effect
    const y = baseY - amplitude * Math.sin(time * frequency);
    
    // Add new point
    points += `${x},${y} `;
    
    // Update the graph
    pulseGraph.setAttribute('points', points);
    
    // Update viewBox to scroll graph
    const svg = document.getElementById('pulse-graph');
    if (svg && x > 280) {
      const viewBox = `${x - 280} 0 300 100`;
      svg.setAttribute('viewBox', viewBox);
    }
  }
}

// Export the HealthTestsManager class
export default HealthTestsManager;