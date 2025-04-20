// File: app.js - Core functionality for Health Assessment Platform
// This integrates all test modules and connects UI elements

// Import core modules
import { initializeCamera, stopCamera, switchCamera } from '../modules/camera-manager.js';
import { 
  loadSkinModel, analyzeSkinImage, captureSkinImage 
} from './modules/skin-analysis.js';
import { 
  loadWoundModel, analyzeWoundImage, captureWoundImage 
} from './modules/wound-analysis.js';
import { VisionTestManager } from './modules/vision-tests.js';
import { HearingTestManager } from './modules/hearing-tests.js';
import { VitalsProcessor } from './modules/vitals-processing.js';
import { MotionAnalyzer } from './modules/motion-analysis.js';
import { UserManager } from '../user-manager.js';

// Global application state
const app = {
  currentPage: 'dashboard',
  activeModule: null,
  userManager: new UserManager(),
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  app.userManager.init();
  
  // Listen for user loaded event
  document.addEventListener('user:loaded', (event) => {
    initializeApp();
  });
  
  // Setup event listeners
  setupEventListeners();
});

// Initialize application after user is authenticated
function initializeApp() {
  // Update UI with user data
  updateUserInterface();
  
  // Handle navigation based on URL hash
  handleNavigation();
  
  // Load models
  loadModels();
  
  // If on dashboard, load recent activity
  if (app.currentPage === 'dashboard') {
    loadRecentActivity();
  }
}

// Load ML models
async function loadModels() {
  // Update UI
  updateModelStatus('Loading models...');
  
  try {
    // Load skin model
    app.models.skin = await loadSkinModel(progress => {
      updateModelProgress('skin', progress);
    });
    
    // Load wound model
    app.models.wound = await loadWoundModel(progress => {
      updateModelProgress('wound', progress);
    });
    
    // Load motion model
    await app.tests.motion.loadModel(progress => {
      updateModelProgress('motion', progress);
    });
    
    // Update UI
    updateModelStatus('All models loaded');
  } catch (error) {
    console.error('Error loading models:', error);
    updateModelStatus('Error loading models', true);
  }
}

// Update model loading status in UI
function updateModelStatus(message, isError = false) {
  const statusElement = document.getElementById('model-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'status-error' : 'status-ready';
  }
}

function updateModelProgress(modelName, progress) {
  const statusElement = document.getElementById('model-status');
  if (statusElement && progress.status === 'loading') {
    statusElement.textContent = `Loading ${modelName} model: ${Math.round(progress.progress * 100)}%`;
  }
}

// Update UI with user data
function updateUserInterface() {
  const userData = app.userManager.getCurrentUser();
  
  if (!userData) {
    return;
  }
  
  // Update user info in sidebar
  document.getElementById('user-name').textContent = userData.name;
  document.getElementById('user-email').textContent = userData.email;
  document.getElementById('welcome-name').textContent = userData.name.split(' ')[0];
  
  // Load user's avatar if available
  if (userData.avatar) {
    document.getElementById('user-avatar').src = userData.avatar;
  }
  
  // Load health metrics
  loadHealthMetrics();
}

// Load user's health metrics
function loadHealthMetrics() {
  const metrics = app.userManager.getHealthMetrics();
  if (!metrics) return;
  
  // Update metrics in the UI
  updateMetricDisplay('Heart Rate', metrics.heartRate);
  updateMetricDisplay('Vision', metrics.vision);
  updateMetricDisplay('Hearing', metrics.hearing);
}

function updateMetricDisplay(metricName, metricData) {
  if (!metricData || !metricData.value) return;
  
  // Find the metric item in the UI
  const metricItems = document.querySelectorAll('.metric-item');
  for (const item of metricItems) {
    const title = item.querySelector('h4').textContent;
    if (title === metricName) {
      // Update the value
      const valueDisplay = item.querySelector('p');
      const timestampDisplay = item.querySelector('.metric-date');
      
      if (valueDisplay) {
        valueDisplay.textContent = metricData.unit ? 
          `${metricData.value} ${metricData.unit}` : metricData.value;
      }
      
      if (timestampDisplay && metricData.timestamp) {
        const date = metricData.timestamp.toDate ? 
          metricData.timestamp.toDate() : new Date(metricData.timestamp);
        timestampDisplay.textContent = `Last check: ${formatDate(date)}`;
      }
    }
  }
}

// Format a date for display
function formatDate(date) {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function formatTime(date) {
  const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  return date.toLocaleTimeString('en-US', options);
}

// Set up event listeners
function setupEventListeners() {
  // Navigation
  setupNavigation();
  
  // Module-specific listeners
  setupModuleListeners();
  
  // Feeling buttons on dashboard
  document.querySelectorAll('.feel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const feeling = e.target.closest('.feel-btn').dataset.feeling;
      recordUserFeeling(feeling);
    });
  });
  
  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      app.userManager.logout();
    });
  }
  
  // Notifications
  setupNotifications();
}

