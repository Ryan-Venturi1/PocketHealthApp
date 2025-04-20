// js/app.js - Main Application Initialization and Navigation

import DashboardManager from './dashboard-manager.js';
import HealthTestsManager from './health-tests-manager.js';
import AssistantUI from './assistant-ui.js';

/**
 * Main application class that controls navigation and integration between modules
 */
class App {
  constructor() {
    // Core managers
    this.dashboardManager = new DashboardManager();
    this.healthTestsManager = new HealthTestsManager();
    this.assistantUI = null; // Will be initialized when needed
    
    // Current page state
    this.currentPage = 'dashboard';
    this.activeModule = null;
    
    // Initialize core functionality
    this.init();
  }
  
  /**
   * Initialize the application
   */
  init() {
    // Check authentication (in a real app)
    this.checkAuthentication();
    
    // Set up navigation
    this.setupNavigation();
    
    // Handle initial navigation based on URL hash
    this.handleNavigation();
    
    // Initialize dashboard (default view)
    this.dashboardManager.initializeDashboard();
  }
  
  /**
   * Check if user is authenticated (simplified for demo)
   */
  checkAuthentication() {
    // In a real application, this would verify a token or session
    // For demo, we'll just check if userProfile exists in localStorage
    const userProfile = localStorage.getItem('userProfile');
    
    if (!userProfile) {
      // Create a default profile for demo
      const defaultProfile = {
        name: 'Demo User',
        email: 'demo@example.com',
        avatar: null,
        dob: '1990-01-01',
        gender: 'other'
      };
      
      localStorage.setItem('userProfile', JSON.stringify(defaultProfile));
    }
    
    return true;
  }
  
