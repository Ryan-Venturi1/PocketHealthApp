// health-tests-controller.js - Main controller for all health tests

// Import existing test modules
import VisionTester from './modules/vision-tester.js';
import HearingTester from './modules/hearing-tester.js';
import VitalsMeasurer from './modules/vitals-measurer.js';

// Import your new test modules
import PostureTester from './modules/posture-tester.js';
import GaitTester from './modules/gait-tester.js';
import PupilResponseTester from './modules/pupil-response-tester.js';
import SkinHydrationTester from './modules/skin-hydration-tester.js';
import SpeechTester from './modules/speech-tester.js';
import CognitiveTester from './modules/cognitive-tester.js';
import RespiratoryTester from './modules/respiratory-tester.js';
import FingerTappingTester from './modules/finger-tapping-tester.js';

class HealthTestsController {
  constructor() {
    // Initialize test modules
    this.visionTester         = new VisionTester();
    this.hearingTester        = new HearingTester();
    this.vitalsMeasurer       = new VitalsMeasurer();

    // New modules
    this.postureTester        = new PostureTester();
    this.gaitTester           = new GaitTester();
    this.pupilResponseTester  = new PupilResponseTester();
    this.skinHydrationTester  = new SkinHydrationTester();
    this.speechTester         = new SpeechTester();
    this.cognitiveTester      = new CognitiveTester();
    this.respiratoryTester    = new RespiratoryTester();
    this.fingerTappingTester  = new FingerTappingTester();

    // Current active test
    this.activeTest = null;

    // Initialize event listeners
    this.initEventListeners();
  }

  initEventListeners() {
    // Card clicks
    document.querySelectorAll('.test-card').forEach(card => {
      card.addEventListener('click', () => {
        const testType = card.dataset.test;
        this.startTest(testType);
      });
    });

    // Modal close
    document.querySelector('.close-modal').addEventListener('click', () => {
      this.closeTestModal();
    });
    window.addEventListener('click', (e) => {
      if (e.target === document.getElementById('test-modal')) {
        this.closeTestModal();
      }
    });
  }

  startTest(testType) {
    this.activeTest = testType;
    const modal       = document.getElementById('test-modal');
    const testTitle   = document.getElementById('test-title');
    const testContent = document.getElementById('test-content');

    testTitle.textContent = document.querySelector(`[data-test="${testType}"] h3`).textContent;
    testContent.innerHTML = '';

    switch(testType) {
      case 'vision':
        this.visionTester.initTest(testContent);
        break;
      case 'hearing':
        this.hearingTester.initTest(testContent);
        break;
      case 'vitals':
        this.vitalsMeasurer.initTest(testContent);
        break;
      case 'posture':
        this.postureTester.initTest(testContent);
        break;
      case 'gait':
        this.gaitTester.initTest(testContent);
        break;
      case 'pupilResponse':
        this.pupilResponseTester.initTest(testContent);
        break;
      case 'skinHydration':
        this.skinHydrationTester.initTest(testContent);
        break;
      case 'speech':
        this.speechTester.initTest(testContent);
        break;
      case 'cognitive':
        this.cognitiveTester.initTest(testContent);
        break;
      case 'respiratory':
        this.respiratoryTester.initTest(testContent);
        break;
      case 'fingerTapping':
        this.fingerTappingTester.initTest(testContent);
        break;
      default:
        testContent.innerHTML = `<p>This test is not yet implemented.</p>`;
    }

    modal.style.display = 'block';
  }

  closeTestModal() {
    const modal = document.getElementById('test-modal');
    modal.style.display = 'none';

    // Clean up resources
    switch(this.activeTest) {
      case 'vision':        this.visionTester.cleanup();          break;
      case 'hearing':       this.hearingTester.cleanup();         break;
      case 'vitals':        this.vitalsMeasurer.cleanup();        break;
      case 'posture':       this.postureTester.cleanup();         break;
      case 'gait':          this.gaitTester.cleanup();            break;
      case 'pupilResponse': this.pupilResponseTester.cleanup();  break;
      case 'skinHydration': this.skinHydrationTester.cleanup();  break;
      case 'speech':        this.speechTester.cleanup();          break;
      case 'cognitive':     this.cognitiveTester.cleanup();       break;
      case 'respiratory':   this.respiratoryTester.cleanup();     break;
      case 'fingerTapping': this.fingerTappingTester.cleanup();  break;
    }

    this.activeTest = null;
  }

  // Save results to localStorage and history
  saveTestResult(testType, result) {
    const saved = JSON.parse(localStorage.getItem('healthTestResults') || '{}');
    saved[testType] = saved[testType] || [];
    saved[testType].push({ ...result, timestamp: new Date().toISOString() });
    localStorage.setItem('healthTestResults', JSON.stringify(saved));

    // Activity log
    const log = JSON.parse(localStorage.getItem('healthActivities') || '[]');
    log.unshift({ type: testType, detail: result.summary, timestamp: new Date().toISOString() });
    localStorage.setItem('healthActivities', JSON.stringify(log.slice(0, 50)));
  }
}

// Initialize controller
document.addEventListener('DOMContentLoaded', () => {
  window.healthTestsController = new HealthTestsController();
});

export default HealthTestsController;