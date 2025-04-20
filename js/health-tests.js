import { StorageManager } from './storage-manager.js';

class HealthTests {
    constructor() {
        this.storageManager = new StorageManager();
        this.currentTest = null;
        this.testResults = {};
        this.model = null;
        this.initializeTests();
    }

    async initializeTests() {
        // Load TensorFlow.js model for skin analysis
        await this.loadModel();
        this.initializeCamera();
        this.setupTestEventListeners();
    }

    async loadModel() {
        try {
            // Load a pre-trained model for skin condition classification
            this.model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/savedmodel/skin_analysis/model.json');
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }

    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            const video = document.getElementById('skin-camera');
            if (video) {
                video.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    }

    setupTestEventListeners() {
        // Add event listeners for all test buttons
        document.querySelectorAll('.start-test-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const testType = e.target.closest('.test-card').dataset.test;
                this.startTest(testType);
            });
        });
    }

    async startTest(testType) {
        this.currentTest = testType;
        const modal = document.getElementById('test-modal');
        const testTitle = document.getElementById('test-title');
        const testContent = document.getElementById('test-content');
        
        testTitle.textContent = document.querySelector(`[data-test="${testType}"] h3`).textContent;
        
        switch(testType) {
            case 'skin':
                await this.startSkinTest(testContent);
                break;
            case 'vision':
                await this.startVisionTest(testContent);
                break;
            case 'hearing':
                await this.startHearingTest(testContent);
                break;
            case 'vitals':
                await this.startVitalsTest(testContent);
                break;
            case 'motion':
                await this.startMotionTest(testContent);
                break;
            case 'reaction':
                await this.startReactionTest(testContent);
                break;
            case 'tremor':
                await this.startTremorTest(testContent);
                break;
            case 'balance':
                await this.startBalanceTest(testContent);
                break;
        }
        
        modal.style.display = 'block';
    }

    async startSkinTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Please position your camera to capture the affected skin area. Ensure good lighting and focus.</p>
                <div class="camera-container">
                    <video id="skin-camera" autoplay playsinline></video>
                    <canvas id="skin-canvas" style="display: none;"></canvas>
                </div>
                <button onclick="analyzeSkin()">Analyze</button>
            </div>
        `;
        
        // Initialize camera if not already done
        if (!document.getElementById('skin-camera').srcObject) {
            await this.initializeCamera();
        }
    }

    async startVisionTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Stand 10 feet away from your screen. Cover one eye and read the letters below.</p>
                <div class="vision-chart">
                    <div class="vision-row" style="font-size: 60px;">E F P O T E C</div>
                    <div class="vision-row" style="font-size: 45px;">E C F D P T O</div>
                    <div class="vision-row" style="font-size: 30px;">D E F P O T E C</div>
                    <div class="vision-row" style="font-size: 20px;">E C F D P T O</div>
                    <div class="vision-row" style="font-size: 15px;">D E F P O T E C</div>
                </div>
                <div class="vision-input">
                    <input type="text" id="vision-input" placeholder="Enter the letters you see">
                    <button onclick="checkVision()">Check Vision</button>
                </div>
            </div>
        `;
    }

    async startHearingTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Put on headphones and click the button below to start the hearing test.</p>
                <p>You will hear tones at different frequencies. Click the button when you hear a tone.</p>
                <button onclick="startHearingTest()">Start Test</button>
                <div id="hearing-test-status"></div>
                <div class="frequency-display">
                    <span id="current-frequency">-- Hz</span>
                </div>
                <div class="volume-control">
                    <input type="range" id="volume-slider" min="0" max="100" value="50">
                    <span>Volume</span>
                </div>
            </div>
        `;
    }

    async startHearingTest() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const frequencies = [250, 500, 1000, 2000, 4000, 8000];
        const results = [];
        
        for (const frequency of frequencies) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Start with low volume and gradually increase
            let volume = 0;
            const interval = setInterval(() => {
                volume += 0.1;
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                
                if (volume >= 1) {
                    clearInterval(interval);
                    oscillator.stop();
                }
            }, 100);
            
            // Wait for user response
            const heard = await new Promise(resolve => {
                const button = document.createElement('button');
                button.textContent = 'Click when you hear the tone';
                document.getElementById('hearing-test-status').appendChild(button);
                
                button.onclick = () => {
                    resolve(true);
                    button.remove();
                };
                
                setTimeout(() => {
                    resolve(false);
                    button.remove();
                }, 5000);
            });
            
            results.push({
                frequency,
                heard,
                volume: volume
            });
        }
        
        const result = this.analyzeHearingResults(results);
        this.storageManager.saveTestResult('hearing', result);
        this.showTestResult(result);
    }

    analyzeHearingResults(results) {
        const heardFrequencies = results.filter(r => r.heard).map(r => r.frequency);
        const lowestHeard = Math.min(...heardFrequencies);
        const highestHeard = Math.max(...heardFrequencies);
        
        return {
            range: `${lowestHeard}-${highestHeard} Hz`,
            status: this.getHearingStatus(heardFrequencies.length),
            recommendations: this.getHearingRecommendations(heardFrequencies.length)
        };
    }

    getHearingStatus(heardCount) {
        if (heardCount >= 5) return 'Normal';
        if (heardCount >= 3) return 'Mild impairment';
        if (heardCount >= 1) return 'Moderate impairment';
        return 'Severe impairment';
    }

    getHearingRecommendations(heardCount) {
        if (heardCount >= 5) return 'Your hearing appears to be normal. Continue regular hearing check-ups.';
        if (heardCount >= 3) return 'Mild hearing impairment detected. Consider scheduling a hearing test with a professional.';
        if (heardCount >= 1) return 'Moderate hearing impairment detected. Please consult an audiologist.';
        return 'Severe hearing impairment detected. Immediate consultation with an audiologist is recommended.';
    }

    async startVitalsTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Place your finger on the camera lens to measure your heart rate.</p>
                <div class="vitals-container">
                    <div class="heart-rate-display">
                        <span id="heart-rate">--</span> BPM
                    </div>
                    <div class="progress-bar">
                        <div id="progress-fill"></div>
                    </div>
                </div>
                <button onclick="startVitalsTest()">Start Measurement</button>
            </div>
        `;
    }

    async startVitalsTest() {
        const video = document.getElementById('skin-camera');
        const canvas = document.getElementById('skin-canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Start capturing video frames
        const frames = [];
        const startTime = Date.now();
        
        const captureInterval = setInterval(() => {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const averageBrightness = this.calculateAverageBrightness(imageData);
            frames.push(averageBrightness);
            
            // Update progress bar
            const progress = (Date.now() - startTime) / 10000; // 10 seconds measurement
            document.getElementById('progress-fill').style.width = `${progress * 100}%`;
            
            if (progress >= 1) {
                clearInterval(captureInterval);
                this.analyzeVitals(frames);
            }
        }, 100);
    }

    calculateAverageBrightness(imageData) {
        let sum = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            sum += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        }
        return sum / (imageData.data.length / 4);
    }

    analyzeVitals(frames) {
        // Apply FFT to detect heart rate
        const fft = new FFT(frames.length);
        const spectrum = fft.forward(frames);
        
        // Find dominant frequency (heart rate)
        let maxAmplitude = 0;
        let heartRate = 0;
        
        for (let i = 1; i < spectrum.length / 2; i++) {
            const amplitude = Math.sqrt(spectrum[i][0] * spectrum[i][0] + spectrum[i][1] * spectrum[i][1]);
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
                heartRate = i * 6; // Convert to BPM
            }
        }
        
        const result = {
            heartRate: Math.round(heartRate),
            status: this.getHeartRateStatus(heartRate),
            recommendations: this.getHeartRateRecommendations(heartRate)
        };
        
        this.storageManager.saveTestResult('vitals', result);
        this.showTestResult(result);
    }

    getHeartRateStatus(heartRate) {
        if (heartRate < 60) return 'Bradycardia';
        if (heartRate > 100) return 'Tachycardia';
        return 'Normal';
    }

    getHeartRateRecommendations(heartRate) {
        if (heartRate < 60) return 'Your heart rate is below normal. Consider consulting a healthcare provider.';
        if (heartRate > 100) return 'Your heart rate is above normal. Consider consulting a healthcare provider.';
        return 'Your heart rate is within normal range. Continue regular monitoring.';
    }

    async startMotionTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Hold your device and follow the on-screen instructions to test your range of motion.</p>
                <div class="motion-container">
                    <div id="motion-guide">
                        <p>Move your device to match the target position shown below:</p>
                        <div id="target-position"></div>
                    </div>
                    <div id="motion-feedback"></div>
                    <div class="motion-visualization">
                        <canvas id="motion-canvas"></canvas>
                    </div>
                </div>
                <button onclick="startMotionTest()">Start Test</button>
            </div>
        `;
    }

    async startMotionTest() {
        if (!window.DeviceMotionEvent) {
            alert('Device motion sensors are not available on this device.');
            return;
        }

        const positions = [
            { x: 0, y: 0, z: 0 },    // Center
            { x: 45, y: 0, z: 0 },   // Right
            { x: -45, y: 0, z: 0 },  // Left
            { x: 0, y: 45, z: 0 },   // Up
            { x: 0, y: -45, z: 0 },  // Down
            { x: 0, y: 0, z: 45 }    // Forward
        ];

        const results = [];
        let currentPosition = 0;

        const handleMotion = (event) => {
            const { alpha, beta, gamma } = event.rotationRate;
            const target = positions[currentPosition];
            
            const accuracy = this.calculateMotionAccuracy(
                { x: gamma, y: beta, z: alpha },
                target
            );
            
            results.push(accuracy);
            
            if (results.length >= 10) {
                window.removeEventListener('devicemotion', handleMotion);
                this.analyzeMotionResults(results);
            }
        };

        window.addEventListener('devicemotion', handleMotion);
    }

    calculateMotionAccuracy(current, target) {
        const dx = Math.abs(current.x - target.x);
        const dy = Math.abs(current.y - target.y);
        const dz = Math.abs(current.z - target.z);
        
        return 100 - ((dx + dy + dz) / 3);
    }

    analyzeMotionResults(results) {
        const averageAccuracy = results.reduce((a, b) => a + b, 0) / results.length;
        
        const result = {
            accuracy: Math.round(averageAccuracy),
            status: this.getMotionStatus(averageAccuracy),
            recommendations: this.getMotionRecommendations(averageAccuracy)
        };
        
        this.storageManager.saveTestResult('motion', result);
        this.showTestResult(result);
    }

    getMotionStatus(accuracy) {
        if (accuracy >= 80) return 'Excellent';
        if (accuracy >= 60) return 'Good';
        if (accuracy >= 40) return 'Fair';
        return 'Poor';
    }

    getMotionRecommendations(accuracy) {
        if (accuracy >= 80) return 'Your range of motion is excellent. Continue regular exercise.';
        if (accuracy >= 60) return 'Your range of motion is good. Consider adding flexibility exercises to your routine.';
        if (accuracy >= 40) return 'Your range of motion is fair. Consider consulting a physical therapist.';
        return 'Your range of motion is limited. Please consult a healthcare provider.';
    }

    async startReactionTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Click the button as soon as it turns green.</p>
                <div class="reaction-container">
                    <button id="reaction-button" onclick="handleReactionClick()">Wait for green...</button>
                    <div id="reaction-time">Reaction time: -- ms</div>
                </div>
                <button onclick="startReactionTest()">Start Test</button>
            </div>
        `;
    }

    async startTremorTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Hold your device steady for 30 seconds to analyze tremor patterns.</p>
                <div class="tremor-container">
                    <div class="tremor-visualization">
                        <canvas id="tremor-canvas"></canvas>
                    </div>
                    <div id="tremor-feedback"></div>
                    <div class="tremor-graph">
                        <div id="x-axis"></div>
                        <div id="y-axis"></div>
                        <div id="z-axis"></div>
                    </div>
                </div>
                <button onclick="startTremorTest()">Start Test</button>
            </div>
        `;
    }

    async startTremorTest() {
        if (!window.DeviceMotionEvent) {
            alert('Device motion sensors are not available on this device.');
            return;
        }

        const results = {
            x: [],
            y: [],
            z: []
        };
        let startTime = Date.now();
        const testDuration = 30000; // 30 seconds

        const canvas = document.getElementById('tremor-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 200;

        const handleMotion = (event) => {
            const { accelerationIncludingGravity } = event;
            const { x, y, z } = accelerationIncludingGravity;
            
            // Record acceleration data
            results.x.push(x);
            results.y.push(y);
            results.z.push(z);
            
            // Update visualization
            this.updateTremorVisualization(ctx, results);
            
            if (Date.now() - startTime >= testDuration) {
                window.removeEventListener('devicemotion', handleMotion);
                this.analyzeTremorResults(results);
            }
        };

        window.addEventListener('devicemotion', handleMotion);
    }

    updateTremorVisualization(ctx, results) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw x-axis movement
        ctx.beginPath();
        ctx.strokeStyle = '#FF0000';
        results.x.forEach((value, index) => {
            const x = (index / results.x.length) * ctx.canvas.width;
            const y = (value + 10) * 10; // Scale and offset for visualization
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw y-axis movement
        ctx.beginPath();
        ctx.strokeStyle = '#00FF00';
        results.y.forEach((value, index) => {
            const x = (index / results.y.length) * ctx.canvas.width;
            const y = (value + 10) * 10;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw z-axis movement
        ctx.beginPath();
        ctx.strokeStyle = '#0000FF';
        results.z.forEach((value, index) => {
            const x = (index / results.z.length) * ctx.canvas.width;
            const y = (value + 10) * 10;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    }

    analyzeTremorResults(results) {
        // Calculate tremor intensity for each axis
        const xIntensity = this.calculateTremorIntensity(results.x);
        const yIntensity = this.calculateTremorIntensity(results.y);
        const zIntensity = this.calculateTremorIntensity(results.z);
        
        // Calculate overall tremor score
        const averageIntensity = (xIntensity + yIntensity + zIntensity) / 3;
        
        const result = {
            intensity: Math.round(averageIntensity),
            status: this.getTremorStatus(averageIntensity),
            recommendations: this.getTremorRecommendations(averageIntensity)
        };
        
        this.storageManager.saveTestResult('tremor', result);
        this.showTestResult(result);
    }

    calculateTremorIntensity(values) {
        // Calculate standard deviation of acceleration values
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance) * 100; // Scale for better readability
    }

    getTremorStatus(intensity) {
        if (intensity < 0.5) return 'None';
        if (intensity < 1.0) return 'Mild';
        if (intensity < 2.0) return 'Moderate';
        return 'Severe';
    }

    getTremorRecommendations(intensity) {
        if (intensity < 0.5) return 'No significant tremor detected. Continue regular monitoring.';
        if (intensity < 1.0) return 'Mild tremor detected. Consider lifestyle modifications and regular monitoring.';
        if (intensity < 2.0) return 'Moderate tremor detected. Please consult a healthcare provider.';
        return 'Severe tremor detected. Immediate consultation with a healthcare provider is recommended.';
    }

    async startBalanceTest(container) {
        container.innerHTML = `
            <div class="test-instructions">
                <p>Hold your device level and follow the on-screen instructions to test your balance.</p>
                <div class="balance-container">
                    <div id="balance-guide">
                        <p>Keep the dot centered in the circle:</p>
                        <div class="balance-visualization">
                            <div class="target-circle"></div>
                            <div id="balance-dot"></div>
                        </div>
                    </div>
                    <div id="balance-feedback"></div>
                </div>
                <button onclick="startBalanceTest()">Start Test</button>
            </div>
        `;
    }

    async startBalanceTest() {
        if (!window.DeviceOrientationEvent) {
            alert('Device orientation sensors are not available on this device.');
            return;
        }

        const results = [];
        let startTime = Date.now();
        const testDuration = 30000; // 30 seconds

        const handleOrientation = (event) => {
            const { beta, gamma } = event;
            const dot = document.getElementById('balance-dot');
            
            // Update dot position based on device tilt
            const x = (gamma / 90) * 50;
            const y = (beta / 90) * 50;
            
            dot.style.transform = `translate(${x}px, ${y}px)`;
            
            // Calculate deviation from center
            const deviation = Math.sqrt(x * x + y * y);
            results.push(deviation);
            
            if (Date.now() - startTime >= testDuration) {
                window.removeEventListener('deviceorientation', handleOrientation);
                this.analyzeBalanceResults(results);
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);
    }

    analyzeBalanceResults(results) {
        const averageDeviation = results.reduce((a, b) => a + b, 0) / results.length;
        const stabilityScore = 100 - (averageDeviation * 2);
        
        const result = {
            score: Math.round(stabilityScore),
            status: this.getBalanceStatus(stabilityScore),
            recommendations: this.getBalanceRecommendations(stabilityScore)
        };
        
        this.storageManager.saveTestResult('balance', result);
        this.showTestResult(result);
    }

    getBalanceStatus(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    }

    getBalanceRecommendations(score) {
        if (score >= 80) return 'Your balance is excellent. Continue regular exercise.';
        if (score >= 60) return 'Your balance is good. Consider adding balance exercises to your routine.';
        if (score >= 40) return 'Your balance is fair. Consider consulting a physical therapist.';
        return 'Your balance needs improvement. Please consult a healthcare provider.';
    }

    async analyzeSkin() {
        const video = document.getElementById('skin-camera');
        const canvas = document.getElementById('skin-canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for analysis
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Preprocess image for TensorFlow
        const tensor = tf.browser.fromPixels(imageData)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims();
        
        // Make prediction
        const predictions = await this.model.predict(tensor).data();
        
        // Process results
        const conditions = ['Normal', 'Acne', 'Eczema', 'Psoriasis', 'Rosacea'];
        const result = {
            condition: conditions[predictions.indexOf(Math.max(...predictions))],
            confidence: Math.max(...predictions),
            recommendations: this.getSkinRecommendations(conditions[predictions.indexOf(Math.max(...predictions))])
        };
        
        // Save result
        this.storageManager.saveTestResult('skin', result);
        
        // Show result
        this.showTestResult(result);
    }

    getSkinRecommendations(condition) {
        const recommendations = {
            'Normal': 'Continue regular skin care routine. No concerning conditions detected.',
            'Acne': 'Consider using non-comedogenic products and maintain a regular cleansing routine.',
            'Eczema': 'Use fragrance-free moisturizers and avoid harsh soaps. Consider consulting a dermatologist.',
            'Psoriasis': 'Keep skin moisturized and avoid triggers. Consult a dermatologist for treatment options.',
            'Rosacea': 'Use gentle skin care products and avoid triggers like spicy foods and alcohol.'
        };
        return recommendations[condition];
    }

    async checkVision() {
        const input = document.getElementById('vision-input').value.toUpperCase();
        const correct = 'EFPOTECECFDPTODEFPOTECECFDPTODEFPOTEC';
        
        // Calculate vision score based on size and accuracy
        let score = 0;
        let sizeIndex = 0;
        const sizes = [60, 45, 30, 20, 15];
        
        for (let i = 0; i < input.length; i++) {
            if (i % 7 === 0 && i > 0) sizeIndex++;
            if (input[i] === correct[i]) {
                score += sizes[sizeIndex];
            }
        }
        
        const totalPossible = sizes.reduce((a, b) => a + b, 0);
        const percentage = (score / totalPossible) * 100;
        
        const result = {
            score: percentage,
            acuity: this.calculateAcuity(percentage),
            recommendations: this.getVisionRecommendations(percentage)
        };
        
        this.storageManager.saveTestResult('vision', result);
        this.showTestResult(result);
    }

    calculateAcuity(percentage) {
        if (percentage >= 90) return '20/20';
        if (percentage >= 80) return '20/25';
        if (percentage >= 70) return '20/30';
        if (percentage >= 60) return '20/40';
        if (percentage >= 50) return '20/50';
        return '20/60';
    }

    getVisionRecommendations(percentage) {
        if (percentage >= 80) return 'Your vision appears to be normal. Continue regular eye check-ups.';
        if (percentage >= 60) return 'Mild visual impairment detected. Consider scheduling an eye exam.';
        return 'Significant visual impairment detected. Please consult an eye care professional.';
    }

    showTestResult(result) {
        const modal = document.getElementById('test-modal');
        const testContent = document.getElementById('test-content');
        
        testContent.innerHTML = `
            <div class="test-result">
                <h4>Test Results</h4>
                <div class="result-details">
                    ${Object.entries(result).map(([key, value]) => `
                        <div class="result-item">
                            <span class="result-label">${key}:</span>
                            <span class="result-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
                <button onclick="closeTestModal()">Close</button>
            </div>
        `;
    }
}

// Initialize health tests when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.healthTests = new HealthTests();
}); 