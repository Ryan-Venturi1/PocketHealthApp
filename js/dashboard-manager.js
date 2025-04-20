// js/dashboard-manager.js - Dashboard and LocalStorage Implementation

/**
 * Manages the dashboard and localStorage integration
 */
class DashboardManager {
    constructor() {
      this.userProfile = this.loadUserProfile();
      this.healthMetrics = this.loadHealthMetrics();
      this.activities = this.loadActivities();
      this.reminders = this.loadReminders();
    }
    
    /**
     * Initialize the dashboard
     */
    initializeDashboard() {
      // Update user interface with data
      this.updateUserInterface();
      
      // Set up dashboard event listeners
      this.setupEventListeners();
      
      // Load recent activity
      this.loadRecentActivity();
      
      // Load health metrics
      this.updateHealthMetrics();
      
      // Load reminders
      this.updateReminders();
      
      // Setup feeling buttons
      this.setupFeelingButtons();
    }
    
    /**
     * Update the UI with user profile data
     */
    updateUserInterface() {
      // Update user info in sidebar
      document.getElementById('user-name').textContent = this.userProfile.name;
      document.getElementById('user-email').textContent = this.userProfile.email;
      
      // Update welcome message
      const welcomeName = document.getElementById('welcome-name');
      if (welcomeName) {
        welcomeName.textContent = this.userProfile.name.split(' ')[0];
      }
      
      // Update user avatar if available
      if (this.userProfile.avatar) {
        const avatarElements = document.querySelectorAll('.user-avatar img, #user-avatar');
        avatarElements.forEach(element => {
          element.src = this.userProfile.avatar;
        });
      }
    }
    
