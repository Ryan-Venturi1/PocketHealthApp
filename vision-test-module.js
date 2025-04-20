// vision-test-module.js - Interactive vision test implementation

// Configuration for visual acuity test
const ACUITY_TEST_CONFIG = {
    levels: [
      { size: 72, letter: 'E', options: ['E', 'F', 'B'], snellen: '20/200' },
      { size: 36, letter: 'H', options: ['H', 'N', 'K'], snellen: '20/100' },
      { size: 18, letter: 'C', options: ['C', 'G', 'O'], snellen: '20/50' },
      { size: 12, letter: 'D', options: ['D', 'O', 'Q'], snellen: '20/30' },
      { size: 9, letter: 'P', options: ['P', 'R', 'F'], snellen: '20/20' },
      { size: 7, letter: 'T', options: ['T', 'Y', 'I'], snellen: '20/15' }
    ]
  };
  
  // Configuration for color vision test (simulated Ishihara plates)
  const COLOR_TEST_CONFIG = [
    { 
      number: '74', 
      colors: ['#CD5C5C', '#F08080', '#FA8072', '#E9967A'], 
      bgColors: ['#FFB6C1', '#FFA07A'],
      colorBlindSees: null,
      type: 'redGreen'
    },
    { 
      number: '6', 
      colors: ['#66CDAA', '#8FBC8F', '#3CB371', '#2E8B57'], 
      bgColors: ['#98FB98', '#90EE90'],
      colorBlindSees: '5',
      type: 'redGreen'
    },
    { 
      number: '8', 
      colors: ['#6A5ACD', '#483D8B', '#7B68EE', '#9370DB'], 
      bgColors: ['#E6E6FA', '#D8BFD8'],
      colorBlindSees: '3',
      type: 'redGreen'
    },
    { 
      number: '29', 
      colors: ['#DAA520', '#F0E68C', '#EEE8AA', '#F5DEB3'], 
      bgColors: ['#FAFAD2', '#FFFACD'],
      colorBlindSees: '70',
      type: 'tritan'
    },
    { 
      number: '42', 
      colors: ['#4682B4', '#5F9EA0', '#6495ED', '#7B68EE'], 
      bgColors: ['#B0C4DE', '#ADD8E6'],
      colorBlindSees: '4',
      type: 'redGreen'
    }
  ];
  
  // Configuration for astigmatism test
  const ASTIGMATISM_LINES_CONFIG = {
    lineCount: 18,
    radius: 140
  };
  
  // Module state
  const visionModule = {
    currentTest: null,
    currentStep: 0,
    results: {},
    testComplete: false,
    deviceWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio || 1,
    testContainer: null
  };
  
  /**
   * Initialize the vision test module
   */
  export function initVisionModule() {
    try {
      // Store reference to test container
      visionModule.testContainer = document.getElementById('vision-test-container');
      
      // Set up event listeners
      setupEventListeners();
      
      // Update device metrics on resize
      window.addEventListener('resize', updateDeviceMetrics);
      
      // Initial device metrics
      updateDeviceMetrics();
      
      return { status: 'initialized' };
    } catch (error) {
      console.error('Error initializing vision module:', error);
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Set up event listeners for the vision test
   */
  function setupEventListeners() {
    // Test selection buttons
    const testOptions = document.querySelectorAll('.test-option');
    if (testOptions.length > 0) {
      testOptions.forEach(option => {
        option.addEventListener('click', () => {
          selectTest(option.dataset.test);
        });
      });
    }
    
    // Next step button
    const nextButton = document.getElementById('next-vision-step');
    if (nextButton) {
      nextButton.addEventListener('click', advanceTest);
    }
  }
  
  /**
   * Update device metrics for scaling
   */
  function updateDeviceMetrics() {
    visionModule.deviceWidth = window.innerWidth;
    visionModule.devicePixelRatio = window.devicePixelRatio || 1;
    visionModule.deviceHeight = window.innerHeight;
    
    // Update scale for physical distance estimation
    calculatePhysicalScaleFactor();
  }
  
  /**
   * Calculate physical scale factor for vision tests
   * This estimates pixels per mm based on typical device properties
   */
  function calculatePhysicalScaleFactor() {
    // Rough estimation - will be more accurate with device-specific info
    // Standard monitor is about 96 DPI, which is about 3.78 pixels per mm
    let pixelsPerMm = 3.78 * visionModule.devicePixelRatio;
    
    // Adjust based on device type (mobile devices typically have higher PPI)
    if (visionModule.deviceWidth < 768) {
      // Mobile devices typically have higher PPI (~160 DPI or higher)
      pixelsPerMm = 6.3 * visionModule.devicePixelRatio;
    }
    
    visionModule.pixelsPerMm = pixelsPerMm;
    return pixelsPerMm;
  }
  
  /**
   * Select a vision test type
   */
  export function selectTest(testType) {
    // Reset current test
    resetTest();
    
    // Set current test
    visionModule.currentTest = testType;
    
    // Update UI to show selected test
    document.querySelectorAll('.test-option').forEach(option => {
      option.classList.toggle('active', option.dataset.test === testType);
    });
    
    // Set up initial test UI
    updateTestUI();
    
    // Enable start button
    const nextButton = document.getElementById('next-vision-step');
    if (nextButton) {
      nextButton.disabled = false;
      nextButton.textContent = 'Start Test';
    }
    
    return {
      status: 'test_selected',
      test: testType
    };
  }
  
  /**
   * Reset current test
   */
  function resetTest() {
    visionModule.currentStep = 0;
    visionModule.results = {};
    visionModule.testComplete = false;
  }
  
  /**
   * Advance to the next step in the test
   */
  export function advanceTest() {
    // Handle first click (start test)
    if (visionModule.currentStep === 0) {
      const nextButton = document.getElementById('next-vision-step');
      if (nextButton) {
        nextButton.textContent = 'Next';
        nextButton.disabled = true; // Disable until answer is selected
      }
    }
    
    // Move to next step
    visionModule.currentStep++;
    
    // Update test UI
    updateTestUI();
    
    return {
      status: 'advanced',
      test: visionModule.currentTest,
      step: visionModule.currentStep
    };
  }
  
  /**
   * Update the test UI based on current test and step
   */
  function updateTestUI() {
    if (!visionModule.testContainer) return;
    
    let testContent = '';
    
    // Different content based on test type
    switch (visionModule.currentTest) {
      case 'acuity':
        testContent = generateAcuityTestUI();
        break;
      case 'color':
        testContent = generateColorTestUI();
        break;
      case 'astigmatism':
        testContent = generateAstigmatismTestUI();
        break;
      default:
        testContent = generateTestSelectionUI();
    }
    
    // Update container
    visionModule.testContainer.innerHTML = testContent;
    
    // If we just created a color plate or astigmatism test, we need to render it
    if (visionModule.currentTest === 'color' && !visionModule.testComplete) {
      renderColorPlate();
    } else if (visionModule.currentTest === 'astigmatism' && !visionModule.testComplete) {
      renderAstigmatismLines();
    }
    
    // Add event listeners to answer buttons if present
    setupAnswerButtons();
  }
  
  /**
   * Generate UI for visual acuity test
   */
  function generateAcuityTestUI() {
    // If test is complete, show results
    if (visionModule.testComplete) {
      return generateAcuityResults();
    }
    
    // If first step (step 0), show instructions
    if (visionModule.currentStep === 0) {
      return `
        <div class="test-instructions">
          <h4>Visual Acuity Test</h4>
          <p>This test will check how well you can see small details at a distance.</p>
          <ol>
            <li>Hold your device at arm's length (about 40cm or 16 inches)</li>
            <li>If you wear glasses for distance, keep them on</li>
            <li>Cover one eye, then identify the letter shown</li>
            <li>After completing the test with one eye, repeat with the other eye</li>
          </ol>
          <p>Press "Start Test" when ready</p>
        </div>
      `;
    }
    
    // Show acuity test letter
    const testStep = visionModule.currentStep - 1;
    
    // Check if we've completed all levels
    if (testStep >= ACUITY_TEST_CONFIG.levels.length) {
      visionModule.testComplete = true;
      return generateAcuityResults();
    }
    
    const level = ACUITY_TEST_CONFIG.levels[testStep];
    
    // Calculate font size with scaling for device pixel density
    // This helps standardize the physical size across devices
    const scaledFontSize = Math.round(level.size * (visionModule.pixelsPerMm / 3.78));
    
    return `
      <div class="vision-chart" style="font-size: ${scaledFontSize}px; margin-bottom: 20px; font-family: monospace; text-align: center;">
        ${level.letter}
      </div>
      <div class="vision-input">
        <p>What letter do you see?</p>
        <div class="button-group">
          ${level.options.map(option => 
            `<button class="vision-answer" data-answer="${option}">${option}</button>`
          ).join('')}
        </div>
      </div>
      <div class="test-progress">
        Step ${visionModule.currentStep} of ${ACUITY_TEST_CONFIG.levels.length}
      </div>
    `;
  }
  
  /**
   * Generate UI for color vision test
   */
  function generateColorTestUI() {
    // If test is complete, show results
    if (visionModule.testComplete) {
      return generateColorResults();
    }
    
    // If first step (step 0), show instructions
    if (visionModule.currentStep === 0) {
      return `
        <div class="test-instructions">
          <h4>Color Vision Test</h4>
          <p>This test will check for color vision deficiencies using Ishihara-style plates.</p>
          <ol>
            <li>Look at each color plate shown</li>
            <li>Try to identify the number hidden in the pattern</li>
            <li>Select the number you see, or choose "Can't See Any Number" if you don't see one</li>
          </ol>
          <p>Ensure you're in a well-lit environment.</p>
          <p>Press "Start Test" when ready</p>
        </div>
      `;
    }
    
    // Show color test plate
    const testStep = visionModule.currentStep - 1;
    
    // Check if we've completed all plates
    if (testStep >= COLOR_TEST_CONFIG.length) {
      visionModule.testComplete = true;
      return generateColorResults();
    }
    
    const plate = COLOR_TEST_CONFIG[testStep];
    
    return `
      <div class="color-test">
        <p>What number do you see in the pattern?</p>
        <div id="color-plate" class="ishihara-plate"></div>
        <div class="button-group">
          <button class="vision-answer" data-answer="${plate.number}">${plate.number}</button>
          <button class="vision-answer" data-answer="none">Can't See Any Number</button>
          <button class="vision-answer" data-answer="different">Different Number</button>
        </div>
      </div>
      <div class="test-progress">
        Step ${visionModule.currentStep} of ${COLOR_TEST_CONFIG.length}
      </div>
    `;
  }
  
  /**
   * Generate UI for astigmatism test
   */
  function generateAstigmatismTestUI() {
    // If test is complete, show results
    if (visionModule.testComplete) {
      return generateAstigmatismResults();
    }
    
    // If first step (step 0), show instructions
    if (visionModule.currentStep === 0) {
      return `
        <div class="test-instructions">
          <h4>Astigmatism Test</h4>
          <p>This test helps detect astigmatism, which is when your eye isn't completely round.</p>
          <ol>
            <li>Look at the pattern of lines from a comfortable distance</li>
            <li>Notice if some lines appear darker, blurrier, or more distinct than others</li>
            <li>Follow the prompts to describe what you see</li>
          </ol>
          <p>Press "Start Test" when ready</p>
        </div>
      `;
    }
    
    // Different question based on step
    const question = visionModule.currentStep === 1 
      ? "Do all lines appear equally dark and clear?" 
      : "Which direction of lines appears darker or clearer?";
    
    // Different answer options based on step
    const answerOptions = visionModule.currentStep === 1 
      ? `<button class="vision-answer" data-answer="equal">All lines look equal</button>
         <button class="vision-answer" data-answer="unequal">Some lines are darker/clearer</button>` 
      : `<button class="vision-answer" data-answer="horizontal">Horizontal lines</button>
         <button class="vision-answer" data-answer="vertical">Vertical lines</button>
         <button class="vision-answer" data-answer="diagonal">Diagonal lines</button>
         <button class="vision-answer" data-answer="equal">All lines look equal</button>`;
    
    return `
      <div class="astigmatism-test">
        <h4>${question}</h4>
        <div class="radial-lines" id="radial-lines"></div>
        <div class="button-group" style="margin-top: 20px">
          ${answerOptions}
        </div>
      </div>
      <div class="test-progress">
        Step ${visionModule.currentStep} of 2
      </div>
    `;
  }
  
  /**
   * Generate UI for initial test selection
   */
  function generateTestSelectionUI() {
    return `
      <div class="test-instructions">
        <p>Select a test to begin. Hold your device at arm's length for accurate results.</p>
      </div>
    `;
  }
  
  /**
   * Generate results UI for visual acuity test
   */
  function generateAcuityResults() {
    const results = calculateAcuityResults();
    
    return `
      <div class="test-results">
        <h4>Visual Acuity Results</h4>
        <p>You correctly identified ${results.correctCount} out of ${results.totalQuestions} characters.</p>
        <p>Best acuity level: ${results.bestAcuity}</p>
        <div class="alert-box alert-${results.alertLevel}">
          ${results.message}
        </div>
        <p class="disclaimer-note">This is not a substitute for a professional eye examination.</p>
      </div>
    `;
  }
  
  /**
   * Generate results UI for color vision test
   */
  function generateColorResults() {
    const results = calculateColorResults();
    
    return `
      <div class="test-results">
        <h4>Color Vision Results</h4>
        <p>You correctly identified ${results.correctCount} out of ${results.totalQuestions} patterns.</p>
        <div class="alert-box alert-${results.alertLevel}">
          <strong>${results.category}</strong>
          <p>${results.message}</p>
        </div>
        <p class="disclaimer-note">This is not a substitute for a professional color vision examination.</p>
      </div>
    `;
  }
  
  /**
   * Generate results UI for astigmatism test
   */
  function generateAstigmatismResults() {
    const results = calculateAstigmatismResults();
    
    return `
      <div class="test-results">
        <h4>Astigmatism Test Results</h4>
        <p>Astigmatism assessment: ${results.hasAstigmatism ? 'Possible astigmatism detected' : 'No significant astigmatism detected'}</p>
        ${results.direction ? `<p>Axis orientation: ${results.direction}</p>` : ''}
        <div class="alert-box alert-${results.alertLevel}">
          ${results.message}
        </div>
        <p class="disclaimer-note">This is not a substitute for a professional eye examination.</p>
      </div>
    `;
  }
  
  /**
   * Set up answer buttons with event listeners
   */
  function setupAnswerButtons() {
    const answerButtons = document.querySelectorAll('.vision-answer');
    if (answerButtons.length === 0) return;
    
    answerButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        submitAnswer(e.target.dataset.answer);
      });
    });
  }
  
  /**
   * Submit an answer for the current test question
   */
  export function submitAnswer(answer) {
    // Store the answer
    const resultKey = `${visionModule.currentTest}_${visionModule.currentStep}`;
    visionModule.results[resultKey] = answer;
    
    // Highlight selected answer
    document.querySelectorAll('.vision-answer').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.answer === answer);
    });
    
    // Enable next button
    const nextButton = document.getElementById('next-vision-step');
    if (nextButton) {
      nextButton.disabled = false;
    }
    
    return {
      status: 'answer_submitted',
      test: visionModule.currentTest,
      step: visionModule.currentStep,
      answer
    };
  }
  
  /**
   * Render color plate for Ishihara test
   */
  function renderColorPlate() {
    const plateElement = document.getElementById('color-plate');
    if (!plateElement) return;
    
    // Get current plate configuration
    const testStep = visionModule.currentStep - 1;
    if (testStep >= COLOR_TEST_CONFIG.length) return;
    
    const plate = COLOR_TEST_CONFIG[testStep];
    
    // Set plate styles
    Object.assign(plateElement.style, {
      width: '250px',
      height: '250px',
      borderRadius: '50%',
      position: 'relative',
      overflow: 'hidden',
      margin: '0 auto 20px auto',
      backgroundColor: plate.bgColors[0]
    });
    
    // Clear any existing content
    plateElement.innerHTML = '';
    
    // Add background dots
    for (let i = 0; i < 300; i++) {
      const dot = document.createElement('div');
      const size = 5 + Math.random() * 15;
      
      Object.assign(dot.style, {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: plate.bgColors[Math.floor(Math.random() * plate.bgColors.length)],
        position: 'absolute',
        left: `${Math.random() * 250}px`,
        top: `${Math.random() * 250}px`
      });
      
      plateElement.appendChild(dot);
    }
    
    // Create dots for the number pattern
    const digits = plate.number.toString().split('');
    const centerX = 125;
    const centerY = 125;
    
    digits.forEach((digit, index) => {
      let offsetX = (index - (digits.length - 1) / 2) * 50;
      
      // Different patterns for different digits
      let points = [];
      
      // Create character pattern points (simplified)
      if (digit === '0' || digit === '6' || digit === '8' || digit === '9') {
        // Circle for 0,6,8,9
        for (let angle = 0; angle < 360; angle += 20) {
          const radian = angle * Math.PI / 180;
          points.push({
            x: Math.cos(radian) * 30 + centerX + offsetX,
            y: Math.sin(radian) * 40 + centerY
          });
        }
        
        // Add specific features for 6, 8, 9
        if (digit === '6') {
          for (let y = centerY; y <= centerY + 30; y += 6) {
            points.push({ x: centerX + offsetX, y });
          }
        } else if (digit === '8') {
          for (let x = centerX + offsetX - 15; x <= centerX + offsetX + 15; x += 6) {
            points.push({ x, y: centerY });
          }
        } else if (digit === '9') {
          for (let y = centerY - 30; y <= centerY; y += 6) {
            points.push({ x: centerX + offsetX, y });
          }
        }
      } else {
        // Simplified shapes for other digits
        for (let y = centerY - 40; y <= centerY + 40; y += 10) {
          for (let x = centerX + offsetX - 20; x <= centerX + offsetX + 20; x += 10) {
            // Different shapes based on digit
            const dx = x - (centerX + offsetX);
            const dy = y - centerY;
            
            if ((digit === '1' && Math.abs(dx) < 5) ||
                (digit === '7' && (dy < -15 || (dy >= -15 && dx > dy + 40))) ||
                (digit === '2' && ((dy < 0 && dx > -15) || (dy >= 0 && dx < 15))) ||
                (digit === '3' && ((Math.abs(dy) > 15 && dx > 0) || Math.abs(dy) < 10)) ||
                (digit === '4' && (dx > 10 || dy > -5)) ||
                (digit === '5' && ((dy < -15 && dx < 10) || (dy >= -15 && dx > 0)))) {
              points.push({ x, y });
            }
          }
        }
      }
      
      // Create dots for the pattern
      points.forEach(point => {
        if (point.x >= 0 && point.x <= 250 && point.y >= 0 && point.y <= 250) {
          const dot = document.createElement('div');
          const size = 5 + Math.random() * 10;
          
          Object.assign(dot.style, {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            backgroundColor: plate.colors[Math.floor(Math.random() * plate.colors.length)],
            position: 'absolute',
            left: `${point.x - size/2}px`,
            top: `${point.y - size/2}px`
          });
          
          plateElement.appendChild(dot);
        }
      });
    });
  }
  
  /**
   * Render radial lines for astigmatism test
   */
  function renderAstigmatismLines() {
    const container = document.getElementById('radial-lines');
    if (!container) return;
    
    // Set container styles
    Object.assign(container.style, {
      width: '300px',
      height: '300px',
      position: 'relative',
      margin: '20px auto'
    });
    
    // Clear any existing content
    container.innerHTML = '';
    
    const centerX = 150;
    const centerY = 150;
    const radius = 140;
    const lineCount = ASTIGMATISM_LINES_CONFIG.lineCount;
    
    // Draw radial lines
    for (let angle = 0; angle < 180; angle += (180 / lineCount)) {
      const line = document.createElement('div');
      
      Object.assign(line.style, {
        position: 'absolute',
        width: `${radius * 2}px`,
        height: '2px',
        backgroundColor: '#000',
        transformOrigin: 'center',
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        left: '50%',
        top: '50%'
      });
      
      container.appendChild(line);
    }
  }
  
  /**
   * Calculate results for visual acuity test
   */
  function calculateAcuityResults() {
    const correctAnswers = [];
    let totalQuestions = 0;
    let bestLevel = null;
    
    for (let i = 0; i < ACUITY_TEST_CONFIG.levels.length; i++) {
      const level = ACUITY_TEST_CONFIG.levels[i];
      const resultKey = `acuity_${i+1}`;
      
      if (visionModule.results[resultKey]) {
        totalQuestions++;
        const isCorrect = visionModule.results[resultKey] === level.letter;
        correctAnswers.push(isCorrect);
        
        // Track best level where answer was correct
        if (isCorrect) {
          bestLevel = level;
        }
      }
    }
    
    const correctCount = correctAnswers.filter(Boolean).length;
    const score = (correctCount / totalQuestions) * 100;
    const bestAcuity = bestLevel ? bestLevel.snellen : '> 20/200';
    
    // Determine result category and message
    let category, message, alertLevel;
    
    if (score >= 80 && bestAcuity === '20/20') {
      category = "Normal Vision";
      message = "Your visual acuity appears to be excellent. You correctly identified most characters including the smallest ones.";
      alertLevel = "success";
    } else if (score >= 60 || bestAcuity === '20/30') {
      category = "Mild Visual Impairment";
      message = "Your visual acuity appears to be good but not perfect. Consider a professional eye exam for a more comprehensive assessment.";
      alertLevel = "info";
    } else {
      category = "Visual Acuity Concerns";
      message = "You may benefit from a comprehensive eye examination. This simple test suggests potential visual acuity issues.";
      alertLevel = "warning";
    }
    
    // Save to results container
    const results = {
      type: 'results',
      testType: 'acuity',
      correctCount,
      totalQuestions,
      score,
      bestAcuity,
      category,
      message,
      alertLevel,
      details: visionModule.results
    };
    
    // Store in app if available
    storeResults(results);
    
    return results;
  }
  
  /**
   * Calculate results for color vision test
   */
  function calculateColorResults() {
    const answers = [];
    let totalQuestions = 0;
    
    for (let i = 0; i < COLOR_TEST_CONFIG.length; i++) {
      const plate = COLOR_TEST_CONFIG[i];
      const resultKey = `color_${i+1}`;
      
      if (visionModule.results[resultKey]) {
        totalQuestions++;
        const answer = visionModule.results[resultKey];
        const correct = answer === plate.number;
        const colorBlindPattern = answer === plate.colorBlindSees;
        
        answers.push({
          correct,
          userSaw: answer,
          shouldSee: plate.number,
          colorBlindSees: plate.colorBlindSees,
          type: plate.type,
          colorBlindPattern
        });
      }
    }
    
    const correctCount = answers.filter(a => a.correct).length;
    
    // Check for specific color vision deficiency patterns
    const redGreenErrors = answers.filter(a => 
      a.type === 'redGreen' && a.colorBlindPattern).length;
    
    const tritanErrors = answers.filter(a => 
      a.type === 'tritan' && a.colorBlindPattern).length;
    
    // Calculate score as percentage
    const score = (correctCount / totalQuestions) * 100;
    
    // Determine result category and message
    let category, message, alertLevel, deficiencyType = null;
    
    if (score >= 75) {
      category = "Normal Color Vision";
      message = "Your color vision appears to be normal. You correctly identified most patterns.";
      alertLevel = "success";
    } else if (redGreenErrors >= 2) {
      category = "Possible Red-Green Color Deficiency";
      message = "Your responses suggest possible red-green color vision deficiency. Professional testing is recommended.";
      alertLevel = "warning";
      deficiencyType = "redGreen";
    } else if (tritanErrors >= 1) {
      category = "Possible Blue-Yellow Color Deficiency";
      message = "Your responses suggest possible blue-yellow color vision deficiency (tritanopia). This is less common and professional testing is recommended.";
      alertLevel = "warning";
      deficiencyType = "tritan";
    } else {
      category = "Color Vision Concerns";
      message = "You had some difficulty with the color vision tests. Professional testing is recommended for proper evaluation.";
      alertLevel = "info";
    }
    
    // Save to results container
    const results = {
      type: 'results',
      testType: 'color',
      correctCount,
      totalQuestions,
      score,
      category,
      message,
      alertLevel,
      deficiencyType,
      details: answers
    };
    
    // Store in app if available
    storeResults(results);
    
    return results;
  }
  
  /**
   * Calculate results for astigmatism test
   */
  function calculateAstigmatismResults() {
    const firstAnswer = visionModule.results['astigmatism_1']; // Equal or unequal
    const secondAnswer = visionModule.results['astigmatism_2']; // Direction
    
    const hasAstigmatism = firstAnswer === 'unequal';
    const direction = hasAstigmatism ? secondAnswer : null;
    
    // Determine result category and message
    let category, message, alertLevel;
    
    if (hasAstigmatism) {
      category = "Possible Astigmatism";
      message = `You reported that lines appear unequal in clarity, which may indicate astigmatism. ${
        direction ? `Lines in the ${direction} direction appeared clearer, which is consistent with astigmatism.` : ''
      } Professional testing is recommended.`;
      alertLevel = "warning";
    } else {
      category = "No Astigmatism Detected";
      message = "You reported that all lines appear equally clear, which suggests you may not have significant astigmatism.";
      alertLevel = "success";
    }
    
    // Save to results container
    const results = {
      type: 'results',
      testType: 'astigmatism',
      hasAstigmatism,
      direction,
      category,
      message,
      alertLevel,
      details: {
        linesEqual: firstAnswer === 'equal',
        lineDirection: direction
      }
    };
    
    // Store in app if available
    storeResults(results);
    
    return results;
  }
  
  /**
   * Store test results in app state
   */
  function storeResults(results) {
    if (!window.app) return;
    
    // Store in app results
    if (window.app.results) {
      window.app.results.vision.unshift({
        timestamp: new Date().toLocaleString(),
        testType: results.testType,
        results: results
      });
      
      // Limit stored results
      if (window.app.results.vision.length > 10) {
        window.app.results.vision.pop();
      }
    }
    
    // Update user metrics and record activity if user manager is available
    if (window.app.userManager && results.testType === 'acuity') {
      window.app.userManager.updateHealthMetric('vision', results.bestAcuity);
      
      // Record activity
      const activityDetail = `Vision test: ${results.bestAcuity} - ${results.category}`;
      window.app.userManager.addActivityRecord('vision', activityDetail, results);
    }
  }
  
  // Export public API
  export default {
    init: initVisionModule,
    selectTest,
    advanceTest,
    submitAnswer,
    resetTest
  };