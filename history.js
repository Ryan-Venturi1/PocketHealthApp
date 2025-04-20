// history.js - Handles displaying test history and results

class TestHistory {
    constructor() {
      // Initialize once DOM is loaded
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeHistory();
      });
    }
  
    initializeHistory() {
      // Check if we're on the history page
      if (document.getElementById('history-page')) {
        this.loadHistoryPage();
      }
    }
  
    loadHistoryPage() {
      const historyPage = document.getElementById('history-page');
      if (!historyPage) return;
      
      // Get all activities from localStorage
      const activities = JSON.parse(localStorage.getItem('healthActivities') || '[]');
      
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
                <option value="reaction">Reaction Tests</option>
                <option value="tremor">Tremor Analysis</option>
                <option value="balance">Balance Tests</option>
                <option value="respiratory">Respiratory Rate</option>
                <option value="consultation">AI Consultations</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="date-range">Time period:</label>
              <select id="date-range">
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last year</option>
                <option value="all" selected>All time</option>
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
            const formattedTime = this.formatTime(activityDate);
            
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
              case 'reaction':
                icon = 'reaction';
                title = 'Reaction Test Completed';
                break;
              case 'tremor':
                icon = 'tremor';
                title = 'Tremor Analysis Completed';
                break;
              case 'balance':
                icon = 'balance';
                title = 'Balance Test Completed';
                break;
              case 'respiratory':
                icon = 'respiratory';
                title = 'Respiratory Rate Measured';
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
                  <button class="btn-text view-details" data-type="${activity.type}" data-timestamp="${activity.timestamp}">View Details</button>
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
  
        <!-- Modal for displaying test details -->
        <div id="test-details-modal" class="modal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="test-details-title">Test Details</h3>
              <button class="close-modal">&times;</button>
            </div>
            <div id="test-details-content" class="modal-body">
              <!-- Test details will be loaded here -->
            </div>
          </div>
        </div>
      `;
      
      // Set the history page HTML
      historyPage.innerHTML = historyHTML;
      
      // Add event listeners
      this.setupHistoryEventListeners();
    }
    
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
  
      // View details buttons
      document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', (e) => {
          const type = e.target.dataset.type;
          const timestamp = e.target.dataset.timestamp;
          this.showTestDetails(type, timestamp);
        });
      });
  
      // Close modal button
      const closeModalBtn = document.querySelector('.close-modal');
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
          document.getElementById('test-details-modal').style.display = 'none';
        });
      }
  
      // Close modal when clicking outside
      window.addEventListener('click', (e) => {
        const modal = document.getElementById('test-details-modal');
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  
    showTestDetails(type, timestamp) {
      // Get test results from localStorage
      const testResults = JSON.parse(localStorage.getItem('healthTestResults') || '{}');
      
      // Find the specific test result
      let result = null;
      if (testResults[type]) {
        result = testResults[type].find(test => test.timestamp === timestamp);
      }
      
      // Update modal title
      const modalTitle = document.getElementById('test-details-title');
      let testTitle = 'Test Details';
      
      switch (type) {
        case 'skin': testTitle = 'Skin Analysis'; break;
        case 'wound': testTitle = 'Wound Assessment'; break;
        case 'vision': testTitle = 'Vision Test'; break;
        case 'hearing': testTitle = 'Hearing Test'; break;
        case 'vitals': testTitle = 'Heart Rate Measurement'; break;
        case 'motion': testTitle = 'Motion Test'; break;
        case 'reaction': testTitle = 'Reaction Test'; break;
        case 'tremor': testTitle = 'Tremor Analysis'; break;
        case 'balance': testTitle = 'Balance Test'; break;
        case 'respiratory': testTitle = 'Respiratory Rate'; break;
      }
      
      modalTitle.textContent = testTitle;
      
      // Update modal content
      const modalContent = document.getElementById('test-details-content');
      
      if (!result) {
        modalContent.innerHTML = '<p>No detailed data available for this test.</p>';
      } else {
        // Create HTML based on test type
        let detailsHTML = '';
        
        // Format the date
        const testDate = new Date(result.timestamp);
        const formattedDate = testDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
        
        // Generic header
        detailsHTML += `
          <div class="result-header">
            <span class="result-timestamp">Test completed on ${formattedDate}</span>
          </div>
        `;
        
        // Type-specific details
        switch (type) {
          case 'vitals':
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Heart Rate:</span>
                  <span class="detail-value">${result.heartRate} BPM</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${result.category || 'Not available'}</span>
                </div>
              </div>
            `;
            break;
            
          case 'vision':
            detailsHTML += `
              <div class="result-details">
                <div class="eye-results">
                  <div class="right-eye">
                    <h5>Right Eye</h5>
                    <div class="detail-row">
                      <span class="detail-label">Visual Acuity:</span>
                      <span class="detail-value">${result.rightEye?.acuity || 'Not tested'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Category:</span>
                      <span class="detail-value">${result.rightEye?.category || 'Not available'}</span>
                    </div>
                  </div>
                  <div class="left-eye">
                    <h5>Left Eye</h5>
                    <div class="detail-row">
                      <span class="detail-label">Visual Acuity:</span>
                      <span class="detail-value">${result.leftEye?.acuity || 'Not tested'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Category:</span>
                      <span class="detail-value">${result.leftEye?.category || 'Not available'}</span>
                    </div>
                  </div>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Better Eye:</span>
                  <span class="detail-value">${result.betterEye === 'right' ? 'Right' : 'Left'} (${result.betterEyeAcuity})</span>
                </div>
              </div>
            `;
            break;
            
          case 'hearing':
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Hearing Status:</span>
                  <span class="detail-value">${result.category || 'Not available'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Average Deviation:</span>
                  <span class="detail-value">${result.avgDeviation ? result.avgDeviation + ' dB' : 'Not available'}</span>
                </div>
                <h5>Frequency Thresholds</h5>
            `;
            
            // Add thresholds if available
            if (result.thresholds) {
              Object.entries(result.thresholds).forEach(([frequency, threshold]) => {
                detailsHTML += `
                  <div class="detail-row">
                    <span class="detail-label">${frequency} Hz:</span>
                    <span class="detail-value">${threshold}</span>
                  </div>
                `;
              });
            }
            
            detailsHTML += `</div>`;
            break;
            
          case 'skin':
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Primary Assessment:</span>
                  <span class="detail-value">${result.topCondition || 'Not available'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Confidence:</span>
                  <span class="detail-value">${result.confidence ? result.confidence + '%' : 'Not available'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Needs Doctor:</span>
                  <span class="detail-value">${result.needsDoctor ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Cancer Risk:</span>
                  <span class="detail-value">${result.isCancerous ? 'Elevated' : 'Low'}</span>
                </div>
              </div>
            `;
            break;
            
          case 'reaction':
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Best Reaction Time:</span>
                  <span class="detail-value">${result.bestReactionTime} ms</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Average Reaction Time:</span>
                  <span class="detail-value">${result.averageReactionTime} ms</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${result.category || 'Not available'}</span>
                </div>
              </div>
            `;
            break;
            
          case 'balance':
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Balance Score:</span>
                  <span class="detail-value">${result.balanceScore}%</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${result.category || 'Not available'}</span>
                </div>
              </div>
            `;
            break;
            
          case 'respiratory':
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Breaths per Minute:</span>
                  <span class="detail-value">${result.breathsPerMinute}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">${result.category || 'Not available'}</span>
                </div>
              </div>
            `;
            break;
            
          default:
            // Generic display for other test types
            detailsHTML += `
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Summary:</span>
                  <span class="detail-value">${result.summary || 'No summary available'}</span>
                </div>
              </div>
            `;
            
            // Add any available properties
            Object.entries(result).forEach(([key, value]) => {
              // Skip some technical properties
              if (key !== 'timestamp' && key !== 'summary' && 
                  typeof value !== 'object' && typeof value !== 'function') {
                detailsHTML += `
                  <div class="detail-row">
                    <span class="detail-label">${this.formatPropertyName(key)}:</span>
                    <span class="detail-value">${value}</span>
                  </div>
                `;
              }
            });
        }
        
        // Add recommendation if available
        if (result.recommendation) {
          detailsHTML += `
            <div class="recommendation">
              <h5>Recommendation</h5>
              <p>${result.recommendation}</p>
            </div>
          `;
        }
        
        modalContent.innerHTML = detailsHTML;
      }
      
      // Show the modal
      document.getElementById('test-details-modal').style.display = 'block';
    }
    
    formatPropertyName(key) {
      // Convert camelCase to Title Case with spaces
      return key
        // Insert a space before all capital letters
        .replace(/([A-Z])/g, ' $1')
        // Uppercase the first character
        .replace(/^./, str => str.toUpperCase());
    }
    
    filterHistory() {
      const filterType = document.getElementById('history-filter').value;
      const dateRange = document.getElementById('date-range').value;
      
      // Get all activities
      let activities = JSON.parse(localStorage.getItem('healthActivities') || '[]');
      
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
      
      // Sort by date, most recent first
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Group by month
      const groupedActivities = this.groupActivitiesByMonth(activities);
      
      // Update the timeline
      const timelineContainer = document.querySelector('.history-timeline');
      
      if (activities.length === 0) {
        timelineContainer.innerHTML = `
          <div class="no-history">
            <p>No activities match your filter criteria.</p>
          </div>
        `;
        return;
      }
      
      let timelineHTML = '';
      
      // Generate timeline for each month
      for (const [month, monthActivities] of Object.entries(groupedActivities)) {
        timelineHTML += `
          <div class="timeline-month">
            <h4>${month}</h4>
        `;
        
        // Group by day
        const groupedByDay = this.groupActivitiesByDay(monthActivities);
        
        // Generate items for each day
        for (const [day, dayActivities] of Object.entries(groupedByDay)) {
          timelineHTML += `
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
            const formattedTime = this.formatTime(activityDate);
            
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
              case 'reaction':
                icon = 'reaction';
                title = 'Reaction Test Completed';
                break;
              case 'tremor':
                icon = 'tremor';
                title = 'Tremor Analysis Completed';
                break;
              case 'balance':
                icon = 'balance';
                title = 'Balance Test Completed';
                break;
              case 'respiratory':
                icon = 'respiratory';
                title = 'Respiratory Rate Measured';
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
            
            timelineHTML += `
              <div class="activity-item">
                <div class="activity-icon">
                  <img src="assets/images/icons/${icon}.svg" alt="${title}" 
                       onerror="this.outerHTML='<div class=\\'icon-fallback\\'>${icon.charAt(0).toUpperCase()}</div>'">
                </div>
                <div class="activity-details">
                  <h4>${title}</h4>
                  <p>${activity.detail || 'No details available'}</p>
                  <span class="activity-date">${formattedTime}</span>
                  <button class="btn-text view-details" data-type="${activity.type}" data-timestamp="${activity.timestamp}">View Details</button>
                </div>
              </div>
            `;
          });
          
          timelineHTML += `
              </div>
            </div>
          `;
        }
        
        timelineHTML += `
          </div>
        `;
      }
      
      // Update the timeline container
      timelineContainer.innerHTML = timelineHTML;
      
      // Re-add event listeners for the new buttons
      document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', (e) => {
          const type = e.target.dataset.type;
          const timestamp = e.target.dataset.timestamp;
          this.showTestDetails(type, timestamp);
        });
      });
    }
    
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
    
    exportHealthData() {
      // Collect all health data
      const exportData = {
        testResults: JSON.parse(localStorage.getItem('healthTestResults') || '{}'),
        activities: JSON.parse(localStorage.getItem('healthActivities') || '[]'),
        reminders: JSON.parse(localStorage.getItem('reminders') || '[]')
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
  
    formatTime(date) {
      const options = { hour: 'numeric', minute: '2-digit', hour12: true };
      return date.toLocaleTimeString('en-US', options);
    }
  }
  
  // Initialize the test history
  const testHistory = new TestHistory();
  
  export default testHistory;