// Set up navigation listeners
function setupNavigation() {
  // Sidebar navigation
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = e.currentTarget.getAttribute('href').substring(1);
      navigateTo(targetPage);
    });
  });
  
  // Mobile sidebar toggle
  const sidebarOpen = document.getElementById('sidebar-open');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebarOpen && sidebarClose && sidebar) {
    sidebarOpen.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
    
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }
  
  // Quick action buttons
  document.querySelectorAll('.action-item').forEach(action => {
    action.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = e.currentTarget.getAttribute('href').substring(1);
      navigateTo(targetPage);
    });
  });
  
  // Header quick buttons
  const quickTestBtn = document.getElementById('quick-test');
  const talkAssistantBtn = document.getElementById('talk-assistant');
  
  if (quickTestBtn) {
    quickTestBtn.addEventListener('click', () => navigateTo('health-tests'));
  }
  
  if (talkAssistantBtn) {
    talkAssistantBtn.addEventListener('click', () => navigateTo('health-assistant'));
  }
}

// Set up module-specific listeners
function setupModuleListeners() {
  // These will be set up when each module is loaded
}

// Handle navigation based on URL
function handleNavigation() {
  const hashPage = window.location.hash.substring(1) || 'dashboard';
  navigateTo(hashPage);
}

// Navigate to a specific page
function navigateTo(page) {
  // Clean up current module if active
  cleanupCurrentModule();
  
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
  
  // Handle main pages vs. subpages
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
    sidebarItem = document.querySelector(`.sidebar-nav li a[href="#${page}"]`);
    
    if (sidebarItem) {
      sidebarItem = sidebarItem.parentElement;
    }
    
    // Special handling for specific pages
    if (page === 'health-tests') {
      loadHealthTestsList();
    } else if (page === 'health-assistant') {
      initAssistant();
    } else if (page === 'history') {
      loadHistoryPage();
    } else if (page === 'settings') {
      loadSettingsPage();
    } else if (page === 'dashboard') {
      loadRecentActivity();
    }
  }
  
  if (pageElement && sidebarItem) {
    pageElement.classList.add('active');
    sidebarItem.classList.add('active');
    document.getElementById('current-page-title').textContent = formatPageTitle(page);
    
    // Update URL and app state
    window.location.hash = `#${page}`;
    app.currentPage = page;
  }
}

// Clean up current module (stop camera, etc.)
function cleanupCurrentModule() {
  // Stop camera if it's active
  if (app.camera.active) {
    stopCamera();
  }
  
  // Stop any active tests
  if (app.activeModule === 'hearing' && app.tests.hearing.isRunning) {
    app.tests.hearing.stopTest();
  } else if (app.activeModule === 'vitals' && app.tests.vitals.measuring) {
    app.tests.vitals.stopMeasurement();
  } else if (app.activeModule === 'motion' && app.tests.motion.isRecording) {
    app.tests.motion.stopRecording();
  }
  
  app.activeModule = null;
}

// Format page title
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

// Show a toast notification
function showToast(message, duration = 3000, actionButton = null, isError = false) {
  // Create toast container if it doesn't exist
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
  toast.className = isError ? 'toast toast-error' : 'toast';
  Object.assign(toast.style, {
    backgroundColor: isError ? '#fee2e2' : '#f0fdf4',
    color: isError ? '#b91c1c' : '#166534',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: '300px',
    maxWidth: '400px',
    border: isError ? '1px solid #fca5a5' : '1px solid #86efac'
  });
  
  // Create message content
  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  toast.appendChild(messageDiv);
  
  // Add action button if provided
  if (actionButton) {
    toast.appendChild(actionButton);
  }
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.marginLeft = '10px';
  closeBtn.onclick = () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  };
  toast.appendChild(closeBtn);
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Remove toast after specified duration
  setTimeout(() => {
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
  }, duration);
}

