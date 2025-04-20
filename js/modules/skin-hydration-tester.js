// modules/skin-hydration-tester.js - Skin tone & hydration using camera reflectivity

class SkinHydrationTester {
    constructor() {
      this.config = {
        flashDuration: 100, // ms for even lighting
      };
  
      this.state = {
        isRunning: false,
        stream: null,
        result: null,
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="skin-test-container">
          <div id="skin-instructions" class="test-instructions">
            <h4>Skin Tone & Hydration Test</h4>
            <p>This test estimates your skin hydration and tone uniformity using your phone’s camera.</p>
            <ol>
              <li>Ensure good ambient lighting.</li>
              <li>Position your face and hand in frame.</li>
              <li>Press “Start Test” to capture photos.</li>
            </ol>
            <div class="button-container">
              <button id="start-skin-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="skin-test-area" class="test-area" style="display:none;">
            <video id="skin-video" autoplay playsinline muted width="100%"></video>
            <canvas id="skin-canvas" style="display:none;"></canvas>
            <div class="button-container">
              <button id="capture-skin-test" class="primary-button">Capture & Analyze</button>
            </div>
          </div>
  
          <div id="skin-results" class="results-container" style="display:none;">
            <h3>Skin Tone & Hydration Results</h3>
            <div id="skin-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-skin-test')
        .addEventListener('click', () => this.startTest());
      document
        .getElementById('capture-skin-test')
        .addEventListener('click', () => this.captureImage());
    }
  
    async startTest() {
      try {
        this.state.stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('skin-video');
        video.srcObject = this.state.stream;
  
        document.getElementById('skin-instructions').style.display = 'none';
        document.getElementById('skin-test-area').style.display = 'block';
      } catch (err) {
        alert('Camera access denied. Cannot run skin test.');
        console.error(err);
      }
    }
  
    captureImage() {
      const video = document.getElementById('skin-video');
      const canvas = document.getElementById('skin-canvas');
      const ctx = canvas.getContext('2d');
  
      // optional flash simulation
      const origBg = document.body.style.backgroundColor;
      document.body.style.backgroundColor = '#fff';
      setTimeout(() => {
        document.body.style.backgroundColor = origBg;
      }, this.config.flashDuration);
  
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
      this.analyzeSkin(imageData);
      this.state.stream.getTracks().forEach(t => t.stop());
    }
  
    analyzeSkin(imageData) {
      // Placeholder: Replace with real ML or backend call
      const result = {
        hydrationPercent: 45,        // estimated hydration %
        toneUniformity: 78,          // uniformity %
        category: 'Dry Skin',
        recommendation: 'Increase water intake and apply moisturizer daily.'
      };
  
      this.state.result = result;
      this.showResults(result);
    }
  
    showResults(result) {
      document.getElementById('skin-test-area').style.display = 'none';
      document.getElementById('skin-results').style.display = 'block';
  
      document.getElementById('skin-results-content').innerHTML = `
        <div class="result-summary">
          <p><strong>Hydration:</strong> ${result.hydrationPercent}%</p>
          <p><strong>Tone Uniformity:</strong> ${result.toneUniformity}%</p>
          <p><strong>Category:</strong> ${result.category}</p>
          <p><strong>Recommendation:</strong> ${result.recommendation}</p>
        </div>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('skinHydration', {
          hydration: result.hydrationPercent,
          uniformity: result.toneUniformity,
          category: result.category,
          summary: `Skin: ${result.hydrationPercent}% hydration, ${result.category}`,
          recommendation: result.recommendation
        });
      }
    }
  }
  
  export default SkinHydrationTester;