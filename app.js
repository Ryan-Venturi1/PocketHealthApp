// app.js - Updates for integration with ML models

// Import the model modules
import { loadSkinModel, analyzeSkinImage, captureSkinImage, warmupModel, SKIN_CONDITIONS } from './models/skin-analysis.js';
import { loadWoundModel, analyzeWoundImage, captureWoundImage, warmupWoundModel, WOUND_CLASSES } from './models/wound-analysis.js';
import { VisionTestManager } from './models/vision-tests.js';
import { HearingTestManager } from './models/hearing-tests.js';
import { VitalsProcessor } from './models/vitals-processing.js';
import { MotionAnalyzer, JOINT_ROM_REFERENCE } from './models/motion-analysis.js';

// Global application state
const app = {
  activeModule: 'skin',
  camera: {
    stream: null,
    active: false,
    facingMode: 'environment' // 'environment' is back camera, 'user' is front camera
  },
  models: {
    skin: null,
    wound: null
  },
  modelStatus: {
    skin: 'not_loaded',
    wound: 'not_loaded',
    motion: 'not_loaded'
  },
  tests: {
    vision: new VisionTestManager(),
    hearing: new HearingTestManager(),
    vitals: new VitalsProcessor(),
    motion: new MotionAnalyzer()
  },
  results: {
    skin: [],
    wound: [],
    vision: [],
    hearing: [],
    vitals: [],
    motion: []
  }
};

// ====================================
// Core Application Initialization
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializeModuleTabs();
  loadModels();
});

// ====================================
// Model Loading & Initialization
// ====================================

async function loadModels() {
  updateModelStatus('Loading...');

  try {
    // Start by loading models progressively
    // Load the most immediately needed model first based on default module
    
    // 1. Load skin model
    const skinLoadPromise = loadSkinModel(progress => {
      updateModelProgress('skin', progress);
    });
    
    // 2. Continue loading other models in background
    skinLoadPromise.then(async (skinModel) => {
      app.models.skin = skinModel;
      app.modelStatus.skin = 'loaded';
      updateModelStatus('Skin model ready, loading others...');
      
      // Warm up the model with a dummy prediction
      await warmupModel(skinModel.model);
      
      // Now load wound model
      const woundModel = await loadWoundModel(progress => {
        updateModelProgress('wound', progress);
      });
      
      app.models.wound = woundModel;
      app.modelStatus.wound = 'loaded';
      
      // Load PoseNet for motion analysis in background
      app.tests.motion.loadModel(progress => {
        updateModelProgress('motion', progress);
      }).then(() => {
        app.modelStatus.motion = 'loaded';
        updateModelStatus('All models loaded');
      });
    });
    
    // Update UI while first model loads
    updateModelStatus('Loading models...');
  } catch (error) {
    console.error('Error loading models:', error);
    updateModelStatus('Error loading models', true);
  }
}

function updateModelProgress(modelName, progress) {
  // Update progress indicators for specific models
  const statusElement = document.getElementById('model-status');
  
  if (progress.status === 'loading') {
    app.modelStatus[modelName] = 'loading';
    statusElement.textContent = `Loading ${modelName} model: ${Math.round(progress.progress * 100)}%`;
  } else if (progress.status === 'ready') {
    app.modelStatus[modelName] = 'loaded';
    
    // Check overall status
    const allLoaded = Object.values(app.modelStatus).every(status => status === 'loaded');
    statusElement.textContent = allLoaded ? 'All models loaded' : 'Some models loaded';
    statusElement.classList.toggle('status-ready', true);
  } else if (progress.status === 'error') {
    app.modelStatus[modelName] = 'error';
    statusElement.textContent = `Error loading ${modelName} model`;
    statusElement.classList.toggle('status-error', true);
  }
}

// ====================================
// Skin Analysis Module Implementation
// ====================================

async function captureSkinImageHandler() {
  const videoElement = document.getElementById('video-skin');
  const resultsContainer = document.getElementById('results-skin');
  const captureButton = document.getElementById('capture-skin');
  
  // Change button state
  captureButton.textContent = 'Processing...';
  captureButton.disabled = true;
  captureButton.classList.remove('pulse-animation');
  
  try {
    // Get focus quality from the UI
    const focusIndicator = document.getElementById('focus-indicator');
    const focusQuality = focusIndicator.classList.contains('good') ? 0.9 : 
                         focusIndicator.classList.contains('bad') ? 0.3 : 0.6;
    
    // Capture the image
    const imageData = captureSkinImage(videoElement, focusQuality);
    
    // Analyze the image
    const analysisResult = await analyzeSkinImage(app.models.skin.model, imageData.processingCanvas);
    
    // Display results
    displaySkinResults(analysisResult, imageData.imageDataUrl, focusQuality);
  } catch (error) {
    console.error('Error capturing image:', error);
    alert('Error processing image. Please try again.');
  } finally {
    // Reset button state
    captureButton.textContent = 'Capture Image';
    captureButton.disabled = false;
  }
}