  /**
   * Set up navigation event listeners
   */
  setupNavigation() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      this.handleNavigation();
    });
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = e.currentTarget.getAttribute('href').substring(1);
        this.navigateTo(targetPage);
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
  }
  
  /**
   * Handle navigation based on URL hash
   */
  handleNavigation() {
    const hash = window.location.hash.substring(1) || 'dashboard';
    this.navigateTo(hash);
  }
  
  /**
   * Navigate to a specific page
   */
  navigateTo(page) {
    // Clean up current active module
    this.cleanupCurrentModule();
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(pageContent => {
      pageContent.classList.remove('active');
    });
    
    // Update active nav item
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
      item.classList.remove('active');
    });
    
    // Check if this is a subpage (e.g., health-tests/skin)
    let pageElement;
    let sidebarItem;
    
    if (page.includes('/')) {
      // This is a subpage (e.g., health-tests/skin)
      const [mainPage, subPage] = page.split('/');
      pageElement = document.getElementById(`${mainPage}-page`);
      sidebarItem = document.querySelector(`.sidebar-nav li a[href="#${mainPage}"]`);
      
      if (sidebarItem) {
        sidebarItem = sidebarItem.parentElement;
      }
      
      // Load the appropriate module
      this.loadModule(mainPage, subPage);
    } else {
      // This is a main page
      pageElement = document.getElementById(`${page}-page`);
      sidebarItem = document.querySelector(`.sidebar-nav li a[href="#${page}"]`);
      
      if (sidebarItem) {
        sidebarItem = sidebarItem.parentElement;
      }
      
      // Handle special pages
      this.loadMainPage(page);
    }
    
    if (pageElement) {
      pageElement.classList.add('active');
      
      // Update page title
      document.getElementById('current-page-title').textContent = this.formatPageTitle(page);
      
      // Update URL hash
      window.location.hash = `#${page}`;
      
      // Update current page state
      this.currentPage = page;
    } else {
      console.error(`Page "${page}" not found`);
      // Fallback to dashboard
      this.navigateTo('dashboard');
    }
    
    if (sidebarItem) {
      sidebarItem.classList.add('active');
    }
  }
  
  /**
   * Clean up current active module
   */
  cleanupCurrentModule() {
    // Stop camera if it's active
    if (this.activeModule === 'camera') {
      // In a real app, this would call a method to stop the camera
    }
    
    this.activeModule = null;
  }
  
  /**
   * Load a main page
   */
  loadMainPage(page) {
    switch (page) {
      case 'dashboard':
        this.dashboardManager.initializeDashboard();
        break;
      case 'health-tests':
        this.healthTestsManager.initializeDashboard();
        break;
      case 'health-assistant':
        this.initializeAssistant();
        break;
      case 'history':
        this.loadHistoryPage();
        break;
      case 'settings':
        this.loadSettingsPage();
        break;
    }
  }
  
  /**
   * Load a specific module
   */
  loadModule(mainPage, subPage) {
    if (mainPage === 'health-tests') {
      this.healthTestsManager.openTest(subPage);
      this.activeModule = subPage;
    }
  }
  
  /**
   * Initialize AI assistant
   */
  initializeAssistant() {
    // Initialize if not already done
    if (!this.assistantUI) {
      // Load the assistant UI script
      this.assistantUI = new AssistantUI();
    }
  }
  
  /**
   * Load history page
   */
  loadHistoryPage() {
    const historyPage = document.getElementById('history-page');
    if (!historyPage) return;
    
    // Get all activities from localStorage
    const activities = this.dashboardManager.loadActivities();
    
    // Sort by date, most recent first
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Group by month
    const groupedActivities = this.groupActivitiesByMonth(activities);
    
    // Generate HTML
    let historyHTML = `
      <div class="history-header">
        <h3>Your Health Activity</h3>
        <div class="history-filters">
          <div class="filter-group">
            <label for="history-filter">Filter by:</label>
            <select id="history-filter">
              <option value="all">All Activities</option>
              <option value="skin">Skin Analysis</option>
              <option value="wound">Wound Assessment</option>
              <option value="vision">Vision Tests</option>
              <option value="hearing">Hearing Tests</option>
              <option value="vitals">Vital Signs</option>
              <option value="motion">Range of Motion</option>
              <option value="assistant">AI Consultations</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="date-range">Time period:</label>
            <select id="date-range">
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="history-timeline">
    `;
    
    // Generate timeline for each month
    for (const [month, monthActivities] of Object.entries(groupedActivities)) {
      historyHTML += `
        <div class="timeline-month">
          <h4>${month}</h4>
      `;
      
      // Group by day
      const groupedByDay = this.groupActivitiesByDay(monthActivities);
      
      // Generate items for each day
      for (const [day, dayActivities] of Object.entries(groupedByDay)) {
        historyHTML += `
          <div class="timeline-item">
            <div class="timeline-date">
              <div class="date-circle">${day}</div>
              <div class="date-line"></div>
            </div>
            <div class="timeline-content">
        `;
        
        // Add each activity for this day
        dayActivities.forEach(activity => {
          const activityDate = new Date(activity.timestamp);
          const formattedTime = this.dashboardManager.formatTime(activityDate);
          
          // Determine icon and title based on activity type
          let icon, title;
          
          switch (activity.type) {
            case 'skin':
              icon = 'skin';
              title = 'Skin Analysis Completed';
              break;
            case 'wound':
              icon = 'wound';
              title = 'Wound Assessment Completed';
              break;
            case 'vision':
              icon = 'vision-test';
              title = 'Vision Test Completed';
              break;
            case 'hearing':
              icon = 'hearing-test';
              title = 'Hearing Test Completed';
              break;
            case 'vitals':
              icon = 'vitals';
              title = 'Heart Rate Measured';
              break;
            case 'motion':
              icon = 'motion';
              title = 'Motion Test Completed';
              break;
            case 'feeling':
              icon = 'feeling';
              title = 'Feeling Recorded';
              break;
            case 'consultation':
              icon = 'assistant';
              title = 'AI Consultation';
              break;
            default:
              icon = 'history';
              title = 'Health Activity';
          }
          
          historyHTML += `
            <div class="activity-item">
              <div class="activity-icon">
                <img src="assets/images/icons/${icon}.svg" alt="${title}" 
                     onerror="this.outerHTML='<div class=\\'icon-fallback\\'>${icon.charAt(0).toUpperCase()}</div>'">
              </div>
              <div class="activity-details">
                <h4>${title}</h4>
                <p>${activity.detail || 'No details available'}</p>
                <span class="activity-date">${formattedTime}</span>
              </div>
            </div>
          `;
        });
        
        historyHTML += `
            </div>
          </div>
        `;
      }
      
      historyHTML += `
        </div>
      `;
    }
    
    historyHTML += `
      </div>
      
      <div class="history-export">
        <button id="export-history" class="btn-primary">
          <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 2v10m-4-4l4 4 4-4" stroke="#fff" stroke-width="2" fill="none"/><path d="M3 12v4h14v-4" stroke="#fff" stroke-width="2" fill="none"/></svg>
          Export Health Data
        </button>
      </div>
    `;
    
    // Set the history page HTML
    historyPage.innerHTML = historyHTML;
    
    // Add event listeners
    this.setupHistoryEventListeners();
  }
  
  /**
   * Group activities by month
   */
  groupActivitiesByMonth(activities) {
    const grouped = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      
      grouped[monthKey].push(activity);
    });
    
    return grouped;
  }
  
  /**
   * Group activities by day
   */
  groupActivitiesByDay(activities) {
    const grouped = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dayKey = date.getDate().toString();
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      
      grouped[dayKey].push(activity);
    });
    
    // Sort keys in descending order (most recent day first)
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    );
  }
  
  /**
   * Set up event listeners for history page
   */
  setupHistoryEventListeners() {
    const filterSelect = document.getElementById('history-filter');
    const dateRangeSelect = document.getElementById('date-range');
    const exportButton = document.getElementById('export-history');
    
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        this.filterHistory();
      });
    }
    
    if (dateRangeSelect) {
      dateRangeSelect.addEventListener('change', () => {
        this.filterHistory();
      });
    }
    
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        this.exportHealthData();
      });
    }
  }
  
  /**
   * Filter history based on selected options
   */
  filterHistory() {
    const filterType = document.getElementById('history-filter').value;
    const dateRange = document.getElementById('date-range').value;
    
    // Get all activities
    let activities = this.dashboardManager.loadActivities();
    
    // Filter by type if not "all"
    if (filterType !== 'all') {
      activities = activities.filter(activity => activity.type === filterType);
    }
    
    // Filter by date range
    const now = new Date();
    let cutoffDate;
    
    switch (dateRange) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0); // Beginning of time
    }
    
    activities = activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= cutoffDate;
    });
    
    // Re-render history page with filtered activities
    if (activities.length === 0) {
      // No activities match the filter
      const historyTimeline = document.querySelector('.history-timeline');
      if (historyTimeline) {
        historyTimeline.innerHTML = `
          <div class="no-history">
            <p>No activities match your filter criteria.</p>
          </div>
        `;
      }
    } else {
      // Reload the history page with filtered activities
      this.loadHistoryPage();
    }
  }
  
  /**
   * Export health data as JSON
   */
  exportHealthData() {
    // Collect all health data
    const exportData = {
      userProfile: this.dashboardManager.userProfile,
      healthMetrics: this.dashboardManager.healthMetrics,
      activities: this.dashboardManager.activities,
      testResults: this.healthTestsManager.savedResults
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "health_data_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
  
  /**
   * Load settings page
   */
  loadSettingsPage() {
    const settingsPage = document.getElementById('settings-page');
    if (!settingsPage) return;
    
    // No need to implement this for the demo
    // The settings page HTML is already in the template
    
    // Just add event listeners for the settings functionality
    this.setupSettingsEventListeners();
  }
  
  /**
   * Set up event listeners for settings page
   */
  setupSettingsEventListeners() {
    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.settings-tab').forEach(t => {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        
        // Show corresponding section
        document.querySelectorAll('.settings-section').forEach(section => {
          section.classList.remove('active');
        });
        document.getElementById(`${targetTab}-settings`).classList.add('active');
      });
    });
    
    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const name = document.getElementById('profile-display-name').value;
        const dob = document.getElementById('profile-dob').value;
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const height = document.getElementById('profile-height').value;
        const heightUnit = document.getElementById('height-unit').value;
        const weight = document.getElementById('profile-weight').value;
        const weightUnit = document.getElementById('weight-unit').value;
        
        // Get selected medical conditions
        const conditionCheckboxes = document.querySelectorAll('input[name="conditions"]:checked');
        const conditions = Array.from(conditionCheckboxes).map(cb => cb.value);
        
        // Create profile object
        const profile = {
          ...this.dashboardManager.userProfile,
          name,
          dob,
          gender,
          height,
          heightUnit,
          weight,
          weightUnit,
          conditions
        };
        
        // Save profile
        this.dashboardManager.saveUserProfile(profile);
        
        // Show success message
        alert('Profile updated successfully!');
      });
    }
  }
  
  /**
   * Format page title from URL path
   */
  formatPageTitle(page) {
    if (page.includes('/')) {
      const [mainPage, subPage] = page.split('/');
      return `${this.formatString(subPage)} Test`;
    }
    
    return this.formatString(page);
  }
  
  /**
   * Format string for display (capitalize words, replace hyphens)
   */
  formatString(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.healthApp = new App();
});

// Make app global for debugging
window.App = App;