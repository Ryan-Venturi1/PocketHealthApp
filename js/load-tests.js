// load-tests.js - Helper to load test-specific CSS & wire up cards

document.addEventListener('DOMContentLoaded', () => {
  // Dynamically load CSS for each test
  function loadCSS(file) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = file;
    document.head.appendChild(link);
  }

  // Core & existing tests
  loadCSS('css/vitals-test.css');

  // New test CSS files
  loadCSS('css/posture-test.css');
  loadCSS('css/gait-test.css');
  loadCSS('css/pupil-response-test.css');
  loadCSS('css/skin-hydration-test.css');
  loadCSS('css/speech-test.css');
  loadCSS('css/cognitive-test.css');
  loadCSS('css/respiratory-test.css');
  loadCSS('css/finger-tapping-test.css');

  // Wire up cards to controller
  document.querySelectorAll('.test-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.test;
      if (window.healthTestsController) {
        window.healthTestsController.startTest(type);
      }
    });
  });
});