function displaySkinResults(analysis, imageDataUrl, imageQuality) {
  const resultsContainer = document.getElementById('results-skin');
  const timestamp = new Date().toLocaleString();
  
  // Remove "no results" message if present
  const noResults = resultsContainer.querySelector('.no-results');
  if (noResults) {
    resultsContainer.removeChild(noResults);
  }
  
  // Create result item
  const resultItem = document.createElement('div');
  resultItem.className = 'result-item';
  
  // Top 3 conditions from results
  const topResults = analysis.results.slice(0, 3);
  
  // Format alert based on risk assessment
  const alertClass = analysis.riskAssessment.level === 'high' ? 'alert-danger' : 
                    analysis.riskAssessment.level === 'moderate' ? 'alert-warning' : 
                    'alert-info';
  
  // Format top result bars
  const resultBars = topResults.map(result => {
    const percent = (result.confidence * 100).toFixed(1);
    let confidenceClass = 'confidence-low';
    
    if (result.confidence > 0.7) {
      confidenceClass = 'confidence-high';
    } else if (result.confidence > 0.4) {
      confidenceClass = 'confidence-medium';
    }
    
    return `
      <div class="detail-row">
        <span class="detail-label">${result.display}</span>
        <div class="detail-bar-container">
          <div class="detail-bar ${confidenceClass}" style="width: ${percent}%"></div>
        </div>
        <span class="detail-percentage">${percent}%</span>
      </div>
    `;
  }).join('');
  
  // Add image quality warning if poor
  const qualityWarning = imageQuality < 0.5 ? 
    `<div class="alert-box alert-warning">
      <strong>Low image quality.</strong> Results may be less reliable. Try again with better lighting and focus.
    </div>` : '';
  
  // Build HTML for the result
  resultItem.innerHTML = `
    <div class="result-header">
      <h4 class="result-title">Skin Analysis</h4>
      <span class="result-timestamp">${timestamp}</span>
    </div>
    <div class="result-content">
      <img src="${imageDataUrl}" class="result-image" alt="Analyzed skin">
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Primary Assessment:</span>
          <span class="detail-value">${topResults[0].display}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Confidence:</span>
          <span class="detail-value">${(topResults[0].confidence * 100).toFixed(1)}%</span>
        </div>
        <h5>Other Potential Matches:</h5>
        ${resultBars}
        ${qualityWarning}
        <div class="alert-box ${alertClass}">
          <strong>${analysis.riskAssessment.recommendation.level === 'high' ? 'High concern detected.' : 
                   analysis.riskAssessment.recommendation.level === 'moderate' ? 'Moderate concern.' : 
                   'Low concern.'}</strong>
          <p>${analysis.riskAssessment.recommendation.message}</p>
        </div>
      </div>
    </div>
  `;
  
  // Add to results container (at the top)
  resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
  
  // Store results
  app.results.skin.unshift({
    timestamp: timestamp,
    image: imageDataUrl,
    results: analysis
  });
  
  // Limit stored results to 10
  if (app.results.skin.length > 10) {
    app.results.skin.pop();
  }
}

// ====================================
// Wound Assessment Module Implementation
// ====================================

async function captureWoundImageHandler() {
  const videoElement = document.getElementById('video-wound');
  const resultsContainer = document.getElementById('results-wound');
  const captureButton = document.getElementById('capture-wound');
  const woundAgeSelect = document.getElementById('wound-age');
  const woundAge = woundAgeSelect.value;
  
  // Change button state
  captureButton.textContent = 'Processing...';
  captureButton.disabled = true;
  
  try {
    // Capture the wound image
    const imageData = captureWoundImage(videoElement);
    
    // Analyze wound image
    const analysisResult = await analyzeWoundImage(
      app.models.wound.model, 
      imageData.processingCanvas, 
      woundAge
    );
    
    // Display results
    displayWoundResults(analysisResult, imageData.imageDataUrl);
  } catch (error) {
    console.error('Error capturing wound image:', error);
    alert('Error processing image. Please try again.');
  } finally {
    // Reset button state
    captureButton.textContent = 'Capture Wound Image';
    captureButton.disabled = false;
  }
}

