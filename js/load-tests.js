// load-tests.js - Helper script to load test modules and CSS

document.addEventListener('DOMContentLoaded', () => {
    // Load CSS files for tests
    function loadCSS(filename) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = filename;
      document.head.appendChild(link);
    }
    
    // Load CSS for vitals test
    loadCSS('css/vitals-test.css');
    
    // Initialize test cards click handlers
    document.querySelectorAll('.test-card').forEach(card => {
      card.addEventListener('click', () => {
        const testType = card.dataset.test;
        // This function will be handled by health-tests-controller.js
        if (window.healthTestsController) {
          window.healthTestsController.startTest(testType);
        }
      });
    });
  });