// modules/respiratory-tester.js - Respiratory rate test using microphone

class RespiratoryTester {
    constructor() {
      this.config = {
        recordDuration: 15, // seconds to record breathing
      };
  
      this.state = {
        isRunning: false,
        stream: null,
        recorder: null,
        chunks: [],
        audioBlob: null,
        result: null,
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="respiratory-test-container">
          <div id="respiratory-instructions" class="test-instructions">
            <h4>Respiratory Rate Test</h4>
            <p>This test records your breathing sounds for ${this.config.recordDuration} seconds and estimates your breaths per minute.</p>
            <ol>
              <li>Allow microphone access.</li>
              <li>Sit quietly and breathe normally.</li>
              <li>Press “Start Test” when ready.</li>
            </ol>
            <div class="button-container">
              <button id="start-respiratory-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="respiratory-test-area" class="test-area" style="display:none;">
            <p>Recording breathing... Please stay still.</p>
            <div class="button-container">
              <button id="stop-respiratory-test" class="primary-button" disabled>Stop Recording</button>
            </div>
          </div>
  
          <div id="respiratory-results" class="results-container" style="display:none;">
            <h3>Respiratory Rate Results</h3>
            <div id="respiratory-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-respiratory-test')
        .addEventListener('click', () => this.startTest());
  
      document
        .getElementById('stop-respiratory-test')
        .addEventListener('click', () => this.stopTest());
    }
  
    async startTest() {
      this.state.isRunning = true;
      document.getElementById('respiratory-instructions').style.display = 'none';
      document.getElementById('respiratory-test-area').style.display = 'block';
  
      try {
        this.state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.state.recorder = new MediaRecorder(this.state.stream);
        this.state.chunks = [];
  
        this.state.recorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.state.chunks.push(e.data);
        };
        this.state.recorder.onstop = () => {
          this.state.audioBlob = new Blob(this.state.chunks, { type: 'audio/webm' });
          this.analyzeRespiratory(this.state.audioBlob);
        };
  
        // Enable Stop button and start recording
        document.getElementById('stop-respiratory-test').disabled = false;
        this.state.recorder.start();
  
        // Auto-stop after configured duration
        setTimeout(() => {
          if (this.state.isRunning) this.stopTest();
        }, this.config.recordDuration * 1000);
      } catch (err) {
        alert('Microphone access denied. Cannot run respiratory test.');
        console.error(err);
      }
    }
  
    stopTest() {
      if (!this.state.isRunning) return;
  
      this.state.isRunning = false;
      document.getElementById('stop-respiratory-test').disabled = true;
      this.state.recorder.stop();
      this.state.stream.getTracks().forEach((t) => t.stop());
    }
  
    analyzeRespiratory(audioBlob) {
      // Placeholder analysis — replace with real signal processing or ML
      const breathsPerMinute = Math.round((60 / this.config.recordDuration) * 4); // example: counted 4 breaths
      const category = breathsPerMinute >= 12 && breathsPerMinute <= 20
        ? 'Normal'
        : (breathsPerMinute < 12 ? 'Bradypnea' : 'Tachypnea');
  
      const result = {
        breathsPerMinute,
        category,
        recommendation: category === 'Normal'
          ? 'Your breathing rate is within the normal range.'
          : 'Consider consulting a healthcare provider if abnormal breathing persists.',
      };
  
      this.state.result = result;
      this.showResults(result);
    }
  
    showResults(result) {
      document.getElementById('respiratory-test-area').style.display = 'none';
      document.getElementById('respiratory-results').style.display = 'block';
  
      document.getElementById('respiratory-results-content').innerHTML = `
        <div class="result-summary">
          <p><strong>Breaths per Minute:</strong> ${result.breathsPerMinute}</p>
          <p><strong>Category:</strong> ${result.category}</p>
          <p><strong>Recommendation:</strong> ${result.recommendation}</p>
        </div>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('respiratoryRate', {
          breathsPerMinute: result.breathsPerMinute,
          category: result.category,
          summary: `Respiratory rate: ${result.breathsPerMinute} bpm (${result.category})`,
          recommendation: result.recommendation,
        });
      }
    }
  }
  
  export default RespiratoryTester;