function displayWoundResults(analysis, imageDataUrl) {
  const resultsContainer = document.getElementById('results-wound');
  const timestamp = new Date().toLocaleString();
  
  // Remove "no results" message if present
  const noResults = resultsContainer.querySelector('.no-results');
  if (noResults) {
    resultsContainer.removeChild(noResults);
  }
  
  // Determine alert class based on recommendation level
  const alertClass = analysis.assessment.recommendation.level === 'high' ? 'alert-danger' : 
                    analysis.assessment.recommendation.level === 'moderate' ? 'alert-warning' : 
                    'alert-info';
  
  // Create result item
  const resultItem = document.createElement('div');
  resultItem.className = 'result-item';
  
  // Helper function for bar color
  const getBarClass = (value, reverse = false) => {
    if (reverse) {
      if (value < 0.3) return 'confidence-high';
      if (value < 0.6) return 'confidence-medium';
      return 'confidence-low';
    } else {
      if (value > 0.7) return 'confidence-low';
      if (value > 0.4) return 'confidence-medium';
      return 'confidence-high';
    }
  };
  
  // Build HTML for the result
  resultItem.innerHTML = `
    <div class="result-header">
      <h4 class="result-title">Wound Assessment</h4>
      <span class="result-timestamp">${timestamp}</span>
    </div>
    <div class="result-content">
      <img src="${imageDataUrl}" class="result-image" alt="Analyzed wound">
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Primary Type:</span>
          <span class="detail-value">${analysis.classResults[0].display}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Infection Risk:</span>
          <div class="detail-bar-container">
            <div class="detail-bar ${getBarClass(analysis.assessment.infectionRisk, true)}" 
                 style="width: ${(analysis.assessment.infectionRisk * 100).toFixed(0)}%"></div>
          </div>
          <span class="detail-percentage">${(analysis.assessment.infectionRisk * 100).toFixed(0)}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Healing Progress:</span>
          <div class="detail-bar-container">
            <div class="detail-bar ${getBarClass(analysis.assessment.healingProgress)}" 
                 style="width: ${(analysis.assessment.healingProgress * 100).toFixed(0)}%"></div>
          </div>
          <span class="detail-percentage">${(analysis.assessment.healingProgress * 100).toFixed(0)}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Stitches Indicated:</span>
          <div class="detail-bar-container">
            <div class="detail-bar ${getBarClass(analysis.assessment.stitchesNeeded, true)}" 
                 style="width: ${(analysis.assessment.stitchesNeeded * 100).toFixed(0)}%"></div>
          </div>
          <span class="detail-percentage">${(analysis.assessment.stitchesNeeded * 100).toFixed(0)}%</span>
        </div>
        <div class="alert-box ${alertClass}">
          <strong>${analysis.assessment.recommendation.message}</strong>
        </div>
      </div>
    </div>
  `;
  
  // Add to results container (at the top)
  resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
  
  // Store results
  app.results.wound.unshift({
    timestamp: timestamp,
    image: imageDataUrl,
    results: analysis
  });
  
  // Limit stored results to 10
  if (app.results.wound.length > 10) {
    app.results.wound.pop();
  }
}

// ====================================
// Vision Test Module Implementation
// ====================================

function selectVisionTest(testType) {
  // Update UI to show selected test
  document.querySelectorAll('.test-option').forEach(option => {
    option.classList.toggle('active', option.dataset.test === testType);
  });
  
  // Initialize test
  const testInfo = app.tests.vision.startTest(testType);
  
  // Set up initial test UI
  const testContainer = document.getElementById('vision-test-container');
  
  testContainer.innerHTML = `
    <div class="test-instructions">
      <h4>${testType === 'acuity' ? 'Visual Acuity Test' : 
            testType === 'color' ? 'Color Vision Test' : 
            'Astigmatism Test'}</h4>
      <p>${testInfo.instructions}</p>
    </div>
  `;
  
  // Enable start button
  document.getElementById('next-vision-step').disabled = false;
  document.getElementById('next-vision-step').textContent = 'Start Test';
}

