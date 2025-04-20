// modules/finger-tapping-tester.js - Finger tapping test for fine motor speed

class FingerTappingTester {
    constructor() {
      this.config = {
        testDuration: 10, // seconds to tap
      };
  
      this.state = {
        isRunning: false,
        startTime: null,
        tapCount: 0,
        timers: [],
        result: null,
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="tapping-test-container">
          <div id="tapping-instructions" class="test-instructions">
            <h4>Finger Tapping Test</h4>
            <p>This test measures your finger tapping speed to assess fine motor coordination.</p>
            <ol>
              <li>Place your index finger on the “Tap” button.</li>
              <li>When you press “Start Test,” tap as many times as you can in ${this.config.testDuration} seconds.</li>
            </ol>
            <div class="button-container">
              <button id="start-tapping-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="tapping-test-area" class="test-area" style="display:none;">
            <p>Time Remaining: <span id="tapping-timer">${this.config.testDuration}</span>s</p>
            <button id="tap-button" class="primary-button" disabled>Tap</button>
          </div>
  
          <div id="tapping-results" class="results-container" style="display:none;">
            <h3>Finger Tapping Results</h3>
            <div id="tapping-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-tapping-test')
        .addEventListener('click', () => this.startTest());
  
      document
        .getElementById('tap-button')
        .addEventListener('click', () => this.registerTap());
    }
  
    startTest() {
      this.state.isRunning = true;
      this.state.tapCount = 0;
      document.getElementById('tapping-instructions').style.display = 'none';
      document.getElementById('tapping-test-area').style.display = 'block';
      const tapBtn = document.getElementById('tap-button');
      tapBtn.disabled = false;
      this.state.startTime = Date.now();
  
      // Countdown timer
      let remaining = this.config.testDuration;
      const timerEl = document.getElementById('tapping-timer');
      timerEl.textContent = remaining;
      const intervalId = setInterval(() => {
        remaining--;
        timerEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(intervalId);
          this.endTest();
        }
      }, 1000);
      this.state.timers.push(intervalId);
    }
  
    registerTap() {
      if (!this.state.isRunning) return;
      this.state.tapCount++;
    }
  
    endTest() {
      this.state.isRunning = false;
      document.getElementById('tap-button').disabled = true;
      document.getElementById('tapping-test-area').style.display = 'none';
      const taps = this.state.tapCount;
      const rate = (taps / this.config.testDuration).toFixed(1); // taps per second
  
      const category = rate >= 5
        ? 'Excellent'
        : rate >= 3
        ? 'Good'
        : 'Needs Improvement';
  
      const result = {
        totalTaps: taps,
        tapsPerSecond: parseFloat(rate),
        category,
        recommendation: category === 'Needs Improvement'
          ? 'Try fine motor exercises and repeat test regularly.'
          : 'Your tapping speed is within normal range.'
      };
      this.state.result = result;
      this.showResults(result);
  
      // Clear any timers
      this.state.timers.forEach(clearInterval);
      this.state.timers = [];
    }
  
    showResults(result) {
      document.getElementById('tapping-results').style.display = 'block';
      document.getElementById('tapping-results-content').innerHTML = `
        <p><strong>Total Taps:</strong> ${result.totalTaps}</p>
        <p><strong>Taps per Second:</strong> ${result.tapsPerSecond}</p>
        <p><strong>Category:</strong> ${result.category}</p>
        <p><strong>Recommendation:</strong> ${result.recommendation}</p>
      `;
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('fingerTapping', {
          totalTaps: result.totalTaps,
          tapsPerSecond: result.tapsPerSecond,
          category: result.category,
          summary: `Tapping: ${result.tapsPerSecond} taps/sec (${result.category})`,
          recommendation: result.recommendation,
        });
      }
    }
  }
  
  export default FingerTappingTester;