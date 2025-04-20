// modules/gait-tester.js - Gait analysis using camera recording

class GaitTester {
    constructor() {
      // Test configuration
      this.config = {
        testDuration: 10, // seconds of walking video
      };
  
      // Test state
      this.state = {
        isRunning: false,
        stream: null,
        recorder: null,
        chunks: [],
        videoBlob: null,
        result: null,
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="gait-test-container">
          <div id="gait-instructions" class="test-instructions">
            <h4>Gait Analysis</h4>
            <p>This test records a short video of you walking to analyze your gait.</p>
            <ol>
              <li>Set your phone on a stable surface at hip height.</li>
              <li>Walk towards and away from the camera for ${this.config.testDuration} seconds.</li>
              <li>Press "Start Test" when ready.</li>
            </ol>
            <div class="button-container">
              <button id="start-gait-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="gait-test-area" class="test-area" style="display:none;">
            <video id="gait-video" autoplay playsinline muted width="100%"></video>
            <div class="button-container">
              <button id="stop-gait-test" class="primary-button" disabled>Stop Test</button>
            </div>
          </div>
  
          <div id="gait-results" class="results-container" style="display:none;">
            <h3>Gait Analysis Results</h3>
            <div id="gait-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-gait-test')
        .addEventListener('click', () => this.startTest());
  
      document
        .getElementById('stop-gait-test')
        .addEventListener('click', () => this.stopTest());
    }
  
    async startTest() {
      this.state.isRunning = true;
      document.getElementById('gait-instructions').style.display = 'none';
      document.getElementById('gait-test-area').style.display = 'block';
  
      try {
        this.state.stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoEl = document.getElementById('gait-video');
        videoEl.srcObject = this.state.stream;
  
        // Setup MediaRecorder
        this.state.recorder = new MediaRecorder(this.state.stream, { mimeType: 'video/webm' });
        this.state.chunks = [];
        this.state.recorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.state.chunks.push(e.data);
        };
        this.state.recorder.onstop = () => {
          this.state.videoBlob = new Blob(this.state.chunks, { type: 'video/webm' });
          this.analyzeGait(this.state.videoBlob);
        };
  
        // Enable Stop button
        const stopBtn = document.getElementById('stop-gait-test');
        stopBtn.disabled = false;
  
        // Start recording
        this.state.recorder.start();
        
        // Auto-stop after duration
        setTimeout(() => {
          if (this.state.isRunning) this.stopTest();
        }, this.config.testDuration * 1000);
      } catch (err) {
        alert('Camera access denied. Cannot run gait test.');
        console.error(err);
      }
    }
  
    stopTest() {
      if (!this.state.isRunning) return;
  
      this.state.isRunning = false;
      document.getElementById('stop-gait-test').disabled = true;
      this.state.recorder.stop();
      this.state.stream.getTracks().forEach((t) => t.stop());
    }
  
    analyzeGait(videoBlob) {
      // Placeholder analysis – replace with real ML or backend call
      const result = {
        symmetry: 'Good',
        cadence: 110, // steps per minute
        speed: '1.2 m/s',
        category: 'Normal Gait',
        recommendation: 'Maintain regular walking exercises.',
      };
  
      this.state.result = result;
      this.showResults(result);
    }
  
    showResults(result) {
      document.getElementById('gait-test-area').style.display = 'none';
      document.getElementById('gait-results').style.display = 'block';
  
      document.getElementById('gait-results-content').innerHTML = `
        <div class="result-summary">
          <p><strong>Symmetry:</strong> ${result.symmetry}</p>
          <p><strong>Cadence:</strong> ${result.cadence} steps/min</p>
          <p><strong>Speed:</strong> ${result.speed}</p>
          <p><strong>Category:</strong> ${result.category}</p>
          <p><strong>Recommendation:</strong> ${result.recommendation}</p>
        </div>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('gait', {
          symmetry: result.symmetry,
          cadence: result.cadence,
          speed: result.speed,
          category: result.category,
          summary: `Gait: ${result.category} at ${result.cadence} spm`,
          recommendation: result.recommendation,
        });
      }
    }
  }
  
  export default GaitTester;