function advanceVisionTest() {
  // Get current test data
  const testData = app.tests.vision.getCurrentTestData();
  const nextButton = document.getElementById('next-vision-step');
  const testContainer = document.getElementById('vision-test-container');
  
  if (!testData) return;
  
  // Update button text after first click
  if (app.tests.vision.currentStep === 0) {
    nextButton.textContent = 'Next';
  }
  
  // If test complete, show results
  if (testData.type === 'results') {
    displayVisionResults(testData);
    
    // Reset test button
    nextButton.textContent = 'Test Again';
    nextButton.disabled = false;
    nextButton.onclick = () => {
      app.tests.vision.resetTests();
      resetVisionTest();
    };
    
    return;
  }
  
  // Handle specific test types
  switch (testData.type) {
    case 'acuity':
      testContainer.innerHTML = `
        <div class="vision-chart" style="font-size: ${testData.fontSize}px; margin-bottom: 20px; font-family: monospace;">
          ${testData.letter}
        </div>
        <div class="vision-input">
          <p>What letter do you see?</p>
          <div class="button-group">
            ${testData.options.map(option => 
              `<button class="vision-answer" data-answer="${option}">${option}</button>`
            ).join('')}
          </div>
        </div>
        <div class="test-progress">
          Step ${testData.step} of ${testData.totalSteps}
        </div>
      `;
      break;
    
    case 'color':
      testContainer.innerHTML = `
        <div class="color-test">
          <p>What number do you see in the pattern?</p>
          <div id="color-plate" class="ishihara-plate"></div>
          <div class="button-group">
            <button class="vision-answer" data-answer="${testData.number}">${testData.number}</button>
            <button class="vision-answer" data-answer="none">Can't See Any Number</button>
            <button class="vision-answer" data-answer="different">Different Number</button>
          </div>
        </div>
        <div class="test-progress">
          Step ${testData.step} of ${testData.totalSteps}
        </div>
      `;
      
      // Generate Ishihara plate
      createSimulatedIshiharaPlate(
        'color-plate', 
        testData.number, 
        testData.colors, 
        testData.bgColors
      );
      break;
    
    case 'astigmatism':
      testContainer.innerHTML = `
        <div class="astigmatism-test">
          <h4>${testData.question}</h4>
          <div class="radial-lines" id="radial-lines"></div>
          <div class="button-group" style="margin-top: 20px">
            ${testData.step === 1 ? 
              `<button class="vision-answer" data-answer="equal">All lines look equal</button>
               <button class="vision-answer" data-answer="unequal">Some lines are darker/clearer</button>` : 
              `<button class="vision-answer" data-answer="horizontal">Horizontal lines</button>
               <button class="vision-answer" data-answer="vertical">Vertical lines</button>
               <button class="vision-answer" data-answer="diagonal">Diagonal lines</button>
               <button class="vision-answer" data-answer="equal">All lines look equal</button>`
            }
          </div>
          <div class="test-progress">
            Step ${testData.step} of ${testData.totalSteps}
          </div>
        </div>
      `;
      
      // Create radial lines
      createRadialLines('radial-lines', testData.lineCount);
      break;
  }
  
  // Add event listeners to answer buttons
  document.querySelectorAll('.vision-answer').forEach(button => {
    button.addEventListener('click', (e) => {
      const answer = e.target.dataset.answer;
      
      // Submit answer to test manager
      const result = app.tests.vision.submitAnswer(answer);
      
      // Highlight selected answer
      document.querySelectorAll('.vision-answer').forEach(btn => {
        btn.style.backgroundColor = btn === e.target ? '#818cf8' : '';
        btn.style.color = btn === e.target ? 'white' : '';
      });
      
      // Auto-advance after short delay
      setTimeout(() => advanceVisionTest(), 800);
    });
  });
  
  // Disable next button until answer is selected
  nextButton.disabled = true;
}

function displayVisionResults(results) {
  const testContainer = document.getElementById('vision-test-container');
  const resultsContainer = document.getElementById('results-vision');
  
  // Show results in test area
  testContainer.innerHTML = `
    <div class="test-results">
      <h4>${results.testType === 'acuity' ? 'Visual Acuity Results' : 
            results.testType === 'color' ? 'Color Vision Results' : 
            'Astigmatism Test Results'}</h4>
      ${results.testType === 'acuity' ? 
        `<p>You correctly identified ${results.correctCount} out of ${results.totalQuestions} characters.</p>
         <p>Best acuity level: ${results.bestAcuity}</p>` : 
        results.testType === 'color' ? 
        `<p>You correctly identified ${results.correctCount} out of ${results.totalQuestions} patterns.</p>` : 
        `<p>Astigmatism assessment: ${results.hasAstigmatism ? 'Possible astigmatism detected' : 'No significant astigmatism detected'}</p>`
      }
      <div class="alert-box alert-${results.alertLevel}">
        ${results.message}
      </div>
      <p class="disclaimer-note">This is not a substitute for a professional eye examination.</p>
    </div>
  `;
  
  // Update results container
  resultsContainer.innerHTML = `
    <h3>Vision Test Results</h3>
    <div class="result-item">
      <div class="result-header">
        <h4 class="result-title">${results.testType === 'acuity' ? 'Visual Acuity Test' : 
                                  results.testType === 'color' ? 'Color Vision Test' : 
                                  'Astigmatism Test'}</h4>
        <span class="result-timestamp">${new Date().toLocaleString()}</span>
      </div>
      <div class="result-details">
        ${results.testType === 'acuity' ? 
          `<div class="detail-row">
            <span class="detail-label">Score:</span>
            <span class="detail-value">${results.correctCount}/${results.totalQuestions} correct</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Best Acuity:</span>
            <span class="detail-value">${results.bestAcuity}</span>
          </div>` : 
          results.testType === 'color' ? 
          `<div class="detail-row">
            <span class="detail-label">Score:</span>
            <span class="detail-value">${results.correctCount}/${results.totalQuestions} correct</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Color Vision:</span>
            <span class="detail-value">${results.category}</span>
          </div>` : 
          `<div class="detail-row">
            <span class="detail-label">Astigmatism:</span>
            <span class="detail-value">${results.hasAstigmatism ? 'Possible' : 'Not detected'}</span>
          </div>
          ${results.hasAstigmatism && results.direction ? 
            `<div class="detail-row">
              <span class="detail-label">Direction:</span>
              <span class="detail-value">${results.direction}</span>
            </div>` : 
            ''
          }`
        }
        <div class="alert-box alert-${results.alertLevel}" style="margin-top: 12px">
          ${results.message}
        </div>
      </div>
    </div>
  `;
  
  // Store results
  app.results.vision.unshift({
    timestamp: new Date().toLocaleString(),
    testType: results.testType,
    results: results
  });
  
  // Limit stored results
  if (app.results.vision.length > 10) {
    app.results.vision.pop();
  }
}

