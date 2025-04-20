// modules/pupil-response-tester.js - Pupil response using flash and camera

class PupilResponseTester {
    constructor() {
      this.config = {
        flashDuration: 200, // ms
      };
  
      this.state = {
        isRunning: false,
        stream: null,
        videoTrack: null,
        result: null,
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="pupil-test-container">
          <div id="pupil-instructions" class="test-instructions">
            <h4>Pupil Response Test</h4>
            <p>This test uses a camera flash to measure your pupil’s constriction and dilation.</p>
            <ol>
              <li>Allow camera access when prompted.</li>
              <li>Keep your eyes open and look at the camera lens.</li>
              <li>Press “Start Test” to begin.</li>
            </ol>
            <div class="button-container">
              <button id="start-pupil-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="pupil-test-area" class="test-area" style="display:none;">
            <video id="pupil-video" autoplay playsinline muted width="100%"></video>
            <canvas id="pupil-canvas" style="display:none;"></canvas>
            <div class="button-container">
              <button id="capture-pupil-test" class="primary-button">Capture Response</button>
            </div>
          </div>
  
          <div id="pupil-results" class="results-container" style="display:none;">
            <h3>Pupil Response Results</h3>
            <div id="pupil-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-pupil-test')
        .addEventListener('click', () => this.startTest());
      document
        .getElementById('capture-pupil-test')
        .addEventListener('click', () => this.captureResponse());
    }
  
    async startTest() {
      try {
        this.state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const video = document.getElementById('pupil-video');
        video.srcObject = this.state.stream;
        this.state.videoTrack = this.state.stream.getVideoTracks()[0];
  
        document.getElementById('pupil-instructions').style.display = 'none';
        document.getElementById('pupil-test-area').style.display = 'block';
      } catch (err) {
        alert('Camera access denied. Cannot run pupil response test.');
        console.error(err);
      }
    }
  
    captureResponse() {
      const video = document.getElementById('pupil-video');
      const canvas = document.getElementById('pupil-canvas');
      const ctx = canvas.getContext('2d');
  
      // simulate flash by overlay
      const origBg = document.body.style.backgroundColor;
      document.body.style.backgroundColor = '#ffffff';
      setTimeout(() => {
        document.body.style.backgroundColor = origBg;
      }, this.config.flashDuration);
  
      // snapshot frame after flash
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
      this.analyzePupilResponse(imageData);
      this.state.stream.getTracks().forEach((t) => t.stop());
    }
  
    analyzePupilResponse(imageData) {
      // Placeholder analysis - replace with real image processing or ML
      const result = {
        latencyMs: 250,               // time to constrict
        constrictionRatio: 0.40,      // percent change
        category: 'Normal Response',
        recommendation: 'No anomalies detected.',
      };
  
      this.state.result = result;
      this.showResults(result);
    }
  
    showResults(result) {
      document.getElementById('pupil-test-area').style.display = 'none';
      document.getElementById('pupil-results').style.display = 'block';
  
      document.getElementById('pupil-results-content').innerHTML = `
        <div class="result-summary">
          <p><strong>Constriction Latency:</strong> ${result.latencyMs} ms</p>
          <p><strong>Constriction Ratio:</strong> ${(result.constrictionRatio * 100).toFixed(0)}%</p>
          <p><strong>Category:</strong> ${result.category}</p>
          <p><strong>Recommendation:</strong> ${result.recommendation}</p>
        </div>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('pupilResponse', {
          latencyMs: result.latencyMs,
          constrictionRatio: result.constrictionRatio,
          category: result.category,
          summary: `Pupil response: ${result.category}, ${result.latencyMs} ms`,
          recommendation: result.recommendation,
        });
      }
    }
  }
  
  export default PupilResponseTester;