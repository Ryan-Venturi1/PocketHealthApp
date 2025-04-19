// app.js - HealthCompanion Main Application Logic

// Import modules
import { loadSkinModel, analyzeSkinImage, captureSkinImage, warmupModel } from './modules/skin-analysis.js';
import { loadWoundModel, analyzeWoundImage, captureWoundImage } from './modules/wound-analysis.js';
import { VisionTestManager } from './modules/vision-tests.js';
import { HearingTestManager } from './modules/hearing-tests.js';
import { VitalsProcessor } from './modules/vitals-processing.js';
import { MotionAnalyzer } from './modules/motion-analysis.js';
import { AIAssistant } from './modules/ai-assistant.js';
import { UserManager } from './modules/user-manager.js';

// Global application state
const app = {
  currentPage: 'dashboard',
  activeModule: null,
  camera: {
    stream: null,
    active: false,
    facingMode: 'environment' // 'environment' is back camera, 'user' is front camera
  },
  models: {
    skin: null,
    wound: null,
    motion: null
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
  assistant: null,
  userManager: new UserManager(),
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
  // Check if user is logged in
  const isLoggedIn = app.userManager.isAuthenticated();
  
  if (!isLoggedIn) {
    // Redirect to login page if not in the auth page already
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
      return;
    }
  }
  
  // Initialize application
  setupEventListeners();
  initNavigation();
  initNotifications();
  
  // Load user data for the dashboard
  if (isLoggedIn) {
    loadUserData();
    loadModels();
    initializeAssistant();
  }
});

// ====================================
// Navigation and UI Management
// ====================================

function initNavigation() {
  // Set up sidebar navigation
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = e.currentTarget.getAttribute('href').substring(1); // Remove # from href
      navigateTo(targetPage);
    });
  });
  
  // Mobile sidebar toggle
  const sidebarOpen = document.getElementById('sidebar-open');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebarOpen) {
    sidebarOpen.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }
  
  if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }
  
  // Set up quick action links
  document.querySelectorAll('.action-item').forEach(action => {
    action.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = e.currentTarget.getAttribute('href').substring(1); // Remove # from href
      navigateTo(targetPage);
    });
  });
  
  // Quick buttons in header
  const quickTestBtn = document.getElementById('quick-test');
  const talkAssistantBtn = document.getElementById('talk-assistant');
  
  if (quickTestBtn) {
    quickTestBtn.addEventListener('click', () => {
      navigateTo('health-tests');
    });
  }
  
  if (talkAssistantBtn) {
    talkAssistantBtn.addEventListener('click', () => {
      navigateTo('health-assistant');
    });
  }
  
  // Feeling buttons on dashboard
  document.querySelectorAll('.feel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const feeling = e.currentTarget.dataset.feeling;
      recordUserFeeling(feeling);
    });
  });
  
  // Check URL hash for navigation
  const hashPage = window.location.hash.substring(1);
  if (hashPage) {
    navigateTo(hashPage);
  }
}

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page-content').forEach(pageContent => {
    pageContent.classList.remove('active');
  });
  
  // Update active nav item
  document.querySelectorAll('.sidebar-nav li').forEach(item => {
    item.classList.remove('active');
  });
  
  // Show selected page
  let pageElement;
  let sidebarItem;
  
  // Handle main pages
  if (page.includes('/')) {
    // This is a subpage (e.g., health-tests/skin)
    const [mainPage, subPage] = page.split('/');
    pageElement = document.getElementById(`${mainPage}-page`);
    sidebarItem = document.querySelector(`.sidebar-nav li a[href="#${mainPage}"]`).parentElement;
    
    // Load the appropriate module
    loadModule(subPage);
  } else {
    // This is a main page
    pageElement = document.getElementById(`${page}-page`);
    sidebarItem = document.querySelector(`.sidebar-nav li a[href="#${page}"]`).parentElement;
    
    // If this is the health tests page, we need to initialize the modules list
    if (page === 'health-tests') {
      loadHealthTestsList();
    }
  }
  
  if (pageElement && sidebarItem) {
    pageElement.classList.add('active');
    sidebarItem.classList.add('active');
    document.getElementById('current-page-title').textContent = formatPageTitle(page);
    
    // Update URL
    window.location.hash = `#${page}`;
    
    // Update app state
    app.currentPage = page;
  }
}