// ====================================
// Hearing Test Module Implementation
// ====================================

function testAudioOutput() {
  // Initialize audio context if needed
  app.tests.hearing.initialize().then(() => {
    // Play a test tone
    app.tests.hearing.playTone(1000, 20, 1);
  }).catch(error => {
    console.error('Error playing test tone:', error);
    alert('Error playing test tone: ' + error.message);
  });
}

function startHearingTest() {
  const frequencyTest = document.getElementById('frequency-test');
  const startButton = document.getElementById('start-hearing-test');
  
  // Disable start button
  startButton.disabled = true;
  startButton.textContent = 'Test in Progress...';
  
  // Start the test
  app.tests.hearing.startTest().then(testState => {
    displayHearingTestState(testState);
  }).catch(error => {
    console.error('Error starting hearing test:', error);
    alert('Error starting hearing test: ' + error.message);
    startButton.disabled = false;
  });
}

function displayHearingTestState(state) {
  const frequencyTest = document.getElementById('frequency-test');
  
  if (state.status === 'playing') {
    // Display current test state
    frequencyTest.innerHTML = `
      <h4>Frequency Hearing Test</h4>
      <p>Testing frequency: ${state.frequency} Hz</p>
      <p>Press the button when you hear the tone.</p>
      <div class="hearing-controls">
        <button id="heard-tone" class="primary-button">I Hear The Tone</button>
        <button id="cant-hear" class="secondary-button">I Cannot Hear Anything</button>
      </div>
      <div class="progress-indicator">
        <p>Progress: ${state.frequencyIndex + 1}/${FREQUENCIES.length}</p>
      </div>
    `;
    
    // Add listeners
    document.getElementById('heard-tone').addEventListener('click', () => recordHearingResponse(true));
    document.getElementById('cant-hear').addEventListener('click', () => recordHearingResponse(false));
  } else if (state.status === 'complete') {
    // Test is complete, show results
    displayHearingResults(state);
  }
}

function recordHearingResponse(heard) {
  // Record the response
  app.tests.hearing.respondToTone(heard).then(nextState => {
    // Show next frequency or results
    displayHearingTestState(nextState);
  }).catch(error => {
    console.error('Error recording hearing response:', error);
  });
}