// Record user's feeling
function recordUserFeeling(feeling) {
  // Record the feeling in the database
  app.userManager.addActivityRecord('feeling', `User reported feeling ${feeling}`);
  
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

// Set up notifications
function setupNotifications() {
  const notificationsToggle = document.getElementById('notifications-toggle');
  const notificationsPanel = document.getElementById('notifications-panel');
  const notificationsClose = document.getElementById('notifications-close');
  const markAllRead = document.querySelector('.mark-all-read');
  
  if (notificationsToggle && notificationsPanel) {
    notificationsToggle.addEventListener('click', () => {
      notificationsPanel.classList.toggle('open');
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

// Load recent activity on dashboard
async function loadRecentActivity() {
  // Get activity from Firebase
  const activities = await app.userManager.getActivityHistory(3);
  const activityList = document.querySelector('.activity-list');
  
  if (!activityList) return;
  
  if (!activities || activities.length === 0) {
    // No activities yet
    activityList.innerHTML = `
      <div class="no-activity">
        <p>No activities recorded yet. Try some health tests to see your activity here.</p>
      </div>
    `;
    return;
  }
  
  // Clear existing activities
  activityList.innerHTML = '';
  
  // Add recent activities
  activities.forEach(activity => {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    // Determine icon and details based on activity type
    let icon, title, details;
    
    switch (activity.type) {
      case 'skin':
        icon = 'skin';
        title = 'Skin Analysis Completed';
        details = activity.detail || 'Skin analysis performed';
        break;
      case 'wound':
        icon = 'wound';
        title = 'Wound Assessment Completed';
        details = activity.detail || 'Wound assessment performed';
        break;
      case 'vision':
        icon = 'vision-test';
        title = 'Vision Test Completed';
        details = activity.detail || 'Vision test performed';
        break;
      case 'hearing':
        icon = 'hearing-test';
        title = 'Hearing Test Completed';
        details = activity.detail || 'Hearing test performed';
        break;
      case 'vitals':
        icon = 'heart';
        title = 'Heart Rate Measured';
        details = activity.detail || 'Vitals check performed';
        break;
      case 'motion':
        icon = 'motion';
        title = 'Motion Test Completed';
        details = activity.detail || 'Motion test performed';
        break;
      case 'consultation':
        icon = 'assistant';
        title = 'AI Consultation';
        details = activity.detail || 'Consultation with AI assistant';
        break;
      default:
        icon = 'history';
        title = 'Health Activity';
        details = activity.detail || 'Health activity recorded';
    }
    
    // Format timestamp
    const timestamp = new Date(activity.timestamp);
    
    activityItem.innerHTML = `
      <div class="activity-icon">
        <img src="assets/images/icons/${icon}.svg" alt="${title}">
      </div>
      <div class="activity-details">
        <h4>${title}</h4>
        <p>${details}</p>
        <span class="activity-date">${formatDate(timestamp)} - ${formatTime(timestamp)}</span>
      </div>
    `;
    
    activityList.appendChild(activityItem);
  });
}

// Load health tests list
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

// Load and initialize a specific test module
function loadModule(moduleType) {
  app.activeModule = moduleType;
  
  // Load the module implementation based on type
  switch (moduleType) {
    case 'skin':
      loadSkinModule();
      break;
    case 'wound':
      loadWoundModule();
      break;
    case 'vision':
      loadVisionModule();
      break;
    case 'hearing':
      loadHearingModule();
      break;
    case 'vitals':
      loadVitalsModule();
      break;
    case 'motion':
      loadMotionModule();
      break;
    default:
      showToast(`Module ${moduleType} not implemented yet`, true);
  }
}

// Load skin analysis module
function loadSkinModule() {
  const healthTestsPage = document.getElementById('health-tests-page');
  
  // Check if model is loaded
  if (!app.models.skin) {
    showToast('Skin analysis model is still loading. Please wait.', true);
    
    // Show a loading indicator
    healthTestsPage.innerHTML = `
      <button class="btn-secondary back-btn">
        <img src="assets/images/icons/arrow-left.svg" alt="Back"> Back to Tests
      </button>
      
      <h3>Skin Analysis</h3>
      <p class="module-description">Analyzing skin conditions, lesions, and rashes</p>
      
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading skin analysis model...</p>
      </div>
    `;
    
    document.querySelector('.back-btn').addEventListener('click', () => {
      navigateTo('health-tests');
    });
    
    return;
  }
  
  // Render skin module UI
  healthTestsPage.innerHTML = `
    <button class="btn-secondary back-btn">
      <img src="assets/images/icons/arrow-left.svg" alt="Back"> Back to Tests
    </button>
    
    <h3>Skin Analysis</h3>
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
      <button id="capture-skin" class="primary-button">Capture Image</button>
      <button id="switch-camera" class="secondary-button">Switch Camera</button>
    </div>
    
    <div id="results-skin" class="results-container">
      <h3>Analysis Results</h3>
      <p class="no-results">No analyses yet. Capture an image to begin.</p>
    </div>
  `;
  
  // Add event listeners
  document.querySelector('.back-btn').addEventListener('click', () => {
    navigateTo('health-tests');
  });
  
  document.getElementById('capture-skin').addEventListener('click', captureSkinImageHandler);
  document.getElementById('switch-camera').addEventListener('click', switchCamera);
  
  // Initialize camera
  initializeCamera('video-skin');
}

// Handle skin image capture and analysis
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
    
    // Record activity
    app.userManager.addActivityRecord(
      'skin', 
      `Analysis: ${analysisResult.results[0].display} (${Math.round(analysisResult.results[0].confidence * 100)}% confidence)`,
      analysisResult
    );
  } catch (error) {
    console.error('Error capturing image:', error);
    showToast('Error processing image. Please try again.', true);
  } finally {
    // Reset button state
    captureButton.textContent = 'Capture Image';
    captureButton.disabled = false;
  }
}

// Display skin analysis results
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
  
  // Update dashboard
  loadRecentActivity();
}

// Wound assessment module implementation
function loadWoundModule() {
  // Similar to skin module, implement wound assessment
  // ...
}

// Vision test module implementation
function loadVisionModule() {
  // Implement vision test
  // ...
}

// Hearing test module implementation
function loadHearingModule() {
  // Implement hearing test
  // ...
}

// Vitals measurement module implementation
function loadVitalsModule() {
  // Implement vitals measurement
  // ...
}

// Range of motion module implementation
function loadMotionModule() {
  // Implement range of motion assessment
  // ...
}

// Load history page
function loadHistoryPage() {
  // Implement history page
  // ...
}

// Load settings page
function loadSettingsPage() {
  // Implement settings page
  // ...
}

// Initialize AI assistant
function initAssistant() {
  // Implement AI assistant functionality
  // ...
}

// Camera management functions
function initializeCamera(videoElementId) {
  const videoElement = document.getElementById(videoElementId);
  if (!videoElement) return;
  
  // Check if camera is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Camera not supported in this browser.', true);
    return;
  }
  
  // Update camera status in UI
  const cameraStatus = document.getElementById('camera-status');
  if (cameraStatus) {
    cameraStatus.textContent = 'Requesting access...';
  }
  
  // Request camera access
  const constraints = {
    video: { 
      facingMode: app.camera.facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };
  
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      // Store the stream
      app.camera.stream = stream;
      app.camera.active = true;
      
      // Connect stream to video element
      videoElement.srcObject = stream;
      
      // Update camera status
      if (cameraStatus) {
        cameraStatus.textContent = 'Ready';
        cameraStatus.className = 'status-ready';
      }
      
      // Set up focus checking if this is the skin module
      if (videoElementId === 'video-skin') {
        setupFocusChecking();
      }
    })
    .catch(error => {
      console.error('Error accessing camera:', error);
      
      if (cameraStatus) {
        cameraStatus.textContent = 'Access denied';
        cameraStatus.className = 'status-error';
      }
      
      showToast('Could not access camera. Please check permissions.', true);
    });
}