function formatPageTitle(page) {
  if (page.includes('/')) {
    const [mainPage, subPage] = page.split('/');
    return `${formatString(subPage)} Test`;
  }
  
  return formatString(page);
}

function formatString(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ====================================
// User Data and Profile Management
// ====================================

function loadUserData() {
  const userData = app.userManager.getCurrentUser();
  
  if (userData) {
    // Update user info in sidebar
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-email').textContent = userData.email;
    document.getElementById('welcome-name').textContent = userData.name.split(' ')[0];
    
    // Load user's avatar if available
    if (userData.avatar) {
      document.getElementById('user-avatar').src = userData.avatar;
    }
    
    // Load user's health metrics
    loadHealthMetrics(userData.id);
    
    // Load recent activity
    loadRecentActivity(userData.id);
    
    // Load reminders
    loadReminders(userData.id);
  }
}

function loadHealthMetrics(userId) {
  // In a real application, this would fetch data from the server
  // For now, we'll use the most recent test results from the app state
  
  const healthMetrics = document.querySelector('.metrics-list');
  
  // Example implementation - replace with actual data in production
  if (app.results.vitals.length > 0) {
    const latestHeartRate = app.results.vitals[0];
    updateMetric(healthMetrics, 'Heart Rate', `${latestHeartRate.heartRate} bpm`, latestHeartRate.timestamp);
  }
  
  if (app.results.vision.length > 0) {
    const latestVision = app.results.vision[0];
    updateMetric(healthMetrics, 'Vision', latestVision.results.bestAcuity, latestVision.timestamp);
  }
  
  if (app.results.hearing.length > 0) {
    const latestHearing = app.results.hearing[0];
    updateMetric(healthMetrics, 'Hearing', latestHearing.category, latestHearing.timestamp);
  }
}

function updateMetric(container, metricName, value, timestamp) {
  const metricItems = container.querySelectorAll('.metric-item');
  
  for (const item of metricItems) {
    const title = item.querySelector('h4').textContent;
    
    if (title === metricName) {
      item.querySelector('p').innerHTML = value;
      item.querySelector('.metric-date').textContent = `Last check: ${formatDate(timestamp)}`;
      return;
    }
  }
}

function loadRecentActivity(userId) {
  // In a real application, this would fetch data from the server
  // For now, we'll use the most recent test results from all modules
  
  const activityList = document.querySelector('.activity-list');
  const allResults = [
    ...app.results.skin.map(result => ({ ...result, type: 'skin' })),
    ...app.results.wound.map(result => ({ ...result, type: 'wound' })),
    ...app.results.vision.map(result => ({ ...result, type: 'vision' })),
    ...app.results.hearing.map(result => ({ ...result, type: 'hearing' })),
    ...app.results.vitals.map(result => ({ ...result, type: 'vitals' })),
    ...app.results.motion.map(result => ({ ...result, type: 'motion' }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);
  
  // Clear existing activities
  activityList.innerHTML = '';
  
  // Add recent activities
  allResults.forEach(result => {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    let icon, title, details;
    
    switch (result.type) {
      case 'skin':
        icon = 'skin';
        title = 'Skin Analysis Completed';
        details = `Result: ${result.results.results[0].display}`;
        break;
      case 'wound':
        icon = 'wound';
        title = 'Wound Assessment Completed';
        details = `Result: ${result.results.classResults[0].display}`;
        break;
      case 'vision':
        icon = 'vision-test';
        title = 'Vision Test Completed';
        details = `Result: ${result.results.bestAcuity || result.results.category}`;
        break;
      case 'hearing':
        icon = 'hearing-test';
        title = 'Hearing Test Completed';
        details = `Result: ${result.category}`;
        break;
      case 'vitals':
        icon = 'heart';
        title = 'Heart Rate Measured';
        details = `Result: ${result.heartRate} bpm - ${result.category}`;
        break;
      case 'motion':
        icon = 'motion';
        title = `${formatString(result.joint)} Motion Test`;
        details = `Range: ${result.rangeOfMotion.toFixed(1)}° (${result.category})`;
        break;
    }
    
    activityItem.innerHTML = `
      <div class="activity-icon">
        <img src="assets/images/icons/${icon}.svg" alt="${title}">
      </div>
      <div class="activity-details">
        <h4>${title}</h4>
        <p>${details}</p>
        <span class="activity-date">${formatDate(result.timestamp)} - ${formatTime(result.timestamp)}</span>
      </div>
    `;
    
    activityList.appendChild(activityItem);
  });
}

function loadReminders(userId) {
  // In a real application, this would fetch reminders from the server
  // For the demo, we'll use hardcoded reminders
  
  // Implementation would be added in a production version
}

function recordUserFeeling(feeling) {
  // In a real application, this would send the feeling to the server
  console.log(`User is feeling: ${feeling}`);
  
  // Show a response based on feeling
  let message;
  switch (feeling) {
    case 'great':
      message = "That's wonderful! Keep up the healthy habits.";
      break;
    case 'good':
      message = "Glad to hear you're doing well today!";
      break;
    case 'okay':
      message = "Hope your day improves. Remember self-care is important.";
      break;
    case 'bad':
      message = "I'm sorry to hear that. Would you like to talk to our AI assistant about how you're feeling?";
      break;
  }
  
  showToast(message);
  
  // If feeling bad, suggest talking to the assistant
  if (feeling === 'bad') {
    setTimeout(() => {
      const talkBtn = document.createElement('button');
      talkBtn.className = 'btn-primary';
      talkBtn.textContent = 'Talk to Assistant';
      talkBtn.addEventListener('click', () => {
        navigateTo('health-assistant');
      });
      
      showToast("Our AI assistant can help recommend tests or provide guidance.", 5000, talkBtn);
    }, 2000);
  }
}

// ====================================
// Notifications Management
// ====================================

function initNotifications() {
  const notificationsToggle = document.getElementById('notifications-toggle');
  const notificationsPanel = document.getElementById('notifications-panel');
  const notificationsClose = document.getElementById('notifications-close');
  const markAllRead = document.querySelector('.mark-all-read');
  
  if (notificationsToggle && notificationsPanel) {
    notificationsToggle.addEventListener('click', () => {
      notificationsPanel.classList.toggle('open');
      
      // Also open backdrop
      document.getElementById('modal-backdrop').classList.toggle('open');
    });
    
    notificationsClose.addEventListener('click', () => {
      notificationsPanel.classList.remove('open');
      document.getElementById('modal-backdrop').classList.remove('open');
    });
    
    // Close when clicking outside
    document.getElementById('modal-backdrop').addEventListener('click', () => {
      notificationsPanel.classList.remove('open');
      document.getElementById('modal-backdrop').classList.remove('open');
    });
    
    // Mark all as read
    markAllRead.addEventListener('click', () => {
      document.querySelectorAll('.notification-item.unread').forEach(item => {
        item.classList.remove('unread');
      });
      
      // Hide notification indicator
      document.querySelector('.notification-indicator').style.display = 'none';
    });
  }
}

// ====================================
// Health Tests Modules Management
// ====================================

function loadHealthTestsList() {
  const healthTestsPage = document.getElementById('health-tests-page');
  
  healthTestsPage.innerHTML = `
    <div class="tests-container">
      <h3>Available Health Tests</h3>
      <p class="module-description">Select a test to begin your health assessment</p>
      
      <div class="tests-grid">
        <div class="test-card" data-test="skin">
          <div class="test-icon skin">
            <img src="assets/images/icons/skin.svg" alt="Skin Analysis">
          </div>
          <div class="test-info">
            <h4>Skin Analysis</h4>
            <p>Analyze skin conditions, lesions, and rashes</p>
          </div>
        </div>
        
        <div class="test-card" data-test="wound">
          <div class="test-icon wound">
            <img src="assets/images/icons/wound.svg" alt="Wound Assessment">
          </div>
          <div class="test-info">
            <h4>Wound Assessment</h4>
            <p>Check wounds for signs of infection or healing</p>
          </div>
        </div>
        
        <div class="test-card" data-test="vision">
          <div class="test-icon vision-test">
            <img src="assets/images/icons/vision-test.svg" alt="Vision Tests">
          </div>
          <div class="test-info">
            <h4>Vision Tests</h4>
            <p>Basic vision screening tests and eye exams</p>
          </div>
        </div>
        
        <div class="test-card" data-test="hearing">
          <div class="test-icon hearing-test">
            <img src="assets/images/icons/hearing-test.svg" alt="Hearing Tests">
          </div>
          <div class="test-info">
            <h4>Hearing Tests</h4>
            <p>Hearing screening and frequency tests</p>
          </div>
        </div>
        
        <div class="test-card" data-test="vitals">
          <div class="test-icon vitals">
            <img src="assets/images/icons/vitals.svg" alt="Vital Signs">
          </div>
          <div class="test-info">
            <h4>Vital Signs</h4>
            <p>Measure heart rate and other vital metrics</p>
          </div>
        </div>
        
        <div class="test-card" data-test="motion">
          <div class="test-icon motion">
            <img src="assets/images/icons/motion.svg" alt="Range of Motion">
          </div>
          <div class="test-info">
            <h4>Range of Motion</h4>
            <p>Analyze joint flexibility and movement range</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners to test cards
  document.querySelectorAll('.test-card').forEach(card => {
    card.addEventListener('click', () => {
      const testType = card.dataset.test;
      navigateTo(`health-tests/${testType}`);
    });
  });
}

function loadModule(moduleType) {
  const healthTestsPage = document.getElementById('health-tests-page');
  app.activeModule = moduleType;
  
  switch (moduleType) {
    case 'skin':
      loadSkinModule(healthTestsPage);
      break;
    case 'wound':
      loadWoundModule(healthTestsPage);
      break;
    case 'vision':
      loadVisionModule(healthTestsPage);
      break;
    case 'hearing':
      loadHearingModule(healthTestsPage);
      break;
    case 'vitals':
      loadVitalsModule(healthTestsPage);
      break;
    case 'motion':
      loadMotionModule(healthTestsPage);
      break;
    default:
      // Go back to the tests list
      loadHealthTestsList();
      return;
  }
  
  // Initialize camera if the module needs it
  if (['skin', 'wound', 'vitals', 'motion'].includes(moduleType)) {
    initCamera(moduleType);
  }
  
  // Add back button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn-secondary back-btn';
  backBtn.innerHTML = '<img src="assets/images/icons/arrow-left.svg" alt="Back"> Back to Tests';
  backBtn.addEventListener('click', () => {
    stopCamera();
    navigateTo('health-tests');
  });
  
  healthTestsPage.insertBefore(backBtn, healthTestsPage.firstChild);
}

// Module loading functions (implementation for each health test module)
function loadSkinModule(container) {
  container.innerHTML = `
    <h3>Skin Condition Analysis</h3>
    <p class="module-description">Analyze skin lesions, rashes, and other conditions. Capture a clear image of the affected area.</p>
    
    <div class="camera-container">
      <video id="video-skin" autoplay playsinline></video>
      <div id="focus-indicator" class="focus-indicator"></div>
      <div id="guidance-container" class="guidance-container">
        <div id="guidance-message" class="guidance-message">Aligning camera...</div>
        <div class="guidance-progress">
          <div id="guidance-progress-bar" class="guidance-progress-bar" style="width: 0%"></div>
        </div>
      </div>
    </div>
    
    <div class="button-container">
      <button id="capture-skin" class="btn-primary">Capture Image</button>
      <button id="switch-camera" class="btn-secondary">Switch Camera</button>
    </div>
    
    <div id="results-skin" class="results-container">
      <h3>Analysis Results</h3>
      <p class="no-results">No analyses yet. Capture an image to begin.</p>
    </div>
  `;
  
  // Set up event listeners
  document.getElementById('capture-skin').addEventListener('click', captureSkinImageHandler);
  document.getElementById('switch-camera').addEventListener('click', switchCamera);
}

function loadWoundModule(container) {
  container.innerHTML = `
    <h3>Wound Assessment</h3>
    <p class="module-description">Analyze cuts and wounds for signs of infection or if stitches might be needed.</p>
    
    <div class="camera-container">
      <video id="video-wound" autoplay playsinline></video>
      <div class="reference-overlay">
        <div class="measurement-guide"></div>
      </div>
    </div>
    
    <div class="button-container">
      <button id="capture-wound" class="btn-primary">Capture Wound Image</button>
      <div class="wound-input-group">
        <label for="wound-age">When did the injury occur?</label>
        <select id="wound-age">
          <option value="0">Less than 6 hours ago</option>
          <option value="1">6-24 hours ago</option>
          <option value="2">1-3 days ago</option>
          <option value="3">More than 3 days ago</option>
        </select>
      </div>
    </div>
    
    <div id="results-wound" class="results-container">
      <h3>Wound Assessment</h3>
      <p class="no-results">No assessments yet. Capture an image to begin.</p>
    </div>
  `;
  
  // Set up event listeners
  document.getElementById('capture-wound').addEventListener('click', captureWoundImageHandler);
}

function loadVisionModule(container) {
  container.innerHTML = `
    <h3>Vision Screening Tests</h3>
    <p class="module-description">Basic vision screening tests. These are not a substitute for a comprehensive eye exam.</p>
    
    <div class="vision-test-selection">
      <button class="test-option" data-test="acuity">Visual Acuity</button>
      <button class="test-option" data-test="color">Color Vision</button>
      <button class="test-option" data-test="astigmatism">Astigmatism Test</button>
    </div>
    
    <div id="vision-test-container" class="vision-test-area">
      <div class="test-instructions">
        <p>Select a test to begin. Hold your device at arm's length for accurate results.</p>
      </div>
    </div>
    
    <div class="button-container">
      <button id="next-vision-step" class="btn-primary" disabled>Start Test</button>
    </div>
    
    <div id="results-vision" class="results-container">
      <h3>Vision Test Results</h3>
      <p class="no-results">No tests completed yet.</p>
    </div>
  `;
  
  // Set up event listeners
  document.querySelectorAll('.test-option').forEach(option => {
    option.addEventListener('click', () => {
      selectVisionTest(option.dataset.test);
    });
  });
  
  document.getElementById('next-vision-step').addEventListener('click', advanceVisionTest);
}

function loadHearingModule(container) {
  container.innerHTML = `
    <h3>Hearing Screening</h3>
    <p class="module-description">Basic hearing tests. Use headphones in a quiet environment for best results.</p>
    
    <div class="hearing-test-setup">
      <div class="setup-step active">
        <h4>Before You Begin</h4>
        <ul>
          <li>Put on headphones if available</li>
          <li>Find a quiet environment</li>
          <li>Set volume to a comfortable level</li>
        </ul>
        <button id="test-sound" class="btn-secondary">Test Your Sound</button>
      </div>
    </div>
    
    <div class="hearing-test-area">
      <div id="frequency-test" class="hearing-test">
        <h4>Frequency Hearing Test</h4>
        <p>Press the button when you hear a tone. We'll test different frequencies.</p>
        <button id="start-hearing-test" class="btn-primary">Start Hearing Test</button>
      </div>
    </div>
    
    <div id="results-hearing" class="results-container">
      <h3>Hearing Test Results</h3>
      <p class="no-results">No tests completed yet.</p>
    </div>
  `;
  
  // Set up event listeners
  document.getElementById('test-sound').addEventListener('click', testAudioOutput);
  document.getElementById('start-hearing-test').addEventListener('click', startHearingTest);
}

function loadVitalsModule(container) {
  container.innerHTML = `
    <h3>Vital Signs Measurement</h3>
    <p class="module-description">Estimate heart rate using your device's camera.</p>
    
    <div class="camera-container">
      <video id="video-vitals" autoplay playsinline></video>
      <div class="pulse-indicator">
        <div class="pulse-circle"></div>
        <p id="pulse-instructions">Place your fingertip over the camera lens</p>
      </div>
    </div>
    
    <div class="button-container">
      <button id="start-vitals" class="btn-primary">Start Heart Rate Measurement</button>
      <div id="measurement-time" class="measurement-timer">00:00</div>
    </div>
    
    <div id="results-vitals" class="results-container">
      <h3>Vital Signs Results</h3>
      <p class="no-results">No measurements yet.</p>
    </div>
  `;
  
  // Set up event listeners
  document.getElementById('start-vitals').addEventListener('click', toggleVitalsMeasurement);
}

function loadMotionModule(container) {
  container.innerHTML = `
    <h3>Range of Motion Assessment</h3>
    <p class="module-description">Analyze joint flexibility and movement range.</p>
    
    <div class="motion-selection">
      <button class="motion-option" data-motion="shoulder">Shoulder</button>
      <button class="motion-option" data-motion="elbow">Elbow</button>
      <button class="motion-option" data-motion="wrist">Wrist</button>
      <button class="motion-option" data-motion="knee">Knee</button>
      <button class="motion-option" data-motion="ankle">Ankle</button>
    </div>
    
    <div class="camera-container">
      <video id="video-motion" autoplay playsinline></video>
      <div class="motion-guide">
        <div id="motion-instructions">Select a joint to begin assessment</div>
      </div>
    </div>
    
    <div class="button-container">
      <button id="start-motion" class="btn-primary" disabled>Start Recording Motion</button>
      <button id="stop-motion" class="btn-secondary" disabled>Stop Recording</button>
    </div>
    
    <div id="results-motion" class="results-container">
      <h3>Motion Assessment Results</h3>
      <p class="no-results">No assessments yet.</p>
    </div>
  `;
  
  // Set up event listeners
  document.querySelectorAll('.motion-option').forEach(option => {
    option.addEventListener('click', () => {
      selectMotionJoint(option.dataset.motion);
    });
  });
  
  document.getElementById('start-motion').addEventListener('click', startMotionRecording);
  document.getElementById('stop-motion').addEventListener('click', stopMotionRecording);
}

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
  // In a real application, this would show a progress bar
  console.log(`Loading ${modelName} model: ${Math.round(progress.progress * 100)}%`);
}

function updateModelStatus(message, isError = false) {
  console.log(`Model status: ${message}`);
  // In a real application, this would update a status indicator in the UI
}

// ====================================
// Camera Handling
// ====================================

async function initCamera(moduleType) {
  try {
    // Check if we already have a stream
    if (app.camera.stream) {
      // We already have a stream, just change the video element
      const videoElement = document.getElementById(`video-${moduleType}`);
      if (videoElement) {
        videoElement.srcObject = app.camera.stream;
      }
      return;
    }
    
    // Request camera access
    const constraints = {
      video: {
        facingMode: app.camera.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    app.camera.stream = stream;
    app.camera.active = true;
    
    // Connect stream to video element
    const videoElement = document.getElementById(`video-${moduleType}`);
    if (videoElement) {
      videoElement.srcObject = stream;
      
      // Wait for video to be ready
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        updateCameraStatus('Camera ready');
      };
    }
  } catch (error) {
    console.error('Error accessing camera:', error);
    updateCameraStatus('Camera error', true);
    
    // Show error message
    showToast('Could not access camera. Please check permissions.', 5000);
  }
}

function stopCamera() {
  if (app.camera.stream) {
    app.camera.stream.getTracks().forEach(track => {
      track.stop();
    });
    app.camera.stream = null;
    app.camera.active = false;
    updateCameraStatus('Camera off');
  }
}

function switchCamera() {
  // Toggle between front and back camera
  app.camera.facingMode = app.camera.facingMode === 'environment' ? 'user' : 'environment';
  
  // Stop current stream
  stopCamera();
  
  // Restart camera with new facing mode
  initCamera(app.activeModule);
}

function updateCameraStatus(message, isError = false) {
  console.log(`Camera status: ${message}`);
  // In a real application, this would update a status indicator in the UI
}

// ====================================
// AI Assistant Integration
// ====================================

function initializeAssistant() {
  app.assistant = new AIAssistant();
  
  // Set up assistant chat UI
  const userMessageInput = document.getElementById('user-message');
  const sendButton = document.getElementById('btn-send');
  const chatMessages = document.getElementById('chat-messages');
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  
  if (sendButton && userMessageInput) {
    // Send message on button click
    sendButton.addEventListener('click', () => {
      sendMessageToAssistant();
    });
    
    // Send message on Enter key (but not with Shift+Enter)
    userMessageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageToAssistant();
      }
    });
    
    // Handle suggestion chips
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        userMessageInput.value = chip.textContent;
        sendMessageToAssistant();
      });
    });
  }
}

function sendMessageToAssistant() {
  const userMessageInput = document.getElementById('user-message');
  const chatMessages = document.getElementById('chat-messages');
  const userMessage = userMessageInput.value.trim();
  
  if (userMessage === '') return;
  
  // Add user message to chat
  addMessageToChat('user', userMessage);
  
  // Clear input
  userMessageInput.value = '';
  
  // Add typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'message assistant typing';
  typingIndicator.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Process message with AI assistant
  app.assistant.processMessage(userMessage)
    .then(response => {
      // Remove typing indicator
      chatMessages.removeChild(typingIndicator);
      
      // Add assistant response
      addMessageToChat('assistant', response.message);
      
      // If response includes a recommended test
      if (response.recommendedTest) {
        setTimeout(() => {
          addMessageToChat('assistant', `Would you like to try our ${formatString(response.recommendedTest)} test to help assess your condition?`);
          
          // Add action buttons
          const actionMessage = document.createElement('div');
          actionMessage.className = 'message assistant';
          actionMessage.innerHTML = `
            <div class="message-actions">
              <button class="btn-primary take-test-btn" data-test="${response.recommendedTest}">Take the Test</button>
              <button class="btn-secondary">No, thanks</button>
            </div>
            <span class="message-time">Now</span>
          `;
          chatMessages.appendChild(actionMessage);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          // Add event listener to take test button
          actionMessage.querySelector('.take-test-btn').addEventListener('click', (e) => {
            const testType = e.target.dataset.test;
            navigateTo(`health-tests/${testType}`);
          });
          
          // No thanks button just adds a message
          actionMessage.querySelector('.btn-secondary').addEventListener('click', () => {
            addMessageToChat('assistant', "That's fine. Is there anything else I can help you with today?");
          });
        }, 1000);
      }
    })
    .catch(error => {
      console.error('Error processing message:', error);
      
      // Remove typing indicator
      chatMessages.removeChild(typingIndicator);
      
      // Show error message
      addMessageToChat('assistant', 'I apologize, but I encountered an error processing your message. Please try again.');
    });
}

function addMessageToChat(sender, content) {
  const chatMessages = document.getElementById('chat-messages');
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}`;
  
  // Get current time
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  messageElement.innerHTML = `
    <div class="message-content">
      <p>${content}</p>
    </div>
    <span class="message-time">${timeString}</span>
  `;
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ====================================
// Health Test Module Implementations
// ====================================

// Skin Analysis Module
async function captureSkinImageHandler() {
  const videoElement = document.getElementById('video-skin');
  const resultsContainer = document.getElementById('results-skin');
  const captureButton = document.getElementById('capture-skin');
  
  // Change button state
  captureButton.textContent = 'Processing...';
  captureButton.disabled = true;
  
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
    showToast('Error processing image. Please try again.', 3000);
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
          <strong>${analysis.riskAssessment.level === 'high' ? 'High concern detected.' : 
                   analysis.riskAssessment.level === 'moderate' ? 'Moderate concern.' : 
                   'Low concern.'}</strong>
          <p>${analysis.riskAssessment.message}</p>
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
  
  // Update dashboard if we're showing recent activities
  if (app.currentPage === 'dashboard') {
    loadRecentActivity(app.userManager.getCurrentUser().id);
  }
}

// Wound Assessment Module Implementation
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
    showToast('Error processing image. Please try again.', 3000);
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
  
  // Update dashboard if we're showing recent activities
  if (app.currentPage === 'dashboard') {
    loadRecentActivity(app.userManager.getCurrentUser().id);
  }
}

// Vision Test Module Implementation
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
  
  // Update dashboard if we're showing recent activities
  if (app.currentPage === 'dashboard') {
    loadRecentActivity(app.userManager.getCurrentUser().id);
  }
}

// Hearing Test Module Implementation
function testAudioOutput() {
  // Initialize audio context if needed
  app.tests.hearing.initialize().then(() => {
    // Play a test tone
    app.tests.hearing.playTone(1000, 20, 1);
  }).catch(error => {
    console.error('Error playing test tone:', error);
    showToast('Error playing test tone. Please check your audio settings.', 3000);
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
    showToast('Error starting hearing test. Please try again.', 3000);
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
        <button id="heard-tone" class="btn-primary">I Hear The Tone</button>
        <button id="cant-hear" class="btn-secondary">I Cannot Hear Anything</button>
      </div>
      <div class="progress-indicator">
        <p>Progress: ${state.frequencyIndex + 1}/${app.tests.hearing.FREQUENCIES.length}</p>
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
    <button id="restart-hearing-test" class="btn-primary">Test Again</button>
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
  
  // Update dashboard if we're showing recent activities
  if (app.currentPage === 'dashboard') {
    loadRecentActivity(app.userManager.getCurrentUser().id);
  }
}

// Vitals Module Implementation
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
    
    // Update dashboard if we're showing recent activities
    if (app.currentPage === 'dashboard') {
      loadRecentActivity(app.userManager.getCurrentUser().id);
      loadHealthMetrics(app.userManager.getCurrentUser().id);
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

// Range of Motion Module Implementation
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
    showToast('Please select a joint first', 3000);
    return;
  }
  
  // Check if model is loaded
  if (app.modelStatus.motion !== 'loaded') {
    showToast('Motion tracking model is still loading. Please wait.', 3000);
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
        <h4 class="result-title">${formatString(results.joint)} ${formatString(results.movement)}</h4>
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
  
  // Update dashboard if we're showing recent activities
  if (app.currentPage === 'dashboard') {
    loadRecentActivity(app.userManager.getCurrentUser().id);
  }
}

// ====================================
// Helper Functions
// ====================================

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

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

function showToast(message, duration = 3000, actionButton = null) {
  // Check if toast container exists, create if it doesn't
  let toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    Object.assign(toastContainer.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '1000',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  Object.assign(toast.style, {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: '300px',
    maxWidth: '400px'
  });
  
  // Create message content
  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  toast.appendChild(messageDiv);
  
  // Add action button if provided
  if (actionButton) {
    toast.appendChild(actionButton);
  }
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Remove toast after duration
  setTimeout(() => {
    if (toast.parentNode === toastContainer) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast);
          
          // Remove container if empty
          if (toastContainer.children.length === 0) {
            document.body.removeChild(toastContainer);
          }
        }
      }, 300);
    }
  }, duration);
}