function displayHearingResults(results) {
  const frequencyTest = document.getElementById('frequency-test');
  const resultsContainer = document.getElementById('results-hearing');
  const startButton = document.getElementById('start-hearing-test');
  
  // Enable the start button again
  startButton.disabled = false;
  startButton.textContent = 'Start Hearing Test';
  
  // Show results in test area
  frequencyTest.innerHTML = `
    <h4>Hearing Test Results</h4>
    <div class="alert-box alert-${results.alertLevel}">
      <strong>${results.category}</strong>
      <p>${results.description}</p>
    </div>
    <div class="hearing-details">
      <h5>Frequency Thresholds:</h5>
      <table class="threshold-table">
        <tr>
          <th>Frequency (Hz)</th>
          <th>Threshold (dB)</th>
        </tr>
        ${Object.entries(results.thresholds).map(([freq, threshold]) => `
          <tr>
            <td>${freq}</td>
            <td>${threshold === null ? 'Not measured' : 
                  threshold === '>60' ? 'Above 60 dB' : 
                  `${threshold} dB`}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    <p class="disclaimer-note">This is a simple screening test. For a comprehensive hearing evaluation, please consult an audiologist.</p>
    <button id="restart-hearing-test" class="primary-button">Test Again</button>
  `;
  
  // Add listener for restart button
  document.getElementById('restart-hearing-test').addEventListener('click', () => {
    app.tests.hearing.reset();
    startButton.disabled = false;
  });
  
  // Update result container
  resultsContainer.innerHTML = `
    <h3>Hearing Test Results</h3>
    <div class="result-item">
      <div class="result-header">
        <h4 class="result-title">Frequency Hearing Test</h4>
        <span class="result-timestamp">${new Date().toLocaleString()}</span>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value">${results.category}</span>
        </div>
        <div class="alert-box alert-${results.alertLevel}" style="margin-top: 12px">
          ${results.description}
        </div>
      </div>
    </div>
  `;
  
  // Store results
  app.results.hearing.unshift({
    timestamp: new Date().toLocaleString(),
    category: results.category,
    results: results
  });
  
  // Limit stored results
  if (app.results.hearing.length > 10) {
    app.results.hearing.pop();
  }
}

// ====================================
// Vitals Module Implementation
// ====================================

function toggleVitalsMeasurement() {
  const startButton = document.getElementById('start-vitals');
  const timer = document.getElementById('measurement-time');
  const instructions = document.getElementById('pulse-instructions');
  const pulseCircle = document.querySelector('.pulse-circle');
  
  if (app.tests.vitals.measuring) {
    // Stop measurement
    stopVitalsMeasurement();
  } else {
    // Start measurement
    startVitalsMeasurement();
  }
}

function startVitalsMeasurement() {
  const startButton = document.getElementById('start-vitals');
  const timer = document.getElementById('measurement-time');
  const instructions = document.getElementById('pulse-instructions');
  const pulseCircle = document.querySelector('.pulse-circle');
  
  // Update UI
  startButton.textContent = 'Stop Measurement';
  instructions.textContent = 'Place fingertip over camera lens and hold steady';
  pulseCircle.classList.add('pulse-animation');
  
  // Start measurement in the processor
  app.tests.vitals.startMeasurement();
  
  // Start the timer
  app.timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - app.tests.vitals.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    timer.textContent = `${minutes}:${seconds}`;
    
    // Update instructions based on time
    if (elapsedSeconds > 5 && elapsedSeconds < 10) {
      instructions.textContent = 'Good, keep holding steady...';
    } else if (elapsedSeconds >= 10 && elapsedSeconds < 20) {
      instructions.textContent = 'Collecting pulse data...';
    } else if (elapsedSeconds >= 20) {
      instructions.textContent = 'Almost done, keep holding...';
    }
    
    // Auto-stop after 30 seconds
    if (elapsedSeconds >= 30) {
      stopVitalsMeasurement();
    }
  }, 1000);
  
  // Start analyzing frames
  startPulseAnalysis();
}

function stopVitalsMeasurement() {
  const startButton = document.getElementById('start-vitals');
  const instructions = document.getElementById('pulse-instructions');
  const pulseCircle = document.querySelector('.pulse-circle');
  
  // Update UI
  startButton.textContent = 'Start Heart Rate Measurement';
  instructions.textContent = 'Place your fingertip over the camera lens';
  pulseCircle.classList.remove('pulse-animation');
  
  // Stop the timer
  clearInterval(app.timerInterval);
  
  // Stop analysis
  clearInterval(app.analysisInterval);
  
  // Stop measurement and get results
  const results = app.tests.vitals.stopMeasurement();
  
  // Generate and show report
  const report = app.tests.vitals.generateReport();
  displayVitalsResults(report);
}

function startPulseAnalysis() {
  const video = document.getElementById('video-vitals');
  const canvas = document.getElementById('canvas-processor');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 100;
  canvas.height = 100;
  
  // Set up analysis interval
  app.analysisInterval = setInterval(() => {
    if (!app.tests.vitals.measuring) {
      clearInterval(app.analysisInterval);
      return;
    }
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Process frame
    const frameResult = app.tests.vitals.processFrame(imageData);
    
    // Update UI if we have a heart rate
    if (frameResult.heartRate) {
      document.getElementById('pulse-instructions').textContent = 
        `Measuring: ${frameResult.heartRate} BPM (Signal quality: ${Math.round(frameResult.signalQuality * 100)}%)`;
    }
    
  }, 33); // ~30fps
}

function displayVitalsResults(results) {
  const resultsContainer = document.getElementById('results-vitals');
  
  // Format results html
  if (results.heartRate) {
    // Valid heart rate detected
    const alertClass = results.confidence === 'high' ? 'alert-success' : 
                       results.confidence === 'medium' ? 'alert-info' : 
                       'alert-warning';
    
    resultsContainer.innerHTML = `
      <h3>Vital Signs Results</h3>
      <div class="result-item">
        <div class="result-header">
          <h4 class="result-title">Heart Rate Measurement</h4>
          <span class="result-timestamp">${new Date().toLocaleString()}</span>
        </div>
        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Heart Rate:</span>
            <span class="detail-value">${results.heartRate} BPM</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value">${results.category}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Confidence:</span>
            <span class="detail-value">${results.confidence}</span>
          </div>
          <div class="alert-box ${alertClass}" style="margin-top: 12px">
            ${results.message}
          </div>
        </div>
      </div>
    `;
    
    // Store results
    app.results.vitals.unshift({
      timestamp: new Date().toLocaleString(),
      heartRate: results.heartRate,
      confidence: results.confidence,
      category: results.category
    });
    
    // Limit stored results
    if (app.results.vitals.length > 10) {
      app.results.vitals.pop();
    }
  } else {
    // No valid heart rate detected
    resultsContainer.innerHTML = `
      <h3>Vital Signs Results</h3>
      <div class="result-item">
        <div class="result-header">
          <h4 class="result-title">Heart Rate Measurement</h4>
          <span class="result-timestamp">${new Date().toLocaleString()}</span>
        </div>
        <div class="result-details">
          <div class="alert-box alert-warning" style="margin-top: 12px">
            ${results.message}
          </div>
          <p>Tips for better measurements:</p>
          <ul>
            <li>Ensure good lighting conditions</li>
            <li>Place your fingertip directly over the camera lens</li>
            <li>Turn on the flash on phones for better results</li>
            <li>Hold your finger steady during measurement</li>
            <li>Try different fingers if needed</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// ====================================
// Range of Motion Module Implementation
// ====================================

function selectMotionJoint(joint) {
  // Update UI to show selected joint
  document.querySelectorAll('.motion-option').forEach(option => {
    option.classList.toggle('active', option.dataset.motion === joint);
  });
  
  // Set the joint in the analyzer
  const config = app.tests.motion.setJointAndMovement(joint);
  
  // Update instructions
  document.getElementById('motion-instructions').textContent = 
    `Place device to view your ${joint} joint. ${config.description}`;
  
  // Enable start button
  document.getElementById('start-motion').disabled = false;
  document.getElementById('stop-motion').disabled = true;
}

function startMotionRecording() {
  if (!app.tests.motion.selectedJoint) {
    alert('Please select a joint first');
    return;
  }
  
  // Check if model is loaded
  if (app.modelStatus.motion !== 'loaded') {
    alert('Motion tracking model is still loading. Please wait.');
    return;
  }
  
  // Update UI
  document.getElementById('start-motion').disabled = true;
  document.getElementById('stop-motion').disabled = false;
  document.getElementById('motion-instructions').textContent = 
    `Move your ${app.tests.motion.selectedJoint} through its full range of motion slowly`;
  
  // Start recording
  app.tests.motion.startRecording();
  
  // Set up a canvas for visualization if needed
  setupMotionCanvas();
}

function stopMotionRecording() {
  // Stop recording and get results
  const results = app.tests.motion.stopRecording();
  
  // Update UI
  document.getElementById('start-motion').disabled = false;
  document.getElementById('stop-motion').disabled = true;
  document.getElementById('motion-instructions').textContent = `Recording complete`;
  
  // Display results
  displayMotionResults(results);
}

function setupMotionCanvas() {
  const video = document.getElementById('video-motion');
  const container = document.querySelector('.camera-container');
  
  // Create canvas for skeleton visualization if it doesn't exist
  let canvas = document.getElementById('motion-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'motion-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);
  }
  
  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Start processing frames
  processMotionFrames();
}

