// dashboard-results.js - Handles loading and displaying test results on the dashboard

class DashboardResults {
    constructor() {
      // Initialize once DOM is loaded
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeResults();
      });
    }
  
    initializeResults() {
      // Load test results and update the dashboard
      this.loadHealthMetricsFromTests();
      this.loadRecentActivityFromTests();
    }
  
    // Load health metrics from test results
    loadHealthMetricsFromTests() {
      const metricsContainer = document.getElementById('metrics-list');
      if (!metricsContainer) return;
  
      // Get test results from localStorage
      const testResults = JSON.parse(localStorage.getItem('healthTestResults') || '{}');
      
      // Create an array to hold metrics
      const metrics = [];
      
      // Process test results to extract metrics
      Object.entries(testResults).forEach(([testType, tests]) => {
        // Get most recent test of this type
        if (tests.length > 0) {
          const latestTest = tests[tests.length - 1];
          
          // Create metric object based on test type
          switch (testType) {
            case 'vitals':
              if (latestTest.heartRate) {
                metrics.push({
                  id: Date.now(),
                  type: 'heart',
                  name: 'Heart Rate',
                  value: latestTest.heartRate,
                  unit: 'bpm',
                  date: latestTest.timestamp
                });
              }
              break;
            case 'vision':
              if (latestTest.betterEyeAcuity) {
                metrics.push({
                  id: Date.now() + 1,
                  type: 'vision',
                  name: 'Vision',
                  value: latestTest.betterEyeAcuity,
                  date: latestTest.timestamp
                });
              }
              break;
            case 'hearing':
              if (latestTest.category) {
                metrics.push({
                  id: Date.now() + 2,
                  type: 'hearing',
                  name: 'Hearing',
                  value: latestTest.category,
                  date: latestTest.timestamp
                });
              }
              break;
            case 'respiratoryRate':
              if (latestTest.breathsPerMinute) {
                metrics.push({
                  id: Date.now() + 3,
                  type: 'respiratory',
                  name: 'Respiratory Rate',
                  value: latestTest.breathsPerMinute,
                  unit: 'bpm',
                  date: latestTest.timestamp
                });
              }
              break;
            case 'reaction':
              if (latestTest.bestReactionTime) {
                metrics.push({
                  id: Date.now() + 4,
                  type: 'reaction',
                  name: 'Reaction Time',
                  value: latestTest.bestReactionTime,
                  unit: 'ms',
                  date: latestTest.timestamp
                });
              }
              break;
            case 'tremor':
              if (latestTest.balanceScore) {
                metrics.push({
                  id: Date.now() + 5,
                  type: 'tremor',
                  name: 'Tremor Score',
                  value: latestTest.balanceScore,
                  unit: '%',
                  date: latestTest.timestamp
                });
              }
              break;
          }
        }
      });
      
      // Clear container
      metricsContainer.innerHTML = '';
      
      // Check if there are metrics to display
      if (metrics.length === 0) {
        metricsContainer.innerHTML = `
          <div class="no-data-message">
            <p>No health metrics recorded yet. Complete a health test to see your results here.</p>
            <a href="health-tests.html" class="btn-text">Go to Health Tests</a>
          </div>
        `;
        return;
      }
      
      // Add each metric to the container
      metrics.forEach(metric => {
        const metricElement = this.createMetricElement(metric);
        metricsContainer.appendChild(metricElement);
      });
    }
    
    // Create the HTML element for a metric
    createMetricElement(metric) {
      const metricDiv = document.createElement('div');
      metricDiv.className = 'metric-item';
      
      let iconSvg = '';
      switch(metric.type) {
        case 'heart':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21s-6-4.35-9-8.5C-1.5 7.5 4.5 3 12 10.5 19.5 3 25.5 7.5 21 12.5 18 16.65 12 21 12 21z" fill="#F87171"/></svg>';
          break;
        case 'vision':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6" fill="#2563EB"/><circle cx="12" cy="12" r="3" fill="#1E3A8A"/></svg>';
          break;
        case 'hearing':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 3C7 3 3 7 3 12c0 5 4 9 9 9s9-4 9-9c0-5-4-9-9-9zm0 16a7 7 0 110-14 7 7 0 010 14z" fill="#059669"/></svg>';
          break;
        case 'respiratory':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 12h4l2 6 4-12 2 6h4" stroke="#B91C1C" stroke-width="2" fill="none"/></svg>';
          break;
        case 'reaction':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#F59E42" stroke-width="2" fill="none"/></svg>';
          break;
        case 'tremor':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke="#6366F1" stroke-width="2" fill="none"/></svg>';
          break;
        default:
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6B7280"/></svg>';
      }
      
      // Format date
      const date = new Date(metric.date);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      metricDiv.innerHTML = `
        <div class="metric-icon ${metric.type}-rate">
          ${iconSvg}
        </div>
        <div class="metric-data">
          <h4>${metric.name}</h4>
          <p>${metric.value} <span>${metric.unit || ''}</span></p>
          <span class="metric-date">Last check: ${formattedDate}</span>
        </div>
      `;
      
      return metricDiv;
    }
    
    // Load recent activity from health test results
    loadRecentActivityFromTests() {
      const activityContainer = document.getElementById('activity-list');
      if (!activityContainer) return;
      
      // Get activities from localStorage
      const activities = JSON.parse(localStorage.getItem('healthActivities') || '[]');
      
      // Clear container
      activityContainer.innerHTML = '';
      
      // Check if there are activities to display
      if (activities.length === 0) {
        activityContainer.innerHTML = `
          <div class="no-data-message">
            <p>No recent activity recorded yet. Complete a health test to track your activity.</p>
          </div>
        `;
        return;
      }
      
      // Show only the 3 most recent activities
      const recentActivities = activities.slice(0, 3);
      
      // Add each activity to the container
      recentActivities.forEach(activity => {
        const activityElement = this.createActivityElement(activity);
        activityContainer.appendChild(activityElement);
      });
      
      // Add "View all" link if there are more than 3 activities
      if (activities.length > 3) {
        const viewAllLink = document.createElement('a');
        viewAllLink.href = 'history.html';
        viewAllLink.className = 'view-all';
        viewAllLink.textContent = 'View all activity';
        activityContainer.appendChild(viewAllLink);
      }
    }
    
    // Create the HTML element for an activity
    createActivityElement(activity) {
      const activityDiv = document.createElement('div');
      activityDiv.className = 'activity-item';
      
      // Determine icon based on activity type
      let iconSvg = '';
      let activityTitle = '';
      
      switch(activity.type) {
        case 'vitals':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21s-6-4.35-9-8.5C-1.5 7.5 4.5 3 12 10.5 19.5 3 25.5 7.5 21 12.5 18 16.65 12 21 12 21z" fill="#F87171"/></svg>';
          activityTitle = 'Heart Rate Measured';
          break;
        case 'vision':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6" fill="#2563EB"/><circle cx="12" cy="12" r="3" fill="#1E3A8A"/></svg>';
          activityTitle = 'Vision Test Completed';
          break;
        case 'hearing':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 3C7 3 3 7 3 12c0 5 4 9 9 9s9-4 9-9c0-5-4-9-9-9zm0 16a7 7 0 110-14 7 7 0 010 14z" fill="#059669"/></svg>';
          activityTitle = 'Hearing Test Completed';
          break;
        case 'skin':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="12" cy="16" rx="8" ry="6" fill="#F59E42"/><ellipse cx="12" cy="10" rx="6" ry="4" fill="#FBBF24"/></svg>';
          activityTitle = 'Skin Analysis Completed';
          break;
        case 'wound':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><rect x="8" y="11" width="8" height="2" rx="1" fill="#B91C1C"/><rect x="11" y="8" width="2" height="8" rx="1" fill="#B91C1C"/></svg>';
          activityTitle = 'Wound Assessment Completed';
          break;
        case 'motion':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><rect x="8" y="4" width="8" height="16" rx="4" fill="#6366F1"/></svg>';
          activityTitle = 'Motion Test Completed';
          break;
        case 'reaction':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#F59E42" stroke-width="2" fill="none"/></svg>';
          activityTitle = 'Reaction Test Completed';
          break;
        case 'tremor':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke="#6366F1" stroke-width="2" fill="none"/></svg>';
          activityTitle = 'Tremor Analysis Completed';
          break;
        case 'balance':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#059669"/><path d="M12 2v20M2 12h20" stroke="#fff" stroke-width="2" fill="none"/></svg>';
          activityTitle = 'Balance Test Completed';
          break;
        case 'respiratory':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 12h4l2 6 4-12 2 6h4" stroke="#B91C1C" stroke-width="2" fill="none"/></svg>';
          activityTitle = 'Respiratory Test Completed';
          break;
        case 'consultation':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#F59E42"/><ellipse cx="12" cy="15" rx="5" ry="2" fill="#fff"/></svg>';
          activityTitle = 'AI Consultation';
          break;
        case 'feeling':
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FBBF24"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#fff" stroke-width="2" fill="none"/><circle cx="9" cy="9" r="1.5" fill="#fff"/><circle cx="15" cy="9" r="1.5" fill="#fff"/></svg>';
          activityTitle = 'Feeling Recorded';
          break;
        default:
          iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6B7280"/></svg>';
          activityTitle = 'Health Test Completed';
      }
      
      // Format timestamp
      const date = new Date(activity.timestamp);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' - ' + 
                            date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      
      activityDiv.innerHTML = `
        <div class="activity-icon">
          ${iconSvg}
        </div>
        <div class="activity-details">
          <h4>${activityTitle}</h4>
          <p>${activity.detail || 'Test completed successfully'}</p>
          <span class="activity-date">${formattedDate}</span>
        </div>
      `;
      
      return activityDiv;
    }
  }
  
  // Initialize the dashboard results
  const dashboardResults = new DashboardResults();
  
  export default dashboardResults;