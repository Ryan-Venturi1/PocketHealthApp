// Storage Manager for PocketHealth App
export class StorageManager {
    constructor() {
        this.storageKey = 'pocketHealthTestResults';
        this.initializeStorage();
    }

    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify({}));
        }
    }

    saveTestResult(testType, result) {
        const timestamp = new Date().toISOString();
        const allResults = this.getAllResults();
        
        if (!allResults[testType]) {
            allResults[testType] = [];
        }
        
        allResults[testType].push({
            timestamp,
            result
        });
        
        localStorage.setItem(this.storageKey, JSON.stringify(allResults));
    }

    getAllResults() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    }

    getTestResults(testType) {
        const allResults = this.getAllResults();
        return allResults[testType] || [];
    }

    getLatestResult(testType) {
        const results = this.getTestResults(testType);
        return results.length > 0 ? results[results.length - 1] : null;
    }

    clearResults() {
        localStorage.removeItem(this.storageKey);
        this.initializeStorage();
    }
} 