function processMotionFrames() {
  const video = document.getElementById('video-motion');
  const canvas = document.getElementById('motion-canvas');
  
  if (!app.tests.motion.isRecording) return;
  
  // Process the current frame
  app.tests.motion.processFrame(video)
    .then(result => {
      // Draw skeleton visualization
      if (result.keypoints && canvas) {
        app.tests.motion.drawSkeleton(canvas, {keypoints: result.keypoints}, app.tests.motion.selectedJoint);
      }
      
      // Update UI with current angle if available
      if (result.currentAngle) {
        document.getElementById('motion-instructions').textContent = 
          `Current angle: ${Math.round(result.currentAngle)}° - Continue through full range of motion`;
      }
      
      // If still recording, request next frame
      if (app.tests.motion.isRecording) {
        requestAnimationFrame(processMotionFrames);
      }
    })
    .catch(error => {
      console.error('Error processing motion frame:', error);
      if (app.tests.motion.isRecording) {
        requestAnimationFrame(processMotionFrames);
      }
    });
}

function displayMotionResults(results) {
  const resultsContainer = document.getElementById('results-motion');
  
  // Check if we have valid results
  if (results.status !== 'complete') {
    resultsContainer.innerHTML = `
      <h3>Motion Assessment Results</h3>
      <div class="result-item">
        <div class="result-header">
          <h4 class="result-title">Error</h4>
          <span class="result-timestamp">${new Date().toLocaleString()}</span>
        </div>
        <div class="result-details">
          <div class="alert-box alert-warning">
            <p>Could not complete motion analysis. ${results.message}</p>
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  // Create result item
  resultsContainer.innerHTML = `
    <h3>Motion Assessment Results</h3>
    <div class="result-item">
      <div class="result-header">
        <h4 class="result-title">${formatLabel(results.joint)} ${formatLabel(results.movement)}</h4>
        <span class="result-timestamp">${new Date().toLocaleString()}</span>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Range of Motion:</span>
          <span class="detail-value">${results.rangeOfMotion.toFixed(1)}°</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Expected Range:</span>
          <span class="detail-value">${results.romPercentage.toFixed(1)}% of normal</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Movement Quality:</span>
          <span class="detail-value">${results.movementQuality}</span>
        </div>
        <div class="alert-box alert-${results.alertLevel}" style="margin-top: 12px">
          <strong>${results.category}</strong>
          <p>${results.message}</p>
        </div>
      </div>
    </div>
  `;
  
  // Store results
  app.results.motion.unshift({
    timestamp: new Date().toLocaleString(),
    joint: results.joint,
    movement: results.movement,
    rangeOfMotion: results.rangeOfMotion,
    category: results.category
  });
  
  // Limit stored results
  if (app.results.motion.length > 10) {
    app.results.motion.pop();
  }
}

// ====================================
// Helper Functions 
// ====================================

function formatLabel(label) {
  // Convert snake_case or kebab-case to Title Case
  return label
    .replace(/_|-/g, ' ')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

// Create simulated Ishihara plate (modified from original)
function createSimulatedIshiharaPlate(elementId, number, colors, bgColors) {
  const plate = document.getElementById(elementId);
  
  // Set plate styles
  Object.assign(plate.style, {
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    position: 'relative',
    overflow: 'hidden',
    margin: '0 auto 20px auto'
  });
  
  // Clear any existing content
  plate.innerHTML = '';
  
  // Add background dots
  for (let i = 0; i < 300; i++) {
    const dot = document.createElement('div');
    const size = 5 + Math.random() * 15;
    
    Object.assign(dot.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: bgColors[Math.floor(Math.random() * bgColors.length)],
      position: 'absolute',
      left: `${Math.random() * 250}px`,
      top: `${Math.random() * 250}px`
    });
    
    plate.appendChild(dot);
  }
  
  // Create dots for the number pattern (simplified implementation)
  const digits = number.toString().split('');
  const centerX = 125;
  const centerY = 125;
  
  digits.forEach((digit, index) => {
    let offsetX = (index - (digits.length - 1) / 2) * 50;
    
    // Different patterns for different digits
    let points = [];
    
    // Create character pattern points (simplified)
    if (digit === '0' || digit === '6' || digit === '8' || digit === '9') {
      // Circle for 0,6,8,9
      for (let angle = 0; angle < 360; angle += 20) {
        const radian = angle * Math.PI / 180;
        points.push({
          x: Math.cos(radian) * 30 + centerX + offsetX,
          y: Math.sin(radian) * 40 + centerY
        });
      }
    } else {
      // Simplified shapes for other digits
      for (let y = centerY - 40; y <= centerY + 40; y += 10) {
        for (let x = centerX + offsetX - 20; x <= centerX + offsetX + 20; x += 10) {
          // Different shapes based on digit
          const dx = x - (centerX + offsetX);
          const dy = y - centerY;
          
          if ((digit === '1' && Math.abs(dx) < 5) ||
              (digit === '7' && (dy < -15 || (dy >= -15 && dx > dy + 40))) ||
              (digit === '2' && ((dy < 0 && dx > -15) || (dy >= 0 && dx < 15))) ||
              (digit === '3' && ((Math.abs(dy) > 15 && dx > 0) || Math.abs(dy) < 10)) ||
              (digit === '4' && (dx > 10 || dy > -5)) ||
              (digit === '5' && ((dy < -15 && dx < 10) || (dy >= -15 && dx > 0)))) {
            points.push({ x, y });
          }
        }
      }
    }
    
    // Create dots for the pattern
    points.forEach(point => {
      if (point.x >= 0 && point.x <= 250 && point.y >= 0 && point.y <= 250) {
        const dot = document.createElement('div');
        const size = 5 + Math.random() * 10;
        
        Object.assign(dot.style, {
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          position: 'absolute',
          left: `${point.x - size/2}px`,
          top: `${point.y - size/2}px`
        });
        
        plate.appendChild(dot);
      }
    });
  });
}

// Create radial lines for astigmatism test
function createRadialLines(elementId, lineCount = 18) {
  const container = document.getElementById(elementId);
  
  // Set container styles
  Object.assign(container.style, {
    width: '300px',
    height: '300px',
    position: 'relative',
    margin: '20px auto'
  });
  
  // Clear any existing content
  container.innerHTML = '';
  
  const centerX = 150;
  const centerY = 150;
  const radius = 140;
  
  // Draw radial lines
  for (let angle = 0; angle < 180; angle += (180 / lineCount)) {
    const line = document.createElement('div');
    
    Object.assign(line.style, {
      position: 'absolute',
      width: `${radius * 2}px`,
      height: '2px',
      backgroundColor: '#000',
      transformOrigin: 'center',
      transform: `translate(-50%, -50%) rotate(${angle}deg)`,
      left: '50%',
      top: '50%'
    });
    
    container.appendChild(line);
  }
}

// ====================================
// Event Registration and Module Switching
// ====================================

function setupEventListeners() {
  // Module navigation
  document.querySelectorAll('#module-tabs li').forEach(tab => {
    tab.addEventListener('click', () => switchModule(tab.dataset.module));
  });

  // Camera controls
  document.getElementById('switch-camera').addEventListener('click', switchCamera);
  document.getElementById('capture-skin').addEventListener('click', captureSkinImageHandler);
  document.getElementById('capture-wound').addEventListener('click', captureWoundImageHandler);

  // Vision test buttons
  document.querySelectorAll('.test-option').forEach(option => {
    option.addEventListener('click', () => selectVisionTest(option.dataset.test));
  });
  document.getElementById('next-vision-step').addEventListener('click', advanceVisionTest);

  // Hearing test buttons
  document.getElementById('test-sound').addEventListener('click', testAudioOutput);
  document.getElementById('start-hearing-test').addEventListener('click', startHearingTest);

  // Vitals measurement
  document.getElementById('start-vitals').addEventListener('click', toggleVitalsMeasurement);

  // Range of motion
  document.querySelectorAll('.motion-option').forEach(option => {
    option.addEventListener('click', () => selectMotionJoint(option.dataset.motion));
  });
  document.getElementById('start-motion').addEventListener('click', startMotionRecording);
  document.getElementById('stop-motion').addEventListener('click', stopMotionRecording);
}

// Export key functions for debugging and testing
window.app = app;