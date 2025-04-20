// modules/posture-tester.js - Posture testing using camera and device orientation

class PostureTester {
    constructor() {
      this.state = {
        isRunning: false,
        startTime: null,
        photoTaken: false,
        postureResult: null,
        deviceSupport: null,
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="posture-test-container">
          <div id="posture-instructions" class="test-instructions">
            <h4>Posture Analysis</h4>
            <p>This test analyzes your posture using your phone’s camera. Position the phone to capture your full body side view (or use a mirror).</p>
            
            <ol>
              <li>Stand naturally in front of your phone or mirror</li>
              <li>Align your body in the frame and press "Start Test"</li>
              <li>The camera will capture an image to analyze posture</li>
            </ol>
  
            <div class="button-container">
              <button id="start-posture-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="posture-test-area" class="test-area" style="display:none;">
            <video id="posture-video" autoplay playsinline width="100%" height="auto"></video>
            <canvas id="posture-canvas" style="display:none;"></canvas>
            <div class="button-container">
              <button id="capture-posture" class="primary-button">Capture</button>
            </div>
          </div>
  
          <div id="posture-results" class="results-container" style="display:none;">
            <h3>Posture Results</h3>
            <div id="posture-results-content"></div>
          </div>
        </div>
      `;
  
      this.setupListeners();
    }
  
    setupListeners() {
      const startBtn = document.getElementById('start-posture-test');
      const captureBtn = document.getElementById('capture-posture');
  
      startBtn.addEventListener('click', () => this.startTest());
      captureBtn.addEventListener('click', () => this.captureImage());
    }
  
    async startTest() {
      this.state.isRunning = true;
      document.getElementById('posture-instructions').style.display = 'none';
      document.getElementById('posture-test-area').style.display = 'block';
  
      const video = document.getElementById('posture-video');
  
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
      } catch (error) {
        alert('Camera access denied. Cannot run posture test.');
      }
    }
  
    captureImage() {
      const video = document.getElementById('posture-video');
      const canvas = document.getElementById('posture-canvas');
      const context = canvas.getContext('2d');
  
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      this.state.photoTaken = true;
      this.analyzePosture(imageData);
    }
  
    analyzePosture(imageData) {
      // Dummy analysis – replace with real ML model / backend later
      const result = {
        alignment: 'Slight Forward Head Posture',
        score: 68,
        category: 'Fair',
        recommendation: 'Try wall posture exercises 5 minutes daily.',
      };
  
      this.state.postureResult = result;
      this.showResults(result);
    }
  
    showResults(result) {
      document.getElementById('posture-test-area').style.display = 'none';
      document.getElementById('posture-results').style.display = 'block';
  
      document.getElementById('posture-results-content').innerHTML = `
        <div class="result-summary">
          <p><strong>Posture Alignment:</strong> ${result.alignment}</p>
          <p><strong>Score:</strong> ${result.score}% (${result.category})</p>
          <p><strong>Recommendation:</strong> ${result.recommendation}</p>
        </div>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('posture', {
          alignment: result.alignment,
          score: result.score,
          category: result.category,
          summary: `Posture: ${result.score}% (${result.category})`,
          recommendation: result.recommendation,
        });
      }
    }
  }
  
  export default PostureTester;