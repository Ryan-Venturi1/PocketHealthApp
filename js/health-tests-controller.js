// health-tests-controller.js - Main controller for all health tests

// Import test modules
import SkinAnalyzer from './modules/skin-analyzer.js';
import WoundAnalyzer from './modules/wound-analyzer.js';
import VisionTester from './modules/vision-tester.js';
import HearingTester from './modules/hearing-tester.js';
import VitalsMeasurer from './modules/vitals-measurer.js';

class HealthTestsController {
  constructor() {
    // Initialize test modules
    this.skinAnalyzer = new SkinAnalyzer();
    this.woundAnalyzer = new WoundAnalyzer();
    this.visionTester = new VisionTester();
    this.hearingTester = new HearingTester();
    this.vitalsMeasurer = new VitalsMeasurer();
    
    // Current active test
    this.activeTest = null;
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Add click listeners to all test cards
    document.querySelectorAll('.test-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const testType = card.dataset.test;
        this.startTest(testType);
      });
    });
    
    // Modal close button
    document.querySelector('.close-modal').addEventListener('click', () => {
      this.closeTestModal();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('test-modal');
      if (event.target === modal) {
        this.closeTestModal();
      }
    });
  }
  
  startTest(testType) {
    this.activeTest = testType;
    const modal = document.getElementById('test-modal');
    const testTitle = document.getElementById('test-title');
    const testContent = document.getElementById('test-content');
    
    // Set test title
    testTitle.textContent = document.querySelector(`[data-test="${testType}"] h3`).textContent;
    
    // Clear previous content
    testContent.innerHTML = '';
    
    // Initialize the selected test
    switch(testType) {
      case 'skin':
        this.skinAnalyzer.initTest(testContent);
        break;
      case 'wound':
        this.woundAnalyzer.initTest(testContent);
        break;
      case 'vision':
        this.visionTester.initTest(testContent);
        break;
      case 'hearing':
        this.hearingTester.initTest(testContent);
        break;
      case 'vitals':
        this.vitalsMeasurer.initTest(testContent);
        break;
      default:
        testContent.innerHTML = `
          <div class="test-instructions">
            <p>This test is not yet implemented. Please check back later.</p>
          </div>
        `;
    }
    
    // Show the modal
    modal.style.display = 'block';
  }
  
  closeTestModal() {
    // Close the modal
    document.getElementById('test-modal').style.display = 'none';
    
    // Clean up active test resources
    if (this.activeTest) {
      switch(this.activeTest) {
        case 'skin':
          this.skinAnalyzer.cleanup();
          break;
        case 'wound':
          this.woundAnalyzer.cleanup();
          break;
        case 'vision':
          this.visionTester.cleanup();
          break;
        case 'hearing':
          this.hearingTester.cleanup();
          break;
        case 'vitals':
          this.vitalsMeasurer.cleanup();
          break;
      }
      
      this.activeTest = null;
    }
  }
  
  // Helper function to save test results
  saveTestResult(testType, result) {
    // Get existing results from localStorage
    const savedResults = JSON.parse(localStorage.getItem('healthTestResults') || '{}');
    
    if (!savedResults[testType]) {
      savedResults[testType] = [];
    }
    
    // Add new result with timestamp
    savedResults[testType].push({
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Save back to localStorage
    localStorage.setItem('healthTestResults', JSON.stringify(savedResults));
    
    // Also add to activity history
    this.addActivityRecord(testType, result.summary || `${testType} test completed`);
  }
  
  addActivityRecord(activityType, detail) {
    // Get existing activities
    const activities = JSON.parse(localStorage.getItem('healthActivities') || '[]');
    
    // Add new activity
    activities.unshift({
      type: activityType,
      detail,
      timestamp: new Date().toISOString()
    });
    
    // Limit to 50 activities
    const limitedActivities = activities.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem('healthActivities', JSON.stringify(limitedActivities));
  }
}

// Initialize the controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.healthTestsController = new HealthTestsController();
});

export default HealthTestsController;