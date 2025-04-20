// modules/cognitive-tester.js - Cognitive function test (memory & attention)

class CognitiveTester {
    constructor() {
      this.config = {
        rounds: 3,
        sequenceLength: 5,        // length of number/shape sequence
        displayTime: 1000,        // ms per item
        inputTime: 10000,         // ms to input sequence
      };
  
      this.state = {
        isRunning: false,
        currentRound: 0,
        sequence: [],
        userInput: '',
        score: 0,
        result: null,
        timers: [],
      };
    }
  
    initTest(container) {
      container.innerHTML = `
        <div class="cognitive-test-container">
          <div id="cognitive-instructions" class="test-instructions">
            <h4>Cognitive Function Test</h4>
            <p>This test evaluates memory and attention. You will see a sequence of numbers, then enter them in order.</p>
            <ol>
              <li>Memorize each item shown briefly.</li>
              <li>After the sequence, type the entire sequence and press "Submit".</li>
              <li>There are ${this.config.rounds} rounds.</li>
            </ol>
            <div class="button-container">
              <button id="start-cognitive-test" class="primary-button">Start Test</button>
            </div>
          </div>
  
          <div id="cognitive-test-area" class="test-area" style="display:none;">
            <div id="cognitive-display" class="sequence-display"></div>
            <input type="text" id="cognitive-input" placeholder="Enter sequence here" style="display:none;" />
            <div class="button-container">
              <button id="submit-cognitive-input" class="primary-button" style="display:none;">Submit</button>
            </div>
            <div id="cognitive-timer" class="timer" style="display:none;">Time left: <span id="cognitive-time"></span>s</div>
          </div>
  
          <div id="cognitive-results" class="results-container" style="display:none;">
            <h3>Cognitive Test Results</h3>
            <div id="cognitive-results-content"></div>
          </div>
        </div>
      `;
      this.setupListeners();
    }
  
    setupListeners() {
      document
        .getElementById('start-cognitive-test')
        .addEventListener('click', () => this.startRound());
      document
        .getElementById('submit-cognitive-input')
        .addEventListener('click', () => this.submitInput());
    }
  
    startRound() {
      if (this.state.currentRound >= this.config.rounds) {
        this.completeTest();
        return;
      }
  
      if (this.state.currentRound === 0) {
        // initial start
        document.getElementById('cognitive-instructions').style.display = 'none';
        document.getElementById('cognitive-test-area').style.display = 'block';
      }
  
      this.state.isRunning = true;
      this.state.sequence = this.generateSequence();
      this.state.userInput = '';
      document.getElementById('cognitive-input').value = '';
      document.getElementById('submit-cognitive-input').style.display = 'none';
  
      this.showSequence(0);
    }
  
    generateSequence() {
      const seq = [];
      for (let i = 0; i < this.config.sequenceLength; i++) {
        seq.push(Math.floor(Math.random() * 9) + 1); // numbers 1–9
      }
      return seq;
    }
  
    showSequence(index) {
      const displayEl = document.getElementById('cognitive-display');
      displayEl.textContent = this.state.sequence[index];
  
      const t = setTimeout(() => {
        if (index + 1 < this.state.sequence.length) {
          this.showSequence(index + 1);
        } else {
          displayEl.textContent = '';
          this.promptInput();
        }
      }, this.config.displayTime);
      this.state.timers.push(t);
    }
  
    promptInput() {
      const inputEl = document.getElementById('cognitive-input');
      const submitBtn = document.getElementById('submit-cognitive-input');
      const timerEl = document.getElementById('cognitive-timer');
      const timeCount = document.getElementById('cognitive-time');
  
      inputEl.style.display = 'block';
      submitBtn.style.display = 'inline-block';
      timerEl.style.display = 'block';
  
      let remaining = Math.floor(this.config.inputTime / 1000);
      timeCount.textContent = remaining;
      const interval = setInterval(() => {
        remaining--;
        timeCount.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(interval);
          this.submitInput();
        }
      }, 1000);
      this.state.timers.push(interval);
    }
  
    submitInput() {
      // clear pending timers
      this.state.timers.forEach(clearTimeout);
      this.state.timers = [];
  
      const inputEl = document.getElementById('cognitive-input');
      this.state.userInput = inputEl.value.trim().split('').map(Number);
      this.evaluateRound();
    }
  
    evaluateRound() {
      const correct = this.state.sequence;
      const entered = this.state.userInput;
      let roundScore = 0;
      for (let i = 0; i < correct.length; i++) {
        if (entered[i] === correct[i]) roundScore++;
      }
      this.state.score += roundScore;
      this.state.currentRound++;
  
      if (this.state.currentRound < this.config.rounds) {
        alert(`Round ${this.state.currentRound} done: you got ${roundScore}/${correct.length}. Next round!`);
        this.startRound();
      } else {
        this.completeTest();
      }
    }
  
    completeTest() {
      this.state.isRunning = false;
      document.getElementById('cognitive-test-area').style.display = 'none';
      document.getElementById('cognitive-results').style.display = 'block';
  
      const maxScore = this.config.rounds * this.config.sequenceLength;
      const percentage = Math.round((this.state.score / maxScore) * 100);
      const category = percentage >= 80 ? 'Excellent' :
                       percentage >= 60 ? 'Good' :
                       percentage >= 40 ? 'Fair' : 'Needs Improvement';
  
      const result = {
        totalScore: this.state.score,
        maxScore,
        percentage,
        category,
      };
      this.state.result = result;
  
      document.getElementById('cognitive-results-content').innerHTML = `
        <p><strong>Total Score:</strong> ${result.totalScore}/${result.maxScore}</p>
        <p><strong>Percentage:</strong> ${result.percentage}%</p>
        <p><strong>Category:</strong> ${result.category}</p>
        <p><em>Note: This is a basic screen, not a clinical assessment.</em></p>
      `;
  
      this.saveResults(result);
    }
  
    saveResults(result) {
      if (window.healthTestsController) {
        window.healthTestsController.saveTestResult('cognitive', {
          score: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          category: result.category,
          summary: `Cognitive: ${result.percentage}% (${result.category})`,
        });
      }
    }
  }
  
  export default CognitiveTester;