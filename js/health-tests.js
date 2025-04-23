import { HealthTestsController } from './modules/health-tests-controller.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new HealthTestsController();
    controller.init();
});

// Health Assessment Tests Implementation

class HealthTests {
    constructor() {
        this.testResults = {};
        this.currentTest = null;
    }

    // Get all test results
    getAllResults() {
        return this.testResults;
    }

    // Get specific test result
    getTestResult(testName) {
        return this.testResults[testName];
    }
}

// Initialize the tests
const healthTests = new HealthTests();

// Export for use in other files
export default healthTests; 