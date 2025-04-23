import SkinAnalyzer from './skin-analyzer.js';

export class HealthTestsController {
    constructor() {
        this.skinAnalyzer = new SkinAnalyzer();
    }

    init() {
        // Initialize test buttons
        document.querySelectorAll('.action-item[data-test]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const testType = e.currentTarget.getAttribute('data-test');
                this.startTest(testType);
            });
        });
    }

    async startTest(testType) {
        switch(testType) {
            case 'skin':
                await this.skinAnalyzer.init();
                break;
            // Add other test types here
            default:
                console.error('Unknown test type:', testType);
        }
    }

    saveTestResult(type, data) {
        // Save test results to localStorage
        const results = JSON.parse(localStorage.getItem('testResults') || '[]');
        results.push({
            type,
            data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('testResults', JSON.stringify(results));
    }
} 