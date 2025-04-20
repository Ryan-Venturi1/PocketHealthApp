// models/vision-tests.js
// Vision Test Module - Standardized Implementation

// Configuration for visual acuity test
const ACUITY_TEST_CONFIG = {
    levels: [
      { size: 72, letter: 'E', options: ['E', 'F', 'B'], snellen: '20/200' },
      { size: 36, letter: 'H', options: ['H', 'N', 'K'], snellen: '20/100' },
      { size: 18, letter: 'C', options: ['C', 'G', 'O'], snellen: '20/50' },
      { size: 12, letter: 'D', options: ['D', 'O', 'Q'], snellen: '20/30' },
      { size: 9, letter: 'P', options: ['P', 'R', 'F'], snellen: '20/20' }
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
    }
  ];
  
  // Configuration for astigmatism test
  const ASTIGMATISM_LINES_CONFIG = {
    lineCount: 18,
    radius: 140
  };
  
  // Class for managing vision tests
  class VisionTestManager {
    constructor() {
      this.resetTests();
    }
    
    resetTests() {
      this.currentTest = null;
      this.currentStep = 0;
      this.results = {};
      this.testComplete = false;
    }
    
    startTest(testType) {
      this.resetTests();
      this.currentTest = testType;
      
      return {
        testType,
        instructions: this.getInstructions(testType),
        ready: true
      };
    }
    
    getInstructions(testType) {
      switch(testType) {
        case 'acuity':
          return "This test will show letters of different sizes. Try to identify them correctly. Hold your device at arm's length (about 40cm or 16 inches) from your eyes.";
        case 'color':
          return "This test will show patterns similar to Ishihara color plates. Try to identify the numbers hidden in the patterns.";
        case 'astigmatism':
          return "This test shows a pattern of lines. If some lines appear sharper or darker than others, it may indicate astigmatism.";
        default:
          return "Select a vision test to begin.";
      }
    }
    
    getCurrentTestData() {
      switch(this.currentTest) {
        case 'acuity':
          return this.getAcuityTestData();
        case 'color':
          return this.getColorTestData();
        case 'astigmatism':
          return this.getAstigmatismTestData();
        default:
          return null;
      }
    }
    
    getAcuityTestData() {
      if (this.currentStep >= ACUITY_TEST_CONFIG.levels.length) {
        this.testComplete = true;
        return this.calculateAcuityResults();
      }
      
      const level = ACUITY_TEST_CONFIG.levels[this.currentStep];
      return {
        type: 'acuity',
        step: this.currentStep + 1,
        totalSteps: ACUITY_TEST_CONFIG.levels.length,
        fontSize: level.size,
        letter: level.letter,
        options: level.options,
        snellen: level.snellen
      };
    }
    
    getColorTestData() {
      if (this.currentStep >= COLOR_TEST_CONFIG.length) {
        this.testComplete = true;
        return this.calculateColorResults();
      }
      
      const plate = COLOR_TEST_CONFIG[this.currentStep];
      return {
        type: 'color',
        step: this.currentStep + 1,
        totalSteps: COLOR_TEST_CONFIG.length,
        number: plate.number,
        colors: plate.colors,
        bgColors: plate.bgColors,
        plateData: plate
      };
    }
    
    getAstigmatismTestData() {
      if (this.currentStep >= 2) {
        this.testComplete = true;
        return this.calculateAstigmatismResults();
      }
      
      return {
        type: 'astigmatism',
        step: this.currentStep + 1,
        totalSteps: 2,
        lineCount: ASTIGMATISM_LINES_CONFIG.lineCount,
        radius: ASTIGMATISM_LINES_CONFIG.radius,
        question: this.currentStep === 0 
          ? "Do all lines appear equally dark and clear?" 
          : "If some lines appear darker/clearer, which direction?"
      };
    }
    
    submitAnswer(answer) {
      if (!this.currentTest || this.testComplete) {
        return { error: "No test in progress" };
      }
      
      // Save answer
      this.results[`${this.currentTest}_${this.currentStep}`] = answer;
      
      // Move to next step
      this.currentStep++;
      
      // Get next test data
      const nextData = this.getCurrentTestData();
      
      return {
        accepted: true,
        testComplete: this.testComplete,
        nextStep: nextData
      };
    }
    
    calculateAcuityResults() {
      const correctAnswers = Object.entries(this.results)
        .filter(([key, value]) => key.startsWith('acuity_'))
        .map(([key, value], index) => {
          const stepIndex = parseInt(key.split('_')[1]);
          const level = ACUITY_TEST_CONFIG.levels[stepIndex];
          return value === level.letter;
        });
      
      const correctCount = correctAnswers.filter(Boolean).length;
      const totalQuestions = correctAnswers.length;
      
      // Determine the best visual acuity level passed
      let bestAcuity = '20/200+'; // Default/worst
      
      for (let i = ACUITY_TEST_CONFIG.levels.length - 1; i >= 0; i--) {
        const key = `acuity_${i}`;
        if (this.results[key] === ACUITY_TEST_CONFIG.levels[i].letter) {
          bestAcuity = ACUITY_TEST_CONFIG.levels[i].snellen;
          break;
        }
      }
      
      // Calculate score as percentage
      const score = (correctCount / totalQuestions) * 100;
      
      // Determine result category and message
      let category, message, alertLevel;
      
      if (score >= 80 && bestAcuity === '20/20') {
        category = "Normal Vision";
        message = "Your visual acuity appears to be excellent. You correctly identified most characters including the smallest ones.";
        alertLevel = "success";
      } else if (score >= 60) {
        category = "Mild Visual Impairment";
        message = "Your visual acuity appears to be good but not perfect. Consider a professional eye exam for a more comprehensive assessment.";
        alertLevel = "info";
      } else {
        category = "Visual Acuity Concerns";
        message = "You may benefit from a comprehensive eye examination. This simple test suggests potential visual acuity issues.";
        alertLevel = "warning";
      }
      
      return {
        type: 'results',
        testType: 'acuity',
        correctCount,
        totalQuestions,
        score,
        bestAcuity,
        category,
        message,
        alertLevel,
        details: this.results
      };
    }
    
    calculateColorResults() {
      const answers = Object.entries(this.results)
        .filter(([key]) => key.startsWith('color_'))
        .map(([key, value], index) => {
          const stepIndex = parseInt(key.split('_')[1]);
          const correctNumber = COLOR_TEST_CONFIG[stepIndex].number;
          const colorBlindSees = COLOR_TEST_CONFIG[stepIndex].colorBlindSees;
          
          return {
            correct: value === correctNumber,
            userSaw: value,
            shouldSee: correctNumber,
            colorBlindSees,
            type: COLOR_TEST_CONFIG[stepIndex].type
          };
        });
      
      const correctCount = answers.filter(a => a.correct).length;
      const totalQuestions = answers.length;
      
      // Check for specific color vision deficiency patterns
      const redGreenErrors = answers.filter(a => 
        a.type === 'redGreen' && !a.correct && a.userSaw === a.colorBlindSees).length;
      
      const tritanErrors = answers.filter(a => 
        a.type === 'tritan' && !a.correct && a.userSaw === a.colorBlindSees).length;
      
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
      
      return {
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
    }
    
    calculateAstigmatismResults() {
      const firstAnswer = this.results['astigmatism_0']; // Equal or unequal
      const secondAnswer = this.results['astigmatism_1']; // Direction
      
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
      
      return {
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
    }
    
    // Helper function to generate a simulated Ishihara plate with HTML/CSS
    generateIshiharaPlateHtml(plateData) {
      return `
        <div class="ishihara-plate" 
             style="width: 250px; height: 250px; border-radius: 50%; position: relative; overflow: hidden; margin: 0 auto;">
          <!-- Background dots -->
          ${Array(300).fill().map(() => {
            const size = 5 + Math.random() * 15;
            return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; 
                               background-color: ${plateData.bgColors[Math.floor(Math.random() * plateData.bgColors.length)]}; 
                               position: absolute; 
                               left: ${Math.random() * 250}px; 
                               top: ${Math.random() * 250}px;"></div>`;
          }).join('')}
          
          <!-- Number dots would be generated here -->
          <!-- This is simplified - a real implementation would use canvas or SVG -->
        </div>
      `;
    }
  }
  
  // Export for use in main application
  export { VisionTestManager, ACUITY_TEST_CONFIG, COLOR_TEST_CONFIG, ASTIGMATISM_LINES_CONFIG };