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
} from '../firebaseConfig.js';
import { UserManager } from './user-manager.js';
import { StorageManager } from './storage-manager.js';
import DashboardManager from './dashboard-manager.js';

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

// SVG icon map for health tests (fallback if image missing)
const ICON_SVGS = {
  skin: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#FDE68A"/><ellipse cx="16" cy="20" rx="8" ry="6" fill="#F59E42"/><ellipse cx="16" cy="14" rx="6" ry="4" fill="#FBBF24"/></svg>`,
  wound: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#FECACA"/><rect x="10" y="14" width="12" height="4" rx="2" fill="#B91C1C"/><rect x="14" y="10" width="4" height="12" rx="2" fill="#B91C1C"/></svg>`,
  vision: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#DBEAFE"/><ellipse cx="16" cy="16" rx="10" ry="6" fill="#2563EB"/><circle cx="16" cy="16" r="3" fill="#1E3A8A"/></svg>`,
  hearing: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#D1FAE5"/><path d="M20 16a4 4 0 11-8 0 4 4 0 018 0z" fill="#059669"/><path d="M16 20v2" stroke="#059669" stroke-width="2" stroke-linecap="round"/></svg>`,
  vitals: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#FCA5A5"/><path d="M8 16h3l2 6 4-12 2 6h5" stroke="#B91C1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  motion: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#C7D2FE"/><rect x="12" y="8" width="8" height="16" rx="4" fill="#6366F1"/></svg>`,
  reaction: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#FDE68A"/><path d="M16 8v8l6 3" stroke="#B45309" stroke-width="2" stroke-linecap="round"/></svg>`,
  tremor: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#FECACA"/><path d="M10 22c2-4 10-4 12 0" stroke="#B91C1C" stroke-width="2" stroke-linecap="round"/></svg>`,
  balance: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#D1FAE5"/><rect x="12" y="12" width="8" height="8" rx="4" fill="#059669"/></svg>`
};

// Helper to get icon HTML (img or SVG fallback)
function getIconHTML(type) {
  const imgPath = `assets/images/icons/${type}.svg`;
  return `<img src="${imgPath}" alt="${type} icon" onerror="this.outerHTML=window.ICON_SVGS && window.ICON_SVGS['${type}'] ? window.ICON_SVGS['${type}'] : ''">`;
}

// Expose SVGs globally for onerror fallback
window.ICON_SVGS = ICON_SVGS;

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
      sidebarOpen.style.display = 'none';
    });
  }
  
  if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOpen.style.display = '';
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
  
  // Reminders logic
  loadReminders();
  document.querySelector('.add-reminder').addEventListener('click', showAddReminderModal);
  document.querySelector('.reminders-list').addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      toggleReminderComplete(e.target.id);
    }
  });
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
      case 'reaction':
        icon = 'reaction';
        title = 'Reaction Time Test Completed';
        details = activity.detail || 'Reaction time test performed';
        break;
      case 'tremor':
        icon = 'tremor';
        title = 'Tremor Test Completed';
        details = activity.detail || 'Tremor test performed';
        break;
      case 'balance':
        icon = 'balance';
        title = 'Balance Test Completed';
        details = activity.detail || 'Balance test performed';
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
        ${getIconHTML(icon)}
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
  const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
  const list = document.querySelector('.reminders-list');
  list.innerHTML = reminders.map((r, i) => `
    <div class="reminder-item${r.completed ? ' completed' : ''}">
      <div class="reminder-checkbox">
        <svg width="20" height="20" viewBox="0 0 20 20">${r.completed ? '<rect x="2" y="2" width="16" height="16" rx="4" fill="#A7F3D0" stroke="#059669" stroke-width="2"/><polyline points="5,11 9,15 15,7" fill="none" stroke="#059669" stroke-width="2"/>' : '<rect x="2" y="2" width="16" height="16" rx="4" fill="#F3F4F6" stroke="#A1A1AA" stroke-width="2"/>'}</svg>
        <input type="checkbox" id="reminder-${i}" ${r.completed ? 'checked' : ''}>
        <label for="reminder-${i}"></label>
      </div>
      <div class="reminder-details">
        <h4>${r.title}</h4>
        <p>${r.due}</p>
      </div>
    </div>
  `).join('');
}

function showAddReminderModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal">
      <h3>Add Reminder</h3>
      <input id="reminder-title" placeholder="Reminder title">
      <input id="reminder-due" placeholder="Due (e.g. tomorrow)">
      <button id="save-reminder" class="btn-primary">Save</button>
      <button id="cancel-reminder" class="btn-secondary">Cancel</button>
    </div>
  `;
  document.getElementById('modal-backdrop').classList.add('open');
  modal.classList.add('open');
  document.getElementById('save-reminder').onclick = () => {
    const title = document.getElementById('reminder-title').value;
    const due = document.getElementById('reminder-due').value;
    if (title && due) {
      const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
      reminders.push({ title, due, completed: false });
      localStorage.setItem('reminders', JSON.stringify(reminders));
      loadReminders();
      closeModal();
    }
  };
  document.getElementById('cancel-reminder').onclick = closeModal;
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('modal-container').classList.remove('open');
  document.getElementById('modal-container').innerHTML = '';
}

function toggleReminderComplete(id) {
  const idx = parseInt(id.replace('reminder-', ''));
  const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
  if (reminders[idx]) {
    reminders[idx].completed = !reminders[idx].completed;
    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
  }
}

function recordUserFeeling(feeling) {
  localStorage.setItem('userFeeling', JSON.stringify({ feeling, date: new Date().toISOString() }));
  
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
            ${getIconHTML('skin')}
          </div>
          <div class="test-info">
            <h4>Skin Analysis</h4>
            <p>Analyze skin conditions, lesions, and rashes</p>
          </div>
        </div>
        
        <div class="test-card" data-test="wound">
          <div class="test-icon wound">
            ${getIconHTML('wound')}
          </div>
          <div class="test-info">
            <h4>Wound Assessment</h4>
            <p>Check wounds for signs of infection or healing</p>
          </div>
        </div>
        
        <div class="test-card" data-test="vision">
          <div class="test-icon vision-test">
            ${getIconHTML('vision')}
          </div>
          <div class="test-info">
            <h4>Vision Tests</h4>
            <p>Basic vision screening tests and eye exams</p>
          </div>
        </div>
        
        <div class="test-card" data-test="hearing">
          <div class="test-icon hearing-test">
            ${getIconHTML('hearing')}
          </div>
          <div class="test-info">
            <h4>Hearing Tests</h4>
            <p>Hearing screening and frequency tests</p>
          </div>
        </div>
        
        <div class="test-card" data-test="vitals">
          <div class="test-icon vitals">
            ${getIconHTML('vitals')}
          </div>
          <div class="test-info">
            <h4>Vital Signs</h4>
            <p>Measure heart rate and other vital metrics</p>
          </div>
        </div>
        
        <div class="test-card" data-test="motion">
          <div class="test-icon motion">
            ${getIconHTML('motion')}
          </div>
          <div class="test-info">
            <h4>Range of Motion</h4>
            <p>Analyze joint flexibility and movement range</p>
          </div>
        </div>
        
        <div class="test-card" data-test="reaction">
          <div class="test-icon reaction">
            ${getIconHTML('reaction')}
          </div>
          <div class="test-info">
            <h4>Reaction Time</h4>
            <p>Measure reaction speed and accuracy</p>
          </div>
        </div>
        
        <div class="test-card" data-test="tremor">
          <div class="test-icon tremor">
            ${getIconHTML('tremor')}
          </div>
          <div class="test-info">
            <h4>Tremor Analysis</h4>
            <p>Assess tremor severity and patterns</p>
          </div>
        </div>
        
        <div class="test-card" data-test="balance">
          <div class="test-icon balance">
            ${getIconHTML('balance')}
          </div>
          <div class="test-info">
            <h4>Balance Test</h4>
            <p>Evaluate stability and coordination</p>
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
        ${getIconHTML(moduleType)}
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
    case 'reaction':
      resultHTML = generateReactionResultHTML();
      activityDetail = 'Reaction time: 250ms (Normal)';
      mockResults = {
        reactionTime: 250,
        category: 'Normal'
      };
      break;
    case 'tremor':
      resultHTML = generateTremorResultHTML();
      activityDetail = 'Tremor severity: Mild';
      mockResults = {
        severity: 'Mild',
        patterns: 'Consistent'
      };
      break;
    case 'balance':
      resultHTML = generateBalanceResultHTML();
      activityDetail = 'Balance test: Stable';
      mockResults = {
        stability: 'Stable',
        coordination: 'Good'
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
          ${getIconHTML('skin')}
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
          ${getIconHTML('wound')}
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
          ${getIconHTML('vision')}
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
          ${getIconHTML('hearing')}
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
          ${getIconHTML('vitals')}
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
    </div>
  `;
}

function generateMotionResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Motion Test</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon motion">
          ${getIconHTML('motion')}
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Joint:</span>
          <span class="detail-value">Shoulder</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Range of Motion:</span>
          <span class="detail-value">165°</span>
        </div>
        <div class="alert-box alert-success">
          <p>Your shoulder range of motion is within the normal range.</p>
        </div>
      </div>
    </div>
  `;
}

function generateReactionResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Reaction Time Test</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon reaction">
          ${getIconHTML('reaction')}
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Reaction Time:</span>
          <span class="detail-value">250ms</span>
        </div>
        <div class="alert-box alert-success">
          <p>Your reaction time is within the normal range.</p>
        </div>
      </div>
    </div>
  `;
}

function generateTremorResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Tremor Test</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon tremor">
          ${getIconHTML('tremor')}
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Severity:</span>
          <span class="detail-value">Mild</span>
        </div>
        <div class="alert-box alert-warning">
          <p>Mild tremor detected. Consider consulting a healthcare professional for further evaluation.</p>
        </div>
      </div>
    </div>
  `;
}

function generateBalanceResultHTML() {
  return `
    <div class="result-header">
      <h4 class="result-title">Balance Test</h4>
      <span class="result-timestamp">${new Date().toLocaleString()}</span>
    </div>
    <div class="result-content">
      <div class="placeholder-image">
        <div class="placeholder-icon balance">
          ${getIconHTML('balance')}
        </div>
      </div>
      <div class="result-details">
        <div class="detail-row">
          <span class="detail-label">Stability:</span>
          <span class="detail-value">Stable</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Coordination:</span>
          <span class="detail-value">Good</span>
        </div>
        <div class="alert-box alert-success">
          <p>Your balance and coordination are within the normal range.</p>
        </div>
      </div>
    </div>
  `;
}

class Dashboard {
  constructor() {
    this.manager = new DashboardManager();
    this.setupEventListeners();
    this.initializeDashboard();
  }

  setupEventListeners() {
    // Feeling buttons
    document.querySelectorAll('.feel-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const feeling = e.currentTarget.getAttribute('data-feeling');
        this.manager.recordUserFeeling(feeling);
      });
    });

    // Reminders
    document.querySelectorAll('.reminder-checkbox input').forEach((checkbox, index) => {
      checkbox.addEventListener('change', () => {
        this.manager.toggleReminderCompleted(index);
      });
    });

    // Add reminder button
    document.querySelector('.add-reminder').addEventListener('click', () => {
      this.showAddReminderModal();
    });

    // Mark all notifications as read
    document.querySelector('.mark-all-read').addEventListener('click', () => {
      this.manager.markAllNotificationsRead();
    });
  }

  initializeDashboard() {
    // Load user's last feeling
    const lastFeeling = localStorage.getItem('lastUserFeeling');
    if (lastFeeling) {
      const feelingData = JSON.parse(lastFeeling);
      const today = new Date().toDateString();
      const lastFeelingDate = new Date(feelingData.timestamp).toDateString();
      
      // Reset feeling if it's a new day
      if (today !== lastFeelingDate) {
        localStorage.removeItem('lastUserFeeling');
      }
    }

    // Update health metrics with latest test results
    this.updateHealthMetrics();

    // Load recent activity
    this.loadRecentActivity();

    // Load reminders
    this.updateReminders();
  }

  updateHealthMetrics() {
    const metricsContainer = document.querySelector('.metrics-list');
    const metrics = this.manager.healthMetrics;

    // Update each metric
    Object.entries(metrics).forEach(([metricName, data]) => {
      if (data) {
        const value = data.value + (data.unit ? ` ${data.unit}` : '');
        this.manager.updateMetricDisplay(metricsContainer, metricName, value, data.timestamp);
      }
    });
  }

  loadRecentActivity() {
    const activitiesContainer = document.querySelector('.activity-list');
    const activities = this.manager.activities.slice(0, 3); // Show only 3 most recent

    activitiesContainer.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          ${this.getActivityIcon(activity.type)}
        </div>
        <div class="activity-details">
          <h4>${this.formatActivityTitle(activity)}</h4>
          <p>${activity.detail}</p>
          <span class="activity-date">${this.formatDate(new Date(activity.timestamp))}</span>
        </div>
      </div>
    `).join('');
  }

  updateReminders() {
    const remindersContainer = document.querySelector('.reminders-list');
    const reminders = this.manager.reminders;

    remindersContainer.innerHTML = reminders.map((reminder, index) => `
      <div class="reminder-item ${reminder.completed ? 'completed' : ''}">
        <div class="reminder-checkbox">
          <input type="checkbox" id="reminder-${index}" ${reminder.completed ? 'checked' : ''}>
          <label for="reminder-${index}"></label>
        </div>
        <div class="reminder-details">
          <h4>${reminder.title}</h4>
          <p>${this.formatDueDate(reminder.due)}</p>
        </div>
      </div>
    `).join('');

    // Reattach event listeners
    document.querySelectorAll('.reminder-checkbox input').forEach((checkbox, index) => {
      checkbox.addEventListener('change', () => {
        this.manager.toggleReminderCompleted(index);
      });
    });
  }

  showAddReminderModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Add New Reminder</h3>
        <form id="add-reminder-form">
          <div class="form-group">
            <label for="reminder-title">Title</label>
            <input type="text" id="reminder-title" required>
          </div>
          <div class="form-group">
            <label for="reminder-due">Due Date</label>
            <input type="date" id="reminder-due" required>
          </div>
          <div class="form-buttons">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Add Reminder</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('reminder-title').value;
      const due = document.getElementById('reminder-due').value;
      
      this.manager.addReminder(title, due);
      modal.remove();
    });
  }

  getActivityIcon(type) {
    const icons = {
      'heartRate': '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21s-6-4.35-9-8.5C-1.5 7.5 4.5 3 12 10.5 19.5 3 25.5 7.5 21 12.5 18 16.65 12 21 12 21z" fill="#F87171"/></svg>',
      'vision': '<svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6" fill="#2563EB"/><circle cx="12" cy="12" r="3" fill="#1E3A8A"/></svg>',
      'hearing': '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 3C7 3 3 7 3 12c0 5 4 9 9 9s9-4 9-9c0-5-4-9-9-9zm0 16a7 7 0 110-14 7 7 0 010 14z" fill="#059669"/></svg>',
      'feeling': '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#F59E42"/><ellipse cx="12" cy="15" rx="5" ry="2" fill="#fff"/></svg>',
      'reminder': '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#A78BFA"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>'
    };
    return icons[type] || icons['feeling'];
  }

  formatActivityTitle(activity) {
    const titles = {
      'heartRate': 'Heart Rate Measured',
      'vision': 'Vision Test Completed',
      'hearing': 'Hearing Test Completed',
      'feeling': 'Mood Check',
      'reminder': 'Reminder Added'
    };
    return titles[activity.type] || activity.type;
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  }

  formatDueDate(due) {
    const today = new Date();
    const dueDate = new Date(due);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});