function stopCamera() {
  if (app.camera.stream) {
    app.camera.stream.getTracks().forEach(track => track.stop());
    app.camera.stream = null;
    app.camera.active = false;
  }
}

function switchCamera() {
  // Stop current camera
  stopCamera();
  
  // Switch camera mode
  app.camera.facingMode = app.camera.facingMode === 'environment' ? 'user' : 'environment';
  
  // Reinitialize with new camera
  const videoId = `video-${app.activeModule}`;
  initializeCamera(videoId);
}

function setupFocusChecking() {
  const videoElement = document.getElementById('video-skin');
  const focusIndicator = document.getElementById('focus-indicator');
  const guidanceMessage = document.getElementById('guidance-message');
  const progressBar = document.getElementById('guidance-progress-bar');
  
  // Check focus quality periodically
  const focusCheckInterval = setInterval(() => {
    if (!app.camera.active) {
      clearInterval(focusCheckInterval);
      return;
    }
    
    // In a real implementation, this would analyze the image sharpness
    // For demo, we'll just randomize focus quality
    const randomQuality = Math.random();
    
    if (randomQuality > 0.7) {
      // Good focus
      focusIndicator.className = 'focus-indicator good';
      guidanceMessage.textContent = 'Good focus! Ready to capture.';
      progressBar.style.width = '100%';
      
      // Enable capture button with visual cue
      const captureButton = document.getElementById('capture-skin');
      captureButton.classList.add('pulse-animation');
    } else if (randomQuality > 0.4) {
      // Moderate focus
      focusIndicator.className = 'focus-indicator';
      guidanceMessage.textContent = 'Hold steady for better focus...';
      progressBar.style.width = '50%';
    } else {
      // Poor focus
      focusIndicator.className = 'focus-indicator bad';
      guidanceMessage.textContent = 'Focus is poor. Move closer or check lighting.';
      progressBar.style.width = '20%';
    }
  }, 1000);
}

// Export the app object for debugging
window.app = app;