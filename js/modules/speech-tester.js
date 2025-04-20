// modules/speech-tester.js - Speech & Voice Analysis using microphone

class SpeechTester {
    constructor() {
      // Test configuration
      this.config = {
        recordDuration: 5, // seconds to record
      };
  
      // Test state
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
        <div class="speech-test-container">
          <div id="speech-instructions" class="test-instructions">
            <h4>Speech & Voice Analysis</h4>
            <p>This test records a short audio sample to analyze your speech patterns—for example, pitch and clarity.</p>
            <ol>
              <li>Allow microphone access when prompted.</li>
              <li>Press “Start Test” and speak continuously for ${this.config.recordDuration} seconds.</li>
            </ol>
            <div class="button-container">
              <button id="start-speech-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="speech-test-area" class="test-area" style="display:none;">
            <p>Recording... Please speak now.</p>
            <div class="button-container">
              <button id="stop-speech-test" class="primary-button" disabled>Stop Recording</button>
            </div>
          </div>
  
          <div id="speech-results" class="results-container" style="display:none;">
            <h3>Speech Analysis Results</h3>
            <div id="speech-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-speech-test')
        .addEventListener('click', () => this.startTest());
  
      document
        .getElementById('stop-speech-test')
        .addEventListener('click', () => this.stopTest());
    }
  
    async startTest() {
      this.state.isRunning = true;
      document.getElementById('speech-instructions').style.display = 'none';
      document.getElementById('speech-test-area').style.display = 'block';
  
      try {
        this.state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.state.recorder = new MediaRecorder(this.state.stream);
        this.state.chunks = [];
  
        this.state.recorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.state.chunks.push(e.data);
        };
        this.state.recorder.onstop = () => {
          this.state.audioBlob = new Blob(this.state.chunks, { type: 'audio/webm' });
          this.analyzeSpeech(this.state.audioBlob);
        };
  
        // Enable Stop button and start recording
        document.getElementById('stop-speech-test').disabled = false;
        this.state.recorder.start();
  
        // Auto-stop after configured duration
        setTimeout(() => {
          if (this.state.isRunning) this.stopTest();
        }, this.config.recordDuration * 1000);
      } catch (err) {
        alert('Microphone access denied. Cannot run speech test.');
        console.error(err);
      }
    }
  
    stopTest() {
      if (!this.state.isRunning) return;
  
      this.state.isRunning = false;
      document.getElementById('stop-speech-test').disabled = true;
      this.state.recorder.stop();
      this.state.stream.getTracks().forEach((t) => t.stop());
    }
  
    analyzeSpeech(audioBlob) {
      // Placeholder analysis – replace with real audio processing or ML
      const result = {
        averagePitchHz: 220,      // average pitch in Hz
        clarityScore: 85,         // 0–100 clarity metric
        category: 'Normal Speech',
        recommendation: 'Your speech clarity is good.',
      };
  
      this.state.result = result;
      this.showResults(result);
    }
  
    showResults(result) {
      document.getElementById('speech-test-area').style.display = 'none';
      document.getElementById('speech-results').style.display = 'block';
  
      document.getElementById('speech-results-content').innerHTML = `
        <div class="result-summary">
          <p><strong>Average Pitch:</strong> ${result.averagePitchHz} Hz</p>
          <p><strong>Clarity Score:</strong> ${result.clarityScore}%</p>
          <p><strong>Category:</strong> ${result.category}</p>
          <p><strong>Recommendation:</strong> ${result.recommendation}</p>
        </div>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('speechAnalysis', {
          pitch: result.averagePitchHz,
          clarity: result.clarityScore,
          category: result.category,
          summary: `Speech: ${result.category}, clarity ${result.clarityScore}%`,
          recommendation: result.recommendation,
        });
      }
    }
  }
  
  export default SpeechTester;