// dashboard.js - Main functionality for the dashboard after authentication

import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  addDoc,
  serverTimestamp
} from './firebaseConfig.js';
import { UserManager } from './user-manager.js';

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
  // Check if Firebase is loaded
  if (!auth) {
    console.error('Firebase Auth not loaded!');
    showToast('Authentication service unavailable. Please try again later.', true);
    return;
  }
  
  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      initializeApp();
    } else {
      // User is signed out
      window.location.href = 'signinup.html';
    }
  });
});

// Initialize the dashboard app
async function initializeApp() {
  try {
    // Set up navigation & UI event listeners
    setupEventListeners();
    
    // Load user data
    await app.userManager.loadUserData();
    
    // Update UI with user data
    updateUserInterface();
    
    // Handle navigation based on URL hash
    handleNavigation();
    
    // Load recent activity
    loadRecentActivity();
    
    // Initialize notifications
    initNotifications();
  } catch (error) {
    console.error('Error initializing app:', error);
    showToast('Error loading your data. Please refresh the page.', true);
  }
}

// Update UI with user data
function updateUserInterface() {
  const userData = app.userManager.getCurrentUser();
  
  if (!userData) {
    console.error('No user data available');
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

// ====================================
// Navigation and UI Management
// ====================================

function setupEventListeners() {
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
  
  // Emergency button
  const emergencyBtn = document.getElementById('btn-emergency');
  if (emergencyBtn) {
    emergencyBtn.addEventListener('click', () => {
      showEmergencyModal();
    });
  }
}

// Handle navigation based on URL hash
function handleNavigation() {
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
    } else if (page === 'history') {
      loadHistoryPage();
    } else if (page === 'settings') {
      loadSettingsPage();
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
// Health Data Management
// ====================================

async function loadHealthMetrics() {
  const metrics = app.userManager.getHealthMetrics();
  const healthMetrics = document.querySelector('.metrics-list');
  
  if (!metrics) {
    console.log('No health metrics available');
    return;
  }
  
  // Update heart rate metric
  if (metrics.heartRate && metrics.heartRate.value) {
    updateMetric(
      healthMetrics, 
      'Heart Rate', 
      `${metrics.heartRate.value} ${metrics.heartRate.unit || 'bpm'}`, 
      metrics.heartRate.timestamp
    );
  }
  
  // Update vision metric
  if (metrics.vision && metrics.vision.value) {
    updateMetric(
      healthMetrics, 
      'Vision', 
      metrics.vision.value, 
      metrics.vision.timestamp
    );
  }
  
  // Update hearing metric
  if (metrics.hearing && metrics.hearing.value) {
    updateMetric(
      healthMetrics, 
      'Hearing', 
      metrics.hearing.value, 
      metrics.hearing.timestamp
    );
  }
}

function updateMetric(container, metricName, value, timestamp) {
  const metricItems = container.querySelectorAll('.metric-item');
  
  for (const item of metricItems) {
    const title = item.querySelector('h4').textContent;
    
    if (title === metricName) {
      item.querySelector('p').innerHTML = value;
      
      // Format timestamp if it exists
      if (timestamp) {
        // Convert Firebase timestamp to JS Date if needed
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        item.querySelector('.metric-date').textContent = `Last check: ${formatDate(date)}`;
      } else {
        item.querySelector('.metric-date').textContent = 'Not measured yet';
      }
      return;
    }
  }
}

async function loadRecentActivity() {
  // Get activity from Firebase
  const activities = await app.userManager.getActivityHistory(3);
  const activityList = document.querySelector('.activity-list');
  
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

function loadReminders() {
  // In a real application, this would fetch reminders from the database
  // For demo purposes, we'll use the static reminders from the HTML
}

function recordUserFeeling(feeling) {
  // Record the feeling in Firebase
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
  
  // Load notifications from Firebase (in a real app)
  loadNotificationsFromDatabase();
}

async function loadNotificationsFromDatabase() {
  // In a production app, this would fetch notifications from Firebase
  // For demo, we'll use the static notifications in the HTML
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
  
  // Initial module setup with placeholder for demo purposes
  healthTestsPage.innerHTML = `
    <button class="btn-secondary back-btn">
      <img src="assets/images/icons/arrow-left.svg" alt="Back"> Back to Tests
    </button>
    
    <h3>${formatString(moduleType)} Test</h3>
    <p class="module-description">This is a placeholder for the ${moduleType} test module.</p>
    
    <div class="placeholder-container">
      <div class="placeholder-icon ${moduleType}">
        <img src="assets/images/icons/${moduleType}.svg" alt="${formatString(moduleType)} Test">
      </div>
      <p>The ${formatString(moduleType)} test module would be fully implemented in a production version.</p>
      <p>This would include camera access, data processing, and result analysis.</p>
      
      <button id="simulate-test" class="btn-primary">Simulate Test Results</button>
    </div>
    
    <div id="results-${moduleType}" class="results-container">
      <h3>Test Results</h3>
      <p class="no-results">No results yet. Run a test to see results here.</p>
    </div>
  `;
  
  // Add back button event listener
  document.querySelector('.back-btn').addEventListener('click', () => {
    navigateTo('health-tests');
  });
  
  // Add simulate test button event listener
  document.getElementById('simulate-test').addEventListener('click', () => {
    simulateTestResults(moduleType);
  });
}

function simulateTestResults(testType) {
  const resultsContainer = document.getElementById(`results-${testType}`);
  const timestamp = new Date().toISOString();
  
  // Remove "no results" message if present
  const noResults = resultsContainer.querySelector('.no-results');
  if (noResults) {
    resultsContainer.removeChild(noResults);
  }
  
  // Create result item
  const resultItem = document.createElement('div');
  resultItem.className = 'result-item';
  
  // Generate simulated result based on test type
  let resultHTML = '';
  let activityDetail = '';
  let mockResults = null;
  
  switch (testType) {
    case 'skin':
      resultHTML = generateSkinResultHTML();
      activityDetail = 'Analysis showed normal skin with no concerning lesions';
      mockResults = {
        primaryCondition: 'Normal skin',
        confidence: 0.92,
        recommendations: 'Continue regular skin checks and sun protection'
      };
      break;
    case 'wound':
      resultHTML = generateWoundResultHTML();
      activityDetail = 'Minor cut with low infection risk, healing well';
      mockResults = {
        woundType: 'Minor cut',
        infectionRisk: 'Low',
        healingStatus: 'Good'
      };
      break;
    case 'vision':
      resultHTML = generateVisionResultHTML();
      activityDetail = 'Vision test: 20/30 - mild visual impairment';
      mockResults = {
        acuity: '20/30',
        category: 'Mild visual impairment'
      };
      
      // Also update health metric
      app.userManager.updateHealthMetric('vision', '20/30');
      break;
    case 'hearing':
      resultHTML = generateHearingResultHTML();
      activityDetail = 'Hearing test: Normal hearing range';
      mockResults = {
        result: 'Normal',
        frequencies: 'All tested frequencies within normal range'
      };
      
      // Also update health metric
      app.userManager.updateHealthMetric('hearing', 'Normal');
      break;
    case 'vitals':
      resultHTML = generateVitalsResultHTML();
      activityDetail = 'Heart rate measured: 72 bpm (Normal)';
      mockResults = {
        heartRate: 72,
        category: 'Normal'
      };
      
      // Also update health metric
      app.userManager.updateHealthMetric('heartRate', 72, 'bpm');
      break;
    case 'motion':
      resultHTML = generateMotionResultHTML();
      activityDetail = 'Shoulder range of motion: 165° (Normal)';
      mockResults = {
        joint: 'Shoulder',
        rangeOfMotion: 165,
        category: 'Normal'
      };
      break;
  }
  
  resultItem.innerHTML = resultHTML;
  
  // Add to results container (at the top)
  resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
  
  // Record activity in Firebase
  app.userManager.addActivityRecord(testType, activityDetail, mockResults);
  
  // Update dashboard if we're showing recent activities
  loadRecentActivity();
  
  // Show toast notification
  showToast(`${formatString(testType)} test completed!`);
}

// Result HTML generators for different test types
function generateSkinResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Skin Analysis</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon skin">
          <img src="assets/images/icons/skin.svg" alt="Skin">
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Primary Assessment:</span>
          <span class="detail-value">Normal skin</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Confidence:</span>
          <span class="detail-value">92%</span>
        </div>
        <h5>Other Potential Matches:</h5>
        <div class="detail-row">
          <span class="detail-label">Dry skin</span>
          <div class="detail-bar-container">
            <div class="detail-bar confidence-medium" style="width: 38%"></div>
          </div>
          <span class="detail-percentage">38%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Sun exposure</span>
          <div class="detail-bar-container">
            <div class="detail-bar confidence-low" style="width: 21%"></div>
          </div>
          <span class="detail-percentage">21%</span>
        </div>
        <div class="alert-box alert-info">
          <strong>Low concern.</strong>
          <p>No concerning skin lesions detected. Continue regular skin checks and use sun protection.</p>
        </div>
      </div>
    </div>
  `;
}

function generateWoundResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Wound Assessment</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon wound">
          <img src="assets/images/icons/wound.svg" alt="Wound">
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Primary Type:</span>
          <span class="detail-value">Minor cut</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Infection Risk:</span>
          <div class="detail-bar-container">
            <div class="detail-bar confidence-high" style="width: 15%"></div>
          </div>
          <span class="detail-percentage">15%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Healing Progress:</span>
          <div class="detail-bar-container">
            <div class="detail-bar confidence-high" style="width: 85%"></div>
          </div>
          <span class="detail-percentage">85%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Stitches Indicated:</span>
          <div class="detail-bar-container">
            <div class="detail-bar confidence-high" style="width: 5%"></div>
          </div>
          <span class="detail-percentage">5%</span>
        </div>
        <div class="alert-box alert-success">
          <strong>Low risk, healing well. Keep the wound clean and continue current care.</strong>
        </div>
      </div>
    </div>
  `;
}

function generateVisionResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Vision Test</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon vision-test">
          <img src="assets/images/icons/vision-test.svg" alt="Vision Test">
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Score:</span>
          <span class="detail-value">8/10 correct</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Best Acuity:</span>
          <span class="detail-value">20/30</span>
        </div>
        <div class="alert-box alert-warning">
          <strong>Mild visual impairment detected.</strong>
          <p>Your visual acuity is slightly below normal. Consider consulting an eye care professional for a comprehensive examination.</p>
        </div>
      </div>
    </div>
  `;
}

function generateHearingResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Hearing Test</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon hearing-test">
          <img src="assets/images/icons/hearing-test.svg" alt="Hearing Test">
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value">Normal hearing</span>
        </div>
        <div class="alert-box alert-success">
          <p>You responded well to all tested frequencies. Your hearing appears to be within the normal range.</p>
        </div>
      </div>
    </div>
  `;
}

function generateVitalsResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Heart Rate Measurement</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon vitals">
          <img src="assets/images/icons/vitals.svg" alt="Vitals">
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Heart Rate:</span>
          <span class="detail-value">72 BPM</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Category:</span>
          <span class="detail-value">Normal</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Confidence:</span>
          <span class="detail-value">High</span>
        </div>
        <div class="alert-box alert-success" style="margin-top: 12px">
          <p>Your heart rate is within the normal range for a resting adult.</p>
        </div>
      </div>