// ====================================
// Reset and Cleanup Functions
// ====================================

function resetVisionTest() {
  const testContainer = document.getElementById('vision-test-container');
  const nextButton = document.getElementById('next-vision-step');
  
  // Reset test UI
  testContainer.innerHTML = `
    <div class="test-instructions">
      <p>Select a test to begin. Hold your device at arm's length for accurate results.</p>
    </div>
  `;
  
  // Reset button
  nextButton.disabled = true;
  nextButton.textContent = 'Start Test';
  nextButton.onclick = advanceVisionTest;
  
  // Reset selection
  document.querySelectorAll('.test-option').forEach(option => {
    option.classList.remove('active');
  });
}

// ====================================
// Event Listeners Setup
// ====================================

function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      app.userManager.logout();
      window.location.href = 'login.html';
    });
  }
  
  // Emergency button
  const emergencyBtn = document.getElementById('btn-emergency');
  if (emergencyBtn) {
    emergencyBtn.addEventListener('click', () => {
      showEmergencyModal();
    });
  }
}

function showEmergencyModal() {
  const modalContainer = document.getElementById('modal-container');
  const modalBackdrop = document.getElementById('modal-backdrop');
  
  modalContainer.innerHTML = `
    <div class="modal-header">
      <h3>Emergency Assistance</h3>
      <button class="btn-icon close-modal">
        <img src="assets/images/icons/close.svg" alt="Close">
      </button>
    </div>
    <div class="modal-body">
      <div class="alert-box alert-danger" style="margin-bottom: 20px;">
        <strong>If this is a medical emergency, call emergency services immediately!</strong>
      </div>
      
      <h4>Emergency Contacts</h4>
      <ul class="emergency-contacts">
        <li>
          <strong>Emergency Services:</strong>
          <a href="tel:911" class="btn-danger emergency-call-btn">Call 911</a>
        </li>
        <li>
          <strong>Poison Control:</strong>
          <a href="tel:18002221222" class="btn-danger emergency-call-btn">Call 1-800-222-1222</a>
        </li>
      </ul>
      
      <h4>Your Personal Emergency Contacts</h4>
      <p>You have not set up any personal emergency contacts yet.</p>
      <button class="btn-secondary">Add Emergency Contact</button>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary close-modal">Close</button>
    </div>
  `;
  
  // Show modal
  modalContainer.classList.add('open');
  modalBackdrop.classList.add('open');
  
  // Add close event listeners
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      modalContainer.classList.remove('open');
      modalBackdrop.classList.remove('open');
    });
  });
  
  // Close modal when clicking on backdrop
  modalBackdrop.addEventListener('click', () => {
    modalContainer.classList.remove('open');
    modalBackdrop.classList.remove('open');
  });
}

// Export for debugging
window.app = app;