    /**
     * Set up event listeners for the dashboard
     */
    setupEventListeners() {
      // Quick action buttons
      document.querySelectorAll('.action-item').forEach(action => {
        action.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPage = e.currentTarget.getAttribute('href')?.substring(1) || 
                             e.currentTarget.dataset.test ? 
                             `health-tests/${e.currentTarget.dataset.test}` : 
                             'health-tests';
          
          window.location.hash = `#${targetPage}`;
        });
      });
      
      // Quick buttons in header
      const quickTestBtn = document.getElementById('quick-test');
      const talkAssistantBtn = document.getElementById('talk-assistant');
      
      if (quickTestBtn) {
        quickTestBtn.addEventListener('click', () => {
          window.location.hash = '#health-tests';
        });
      }
      
      if (talkAssistantBtn) {
        talkAssistantBtn.addEventListener('click', () => {
          window.location.hash = '#health-assistant';
        });
      }
      
      // Add reminder button
      const addReminderBtn = document.querySelector('.add-reminder');
      if (addReminderBtn) {
        addReminderBtn.addEventListener('click', () => {
          this.showAddReminderModal();
        });
      }
      
      // Reminders checkbox handling
      const remindersList = document.querySelector('.reminders-list');
      if (remindersList) {
        remindersList.addEventListener('change', (e) => {
          if (e.target.type === 'checkbox') {
            const reminderId = e.target.id.replace('reminder-', '');
            this.toggleReminderCompleted(parseInt(reminderId));
          }
        });
      }
      
      // Modal backdrop handling
      const modalBackdrop = document.getElementById('modal-backdrop');
      if (modalBackdrop) {
        modalBackdrop.addEventListener('click', () => {
          this.closeModal();
        });
      }
      
      // Notifications toggle
      const notificationsToggle = document.getElementById('notifications-toggle');
      const notificationsPanel = document.getElementById('notifications-panel');
      const notificationsClose = document.getElementById('notifications-close');
      
      if (notificationsToggle && notificationsPanel) {
        notificationsToggle.addEventListener('click', () => {
          notificationsPanel.classList.toggle('open');
          modalBackdrop.classList.toggle('open');
        });
        
        if (notificationsClose) {
          notificationsClose.addEventListener('click', () => {
            notificationsPanel.classList.remove('open');
            modalBackdrop.classList.remove('open');
          });
        }
      }
      
      // Mark all notifications as read
      const markAllRead = document.querySelector('.mark-all-read');
      if (markAllRead) {
        markAllRead.addEventListener('click', () => {
          this.markAllNotificationsRead();
        });
      }
      
      // Logout button
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          // In a real app, this would handle backend logout
          // For demo, just clear localStorage and redirect
          if (confirm('Are you sure you want to log out?')) {
            // Keep test results but clear session data
            localStorage.removeItem('userSession');
            window.location.href = 'signinup.html';
          }
        });
      }
    }
    
    /**
     * Set up feeling buttons on dashboard
     */
    setupFeelingButtons() {
      const feelingButtons = document.querySelectorAll('.feel-btn');
      if (feelingButtons) {
        feelingButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const feeling = btn.dataset.feeling;
            this.recordUserFeeling(feeling);
          });
        });
      }
    }
    
    /**
     * Record user's feeling and provide appropriate response
     */
    recordUserFeeling(feeling) {
      // Save the feeling to local storage
      const feelingData = {
        feeling, 
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('lastUserFeeling', JSON.stringify(feelingData));
      
      // Add to activities
      this.addActivity({
        type: 'feeling',
        detail: `User reported feeling ${feeling}`,
        timestamp: new Date().toISOString()
      });
      
      // Show appropriate toast message
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
      
      this.showToast(message);
      
      // If feeling bad, suggest talking to the assistant
      if (feeling === 'bad') {
        setTimeout(() => {
          const talkBtn = document.createElement('button');
          talkBtn.className = 'btn-primary';
          talkBtn.textContent = 'Talk to Assistant';
          talkBtn.addEventListener('click', () => {
            window.location.hash = '#health-assistant';
          });
          
          this.showToast("Our AI assistant can help recommend tests or provide guidance.", 5000, talkBtn);
        }, 2000);
      }
    }
    
    /**
     * Load and display recent activity
     */
    loadRecentActivity() {
      const activityList = document.querySelector('.activity-list');
      if (!activityList) return;
      
      // Sort activities by timestamp, most recent first
      const sortedActivities = [...this.activities].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      // Get the 3 most recent activities
      const recentActivities = sortedActivities.slice(0, 3);
      
      if (recentActivities.length === 0) {
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
      recentActivities.forEach(activity => {
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
            icon = 'vitals';
            title = 'Heart Rate Measured';
            details = activity.detail || 'Vitals check performed';
            break;
          case 'motion':
            icon = 'motion';
            title = 'Motion Test Completed';
            details = activity.detail || 'Motion test performed';
            break;
          case 'feeling':
            icon = 'feeling';
            title = 'Feeling Recorded';
            details = activity.detail || 'User recorded how they feel';
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
            <img src="assets/images/icons/${icon}.svg" alt="${title}" 
                 onerror="this.outerHTML='<div class=\'icon-fallback\'>${icon.charAt(0).toUpperCase()}</div>'">
          </div>
          <div class="activity-details">
            <h4>${title}</h4>
            <p>${details}</p>
            <span class="activity-date">${this.formatDate(timestamp)} - ${this.formatTime(timestamp)}</span>
          </div>
        `;
        
        activityList.appendChild(activityItem);
      });
      
      // Add "View all" link if there are more than 3 activities
      if (this.activities.length > 3) {
        const viewAllLink = document.createElement('a');
        viewAllLink.href = '#history';
        viewAllLink.className = 'view-all';
        viewAllLink.textContent = 'View all activity';
        activityList.appendChild(viewAllLink);
      }
    }
    
    /**
     * Update health metrics display
     */
    updateHealthMetrics() {
      const metricsList = document.querySelector('.metrics-list');
      if (!metricsList) return;
      
      // Update heart rate
      if (this.healthMetrics.heartRate) {
        this.updateMetricDisplay(
          metricsList,
          'Heart Rate',
          `${this.healthMetrics.heartRate.value} <span>${this.healthMetrics.heartRate.unit}</span>`,
          this.healthMetrics.heartRate.timestamp
        );
      }
      
      // Update vision metric
      if (this.healthMetrics.vision) {
        this.updateMetricDisplay(
          metricsList,
          'Vision',
          this.healthMetrics.vision.value,
          this.healthMetrics.vision.timestamp
        );
      }
      
      // Update hearing metric
      if (this.healthMetrics.hearing) {
        this.updateMetricDisplay(
          metricsList,
          'Hearing',
          this.healthMetrics.hearing.value,
          this.healthMetrics.hearing.timestamp
        );
      }
    }
    
    /**
     * Update a specific metric display
     */
    updateMetricDisplay(container, metricName, value, timestamp) {
      const metricItems = container.querySelectorAll('.metric-item');
      
      for (const item of metricItems) {
        const title = item.querySelector('h4').textContent;
        
        if (title === metricName) {
          const valueElement = item.querySelector('p');
          const dateElement = item.querySelector('.metric-date');
          
          if (valueElement) {
            valueElement.innerHTML = value;
          }
          
          if (dateElement && timestamp) {
            const date = new Date(timestamp);
            dateElement.textContent = `Last check: ${this.formatDate(date)}`;
          } else if (dateElement) {
            dateElement.textContent = 'Not measured yet';
          }
          
          break;
        }
      }
    }
    
    /**
     * Update reminders display
     */
    updateReminders() {
      const remindersList = document.querySelector('.reminders-list');
      if (!remindersList) return;
      
      if (this.reminders.length === 0) {
        remindersList.innerHTML = `
          <div class="no-reminders">
            <p>No reminders set. Add a reminder to get started.</p>
          </div>
        `;
        return;
      }
      
      // Sort reminders by due date
      const sortedReminders = [...this.reminders].sort((a, b) => {
        return new Date(a.due) - new Date(b.due);
      });
      
      // Show up to 3 reminders
      const displayReminders = sortedReminders.slice(0, 3);
      
      remindersList.innerHTML = displayReminders.map((reminder, index) => `
        <div class="reminder-item${reminder.completed ? ' completed' : ''}">
          <div class="reminder-checkbox">
            <input type="checkbox" id="reminder-${index}" ${reminder.completed ? 'checked' : ''}>
            <label for="reminder-${index}"></label>
          </div>
          <div class="reminder-details">
            <h4>${reminder.title}</h4>
            <p>${reminder.due}</p>
          </div>
        </div>
      `).join('');
    }
    
    /**
     * Show modal to add new reminder
     */
    showAddReminderModal() {
      const modalContainer = document.getElementById('modal-container');
      const modalBackdrop = document.getElementById('modal-backdrop');
      
      if (!modalContainer || !modalBackdrop) return;
      
      modalContainer.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3>Add Reminder</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="reminder-title">Reminder Title</label>
              <input type="text" id="reminder-title" placeholder="Enter reminder title">
            </div>
            <div class="form-group">
              <label for="reminder-due">Due Date</label>
              <input type="date" id="reminder-due">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="modal-cancel">Cancel</button>
            <button class="btn-primary" id="modal-save">Save Reminder</button>
          </div>
        </div>
      `;
      
      // Show modal
      modalContainer.classList.add('open');
      modalBackdrop.classList.add('open');
      
      // Set minimum date to today
      const dueDateInput = document.getElementById('reminder-due');
      if (dueDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dueDateInput.min = `${yyyy}-${mm}-${dd}`;
      }
      
      // Add event listeners
      const closeButton = modalContainer.querySelector('.modal-close');
      const cancelButton = document.getElementById('modal-cancel');
      const saveButton = document.getElementById('modal-save');
      
      if (closeButton) {
        closeButton.addEventListener('click', () => this.closeModal());
      }
      
      if (cancelButton) {
        cancelButton.addEventListener('click', () => this.closeModal());
      }
      
      if (saveButton) {
        saveButton.addEventListener('click', () => {
          const title = document.getElementById('reminder-title').value.trim();
          const dueDate = document.getElementById('reminder-due').value;
          
          if (!title || !dueDate) {
            this.showToast('Please fill in all fields.', 3000, null, true);
            return;
          }
          
          // Format due date
          const due = new Date(dueDate);
          const formattedDue = this.formatDate(due);
          
          // Add reminder
          this.addReminder(title, formattedDue);
          
          // Close modal
          this.closeModal();
          
          // Show confirmation
          this.showToast('Reminder added successfully.');
        });
      }
    }
    
    /**
     * Close modal
     */
    closeModal() {
      const modalContainer = document.getElementById('modal-container');
      const modalBackdrop = document.getElementById('modal-backdrop');
      
      if (modalContainer) {
        modalContainer.classList.remove('open');
      }
      
      if (modalBackdrop) {
        modalBackdrop.classList.remove('open');
      }
    }
    
    /**
     * Toggle reminder completed status
     */
    toggleReminderCompleted(index) {
      if (index >= 0 && index < this.reminders.length) {
        this.reminders[index].completed = !this.reminders[index].completed;
        
        // Save to localStorage
        localStorage.setItem('reminders', JSON.stringify(this.reminders));
        
        // Update UI
        this.updateReminders();
      }
    }
    
    /**
     * Add a new reminder
     */
    addReminder(title, due) {
      const reminder = {
        title,
        due,
        completed: false,
        timestamp: new Date().toISOString()
      };
      
      // Add to reminders array
      this.reminders.push(reminder);
      
      // Save to localStorage
      localStorage.setItem('reminders', JSON.stringify(this.reminders));
      
      // Update UI
      this.updateReminders();
      
      // Add to activities
      this.addActivity({
        type: 'reminder',
        detail: `Added reminder: ${title}`,
        timestamp: new Date().toISOString()
      });
    }
    
    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead() {
      const notifications = document.querySelectorAll('.notification-item.unread');
      notifications.forEach(notification => {
        notification.classList.remove('unread');
      });
      
      // Hide notification indicator
      const indicator = document.querySelector('.notification-indicator');
      if (indicator) {
        indicator.style.display = 'none';
      }
      
      // Store state in localStorage
      localStorage.setItem('notificationsRead', 'true');
    }
    
    /**
     * Add an activity to the history
     */
    addActivity(activity) {
      // Add to activities array
      this.activities.unshift(activity);
      
      // Limit to 50 activities
      if (this.activities.length > 50) {
        this.activities = this.activities.slice(0, 50);
      }
      
      // Save to localStorage
      localStorage.setItem('healthActivities', JSON.stringify(this.activities));
      
      // Update UI if on dashboard
      if (window.location.hash === '' || window.location.hash === '#dashboard') {
        this.loadRecentActivity();
      }
    }
    
    /**
     * Update a health metric
     */
    updateHealthMetric(metricName, value, unit = null) {
      // Create metric object
      const metric = {
        value,
        timestamp: new Date().toISOString(),
        ...(unit ? { unit } : {})
      };
      
      // Update metrics object
      this.healthMetrics[metricName] = metric;
      
      // Save to localStorage
      localStorage.setItem('healthMetrics', JSON.stringify(this.healthMetrics));
      
      // Update UI if on dashboard
      if (window.location.hash === '' || window.location.hash === '#dashboard') {
        this.updateHealthMetrics();
      }
      
      // Add activity for metric update
      this.addActivity({
        type: metricName.toLowerCase(),
        detail: `Measured ${metricName}: ${value}${unit ? ' ' + unit : ''}`,
        timestamp: new Date().toISOString()
      });
    }
    
    /**
     * Show a toast notification
     */
    showToast(message, duration = 3000, actionButton = null, isError = false) {
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
    
    /**
     * Format a date for display
     */
    formatDate(date) {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Format a time for display
     */
    formatTime(date) {
      const options = { hour: 'numeric', minute: 'numeric', hour12: true };
      return date.toLocaleTimeString('en-US', options);
    }
    
    /* LocalStorage Functions */
    
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
     * Load health metrics from localStorage
     */
    loadHealthMetrics() {
      const savedMetrics = localStorage.getItem('healthMetrics');
      return savedMetrics ? JSON.parse(savedMetrics) : {
        heartRate: null,
        vision: null,
        hearing: null
      };
    }
    
    /**
     * Load activities from localStorage
     */
    loadActivities() {
      const savedActivities = localStorage.getItem('healthActivities');
      return savedActivities ? JSON.parse(savedActivities) : [];
    }
    
    /**
     * Load reminders from localStorage
     */
    loadReminders() {
      const savedReminders = localStorage.getItem('reminders');
      return savedReminders ? JSON.parse(savedReminders) : [];
    }
    
    /**
     * Save user profile to localStorage
     */
    saveUserProfile(profile) {
      localStorage.setItem('userProfile', JSON.stringify(profile));
      this.userProfile = profile;
      this.updateUserInterface();
    }
  }
  
  // Export the DashboardManager class
  export default DashboardManager;