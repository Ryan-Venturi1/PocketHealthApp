// models/motion-analysis.js
// Range of Motion Analysis Module - PoseNet Integration

// The expected range of motion values for different joints
const JOINT_ROM_REFERENCE = {
    shoulder: {
      flexion: { min: 0, max: 180, description: "Forward arm raise" },
      extension: { min: 0, max: 60, description: "Backward arm movement" },
      abduction: { min: 0, max: 180, description: "Arm raised to side" },
      adduction: { min: 0, max: 50, description: "Arm across body" },
      rotation: { min: 0, max: 90, description: "Arm rotation" }
    },
    elbow: {
      flexion: { min: 0, max: 150, description: "Bending elbow" },
      extension: { min: 150, max: 0, description: "Straightening elbow" },
      pronation: { min: 0, max: 80, description: "Palm down rotation" },
      supination: { min: 0, max: 80, description: "Palm up rotation" }
    },
    wrist: {
      flexion: { min: 0, max: 80, description: "Wrist bend downward" },
      extension: { min: 0, max: 70, description: "Wrist bend upward" },
      radialDeviation: { min: 0, max: 20, description: "Wrist bend toward thumb" },
      ulnarDeviation: { min: 0, max: 30, description: "Wrist bend toward little finger" }
    },
    hip: {
      flexion: { min: 0, max: 120, description: "Leg raise forward" },
      extension: { min: 0, max: 30, description: "Leg movement backward" },
      abduction: { min: 0, max: 45, description: "Leg movement outward" },
      adduction: { min: 0, max: 30, description: "Leg movement across body" },
      rotation: { min: 0, max: 45, description: "Leg rotation" }
    },
    knee: {
      flexion: { min: 0, max: 140, description: "Bending knee" },
      extension: { min: 140, max: 0, description: "Straightening knee" }
    },
    ankle: {
      dorsiflexion: { min: 0, max: 20, description: "Foot upward movement" },
      plantarFlexion: { min: 0, max: 45, description: "Foot downward movement" },
      inversion: { min: 0, max: 35, description: "Foot inward rotation" },
      eversion: { min: 0, max: 25, description: "Foot outward rotation" }
    }
  };
  
  // Using TensorFlow.js and PoseNet for motion tracking
  class MotionAnalyzer {
    constructor() {
      this.poseNetModel = null;
      this.isModelLoaded = false;
      this.isRecording = false;
      this.frameData = [];
      this.jointPositions = [];
      this.angleData = [];
      this.selectedJoint = null;
      this.movementType = null;
      this.startTime = null;
      
      // Configuration
      this.minConfidence = 0.5; // Minimum confidence for keypoint detection
      this.smoothingFactor = 0.7; // For angle smoothing (0-1)
      this.recordingDuration = 5000; // ms
    }
    
    async loadModel(progressCallback) {
      try {
        if (progressCallback) {
          progressCallback({ status: 'loading', progress: 0 });
        }
        
        // Load PoseNet model
        this.poseNetModel = await posenet.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 320, height: 240 },
          multiplier: 0.75,
          quantBytes: 2,
          onProgress: (progress) => {
            if (progressCallback) {
              progressCallback({ status: 'loading', progress });
            }
          }
        });
        
        this.isModelLoaded = true;
        
        if (progressCallback) {
          progressCallback({ status: 'ready', progress: 1 });
        }
        
        return { status: 'loaded' };
      } catch (error) {
        console.error('Error loading PoseNet model:', error);
        
        if (progressCallback) {
          progressCallback({ status: 'error', message: error.message });
        }
        
        return { status: 'error', message: error.message };
      }
    }
    
    setJointAndMovement(joint, movementType) {
      // Validate joint and movement
      if (!JOINT_ROM_REFERENCE[joint]) {
        return { status: 'error', message: 'Invalid joint selected' };
      }
      
      if (movementType && !JOINT_ROM_REFERENCE[joint][movementType]) {
        return { status: 'error', message: 'Invalid movement type for selected joint' };
      }
      
      this.selectedJoint = joint;
      this.movementType = movementType || Object.keys(JOINT_ROM_REFERENCE[joint])[0];
      
      return { 
        status: 'ready', 
        joint: this.selectedJoint, 
        movement: this.movementType,
        description: JOINT_ROM_REFERENCE[joint][this.movementType].description,
        expectedROM: JOINT_ROM_REFERENCE[joint][this.movementType]
      };
    }
    
    startRecording() {
      if (!this.isModelLoaded) {
        return { status: 'error', message: 'Model not loaded' };
      }
      
      if (!this.selectedJoint) {
        return { status: 'error', message: 'No joint selected' };
      }
      
      // Reset data
      this.frameData = [];
      this.jointPositions = [];
      this.angleData = [];
      this.isRecording = true;
      this.startTime = Date.now();
      
      return { 
        status: 'recording', 
        joint: this.selectedJoint, 
        movement: this.movementType 
      };
    }
    
    stopRecording() {
      this.isRecording = false;
      
      // Calculate results if we have data
      if (this.angleData.length > 0) {
        return this.calculateResults();
      }
      
      return { status: 'stopped', message: 'No data collected' };
    }
    
    async processFrame(videoElement) {
      if (!this.isModelLoaded) {
        return { status: 'error', message: 'Model not loaded' };
      }
      
      try {
        // Estimate pose
        const pose = await this.poseNetModel.estimateSinglePose(
          videoElement, 
          {
            flipHorizontal: false
          }
        );
        
        // If recording, store the pose data
        if (this.isRecording) {
          const timestamp = Date.now();
          const elapsedTime = timestamp - this.startTime;
          
          // Calculate joint angle based on selected joint
          const angleData = this.calculateJointAngle(pose, this.selectedJoint, this.movementType);
          
          if (angleData) {
            // Store data
            this.frameData.push({
              timestamp,
              elapsedTime,
              pose
            });
            
            this.jointPositions.push(angleData.positions);
            this.angleData.push({
              angle: angleData.angle,
              timestamp,
              elapsedTime
            });
            
            // Check if recording duration exceeded
            if (elapsedTime > this.recordingDuration) {
              this.isRecording = false;
              return this.calculateResults();
            }
            
            return {
              status: 'recording',
              elapsedTime,
              currentAngle: angleData.angle,
              keypoints: pose.keypoints.filter(kp => kp.score > this.minConfidence)
            };
          }
        }
        
        // If not recording or couldn't calculate angle, just return pose data
        return {
          status: this.isRecording ? 'recording' : 'ready',
          keypoints: pose.keypoints.filter(kp => kp.score > this.minConfidence)
        };
      } catch (error) {
        console.error('Error processing frame:', error);
        return { status: 'error', message: error.message };
      }
    }
    
    calculateJointAngle(pose, joint, movementType) {
      const keypoints = pose.keypoints;
      
      // Helper function to get keypoint if confidence is good
      const getKeypoint = (name) => {
        const keypoint = keypoints.find(kp => kp.part === name);
        return keypoint && keypoint.score > this.minConfidence ? keypoint.position : null;
      };
      
      // Different calculations based on joint
      switch (joint) {
        case 'shoulder': {
          // For shoulder flexion/extension, measure angle between shoulder, elbow, and hip
          const shoulder = getKeypoint('rightShoulder') || getKeypoint('leftShoulder');
          const elbow = getKeypoint('rightElbow') || getKeypoint('leftElbow');
          const hip = getKeypoint('rightHip') || getKeypoint('leftHip');
          
          if (shoulder && elbow && hip) {
            return {
              angle: this.calculateAngle(shoulder, hip, elbow),
              positions: { shoulder, elbow, hip }
            };
          }
          break;
        }
        case 'elbow': {
          // For elbow flexion, measure angle between shoulder, elbow, and wrist
          const shoulder = getKeypoint('rightShoulder') || getKeypoint('leftShoulder');
          const elbow = getKeypoint('rightElbow') || getKeypoint('leftElbow');
          const wrist = getKeypoint('rightWrist') || getKeypoint('leftWrist');
          
          if (shoulder && elbow && wrist) {
            return {
              angle: this.calculateAngle(shoulder, elbow, wrist),
              positions: { shoulder, elbow, wrist }
            };
          }
          break;
        }
        case 'knee': {
          // For knee flexion, measure angle between hip, knee, and ankle
          const hip = getKeypoint('rightHip') || getKeypoint('leftHip');
          const knee = getKeypoint('rightKnee') || getKeypoint('leftKnee');
          const ankle = getKeypoint('rightAnkle') || getKeypoint('leftAnkle');
          
          if (hip && knee && ankle) {
            return {
              angle: this.calculateAngle(hip, knee, ankle),
              positions: { hip, knee, ankle }
            };
          }
          break;
        }
        case 'ankle': {
          // For ankle dorsiflexion/plantarflexion
          const knee = getKeypoint('rightKnee') || getKeypoint('leftKnee');
          const ankle = getKeypoint('rightAnkle') || getKeypoint('leftAnkle');
          const foot = getKeypoint('rightHeel') || getKeypoint('leftHeel');
          
          if (knee && ankle && foot) {
            return {
              angle: this.calculateAngle(knee, ankle, foot),
              positions: { knee, ankle, foot }
            };
          }
          break;
        }
        // Additional joints could be added with their specific calculations
      }
      
      return null;
    }
    
    calculateAngle(pointA, pointB, pointC) {
      // Calculate angle between three points (pointB is the vertex)
      const angleRad = Math.atan2(
        pointC.y - pointB.y,
        pointC.x - pointB.x
      ) - Math.atan2(
        pointA.y - pointB.y,
        pointA.x - pointB.x
      );
      
      // Convert to degrees and ensure positive angle
      let angleDeg = Math.abs(angleRad * 180 / Math.PI);
      
      // Ensure angle is in the range [0, 180]
      if (angleDeg > 180) {
        angleDeg = 360 - angleDeg;
      }
      
      return angleDeg;
    }
    
    calculateResults() {
      if (this.angleData.length === 0) {
        return { 
          status: 'error', 
          message: 'No motion data collected' 
        };
      }
      
      // Find maximum angle achieved
      const angles = this.angleData.map(data => data.angle);
      const maxAngle = Math.max(...angles);
      const minAngle = Math.min(...angles);
      const rangeOfMotion = maxAngle - minAngle;
      
      // Get reference values for the selected joint and movement
      const referenceROM = JOINT_ROM_REFERENCE[this.selectedJoint][this.movementType];
      const expectedRange = referenceROM.max - referenceROM.min;
      
      // Calculate percentage of expected ROM
      const romPercentage = (rangeOfMotion / expectedRange) * 100;
      
      // Calculate smoothness (using standard deviation of angle change rate)
      const angleChanges = [];
      for (let i = 1; i < this.angleData.length; i++) {
        const timeChange = (this.angleData[i].timestamp - this.angleData[i-1].timestamp) / 1000; // in seconds
        const angleChange = Math.abs(this.angleData[i].angle - this.angleData[i-1].angle);
        
        if (timeChange > 0) {
          angleChanges.push(angleChange / timeChange); // degrees per second
        }
      }
      
      // Calculate standard deviation of angle changes
      const avgChange = angleChanges.reduce((sum, val) => sum + val, 0) / angleChanges.length;
      const variance = angleChanges.reduce((sum, val) => sum + Math.pow(val - avgChange, 2), 0) / angleChanges.length;
      const stdDev = Math.sqrt(variance);
      
      // Convert to smoothness score (lower stdDev is smoother)
      const smoothnessScore = Math.max(0, 100 - (stdDev * 0.5));
      
      // Determine ROM category
      let romCategory, romMessage, alertLevel;
      
      if (romPercentage >= 85) {
        romCategory = "Normal Range of Motion";
        romMessage = `Your ${this.selectedJoint} shows normal range of motion for ${this.movementType}, achieving approximately ${rangeOfMotion.toFixed(1)}° out of an expected ${expectedRange}°.`;
        alertLevel = "success";
      } else if (romPercentage >= 60) {
        romCategory = "Slightly Limited Range of Motion";
        romMessage = `Your ${this.selectedJoint} shows slightly limited range of motion for ${this.movementType}, achieving approximately ${rangeOfMotion.toFixed(1)}° out of an expected ${expectedRange}°.`;
        alertLevel = "info";
      } else {
        romCategory = "Restricted Range of Motion";
        romMessage = `Your ${this.selectedJoint} shows restricted range of motion for ${this.movementType}, achieving approximately ${rangeOfMotion.toFixed(1)}° out of an expected ${expectedRange}°.`;
        alertLevel = "warning";
      }
      
      // Determine movement quality
      let movementQuality;
      if (smoothnessScore > 80) {
        movementQuality = "Smooth, controlled movement";
      } else if (smoothnessScore > 60) {
        movementQuality = "Somewhat unsteady movement";
      } else {
        movementQuality = "Jerky, uncontrolled movement";
      }
      
      return {
        status: 'complete',
        joint: this.selectedJoint,
        movement: this.movementType,
        maxAngle,
        minAngle,
        rangeOfMotion,
        romPercentage,
        smoothnessScore,
        category: romCategory,
        message: romMessage,
        movementQuality,
        alertLevel,
        dataPoints: this.angleData.length,
        recordingDuration: (this.angleData[this.angleData.length-1].timestamp - this.angleData[0].timestamp) / 1000
      };
    }
    
    // Draw skeleton overlay on canvas for visualization
    drawSkeleton(canvas, pose, targetJoint) {
      if (!pose || !canvas) return;
      
      const ctx = canvas.getContext('2d');
      const keypoints = pose.keypoints;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw all keypoints with sufficient confidence
      keypoints
        .filter(kp => kp.score > this.minConfidence)
        .forEach(kp => {
          ctx.beginPath();
          ctx.arc(kp.position.x, kp.position.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'blue';
          ctx.fill();
        });
      
      // Draw connections between keypoints
      const adjacentPairs = [
        ['leftShoulder', 'rightShoulder'],
        ['leftShoulder', 'leftElbow'],
        ['leftElbow', 'leftWrist'],
        ['rightShoulder', 'rightElbow'],
        ['rightElbow', 'rightWrist'],
        ['leftShoulder', 'leftHip'],
        ['rightShoulder', 'rightHip'],
        ['leftHip', 'rightHip'],
        ['leftHip', 'leftKnee'],
        ['leftKnee', 'leftAnkle'],
        ['rightHip', 'rightKnee'],
        ['rightKnee', 'rightAnkle']
      ];
      
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      
      adjacentPairs.forEach(([partA, partB]) => {
        const keypointA = keypoints.find(kp => kp.part === partA);
        const keypointB = keypoints.find(kp => kp.part === partB);
        
        if (keypointA && keypointB && 
            keypointA.score > this.minConfidence && 
            keypointB.score > this.minConfidence) {
          ctx.beginPath();
          ctx.moveTo(keypointA.position.x, keypointA.position.y);
          ctx.lineTo(keypointB.position.x, keypointB.position.y);
          ctx.stroke();
        }
      });
      
      // Highlight the targeted joint if relevant
      if (targetJoint) {
        // Draw special visualization for target joint
        // Implementation depends on the specific joint...
      }
    }
  }
  
  // Export for use in main application
  export { MotionAnalyzer, JOINT_ROM_REFERENCE };