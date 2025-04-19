// train-models.js
const tf = require('@tensorflow/tfjs-node-gpu'); // Use GPU for faster training if available
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const glob = require('glob');

// Configuration
const SKIN_DATA_DIR = './data/skin/train';
const WOUND_DATA_DIR = './data/wound/train';
const MODELS_OUTPUT_DIR = './models';
const IMAGE_SIZE = 224; // Size for MobileNet input
const BATCH_SIZE = 32;
const EPOCHS = 50;
const VALIDATION_SPLIT = 0.2;
const LEARNING_RATE = 0.0001;

// Skin condition classes
const SKIN_CONDITIONS = {
  "actinic_keratosis": { display: "Actinic Keratosis", risk: "moderate" },
  "basal_cell_carcinoma": { display: "Basal Cell Carcinoma", risk: "high" },
  "dermatofibroma": { display: "Dermatofibroma", risk: "low" },
  "melanoma": { display: "Melanoma", risk: "high" },
  "nevus": { display: "Nevus (Mole)", risk: "low" },
  "squamous_cell_carcinoma": { display: "Squamous Cell Carcinoma", risk: "high" },
  "seborrheic_keratosis": { display: "Seborrheic Keratosis", risk: "low" },
  "eczema": { display: "Eczema", risk: "low" },
  "psoriasis": { display: "Psoriasis", risk: "low" },
  "rosacea": { display: "Rosacea", risk: "low" },
  "acne": { display: "Acne", risk: "low" }
};

// Wound classes
const WOUND_CLASSES = {
  "clean": { display: "Clean Wound", severity: "low" },
  "infected": { display: "Infected Wound", severity: "high" },
  "deep": { display: "Deep Wound", severity: "moderate" },
  "superficial": { display: "Superficial Wound", severity: "low" },
  "healing": { display: "Healing Wound", severity: "low" }
};

// Helper to load an image and preprocess it
async function loadAndPreprocessImage(imagePath) {
  try {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const ctx = canvas.getContext('2d');
    
    // Draw image to canvas, resizing it
    ctx.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
    
    // Convert to tensor and normalize to [-1, 1] for MobileNet
    const tensor = tf.browser.fromPixels(imageData)
      .toFloat()
      .div(tf.scalar(127.5))
      .sub(tf.scalar(1));
    
    return tensor;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return null;
  }
}

// Load all images from a directory and prepare TF dataset
async function loadImagesDataset(dataDir, classMapping) {
  console.log(`Loading dataset from ${dataDir}...`);
  
  const classNames = Object.keys(classMapping);
  const classIndices = {};
  classNames.forEach((className, index) => {
    classIndices[className] = index;
  });
  
  const imagePaths = [];
  const labels = [];
  
  // Find all image files in each class directory
  for (const className of classNames) {
    const classDir = path.join(dataDir, className);
    if (!fs.existsSync(classDir)) {
      console.warn(`Warning: Directory for class ${className} not found at ${classDir}`);
      continue;
    }
    
    const imageFiles = glob.sync(path.join(classDir, '*.{jpg,jpeg,png}'));
    console.log(`Found ${imageFiles.length} images for class ${className}`);
    
    imageFiles.forEach(imagePath => {
      imagePaths.push(imagePath);
      labels.push(classIndices[className]);
    });
  }
  
  if (imagePaths.length === 0) {
    throw new Error(`No images found in ${dataDir}. Please ensure the dataset is properly structured.`);
  }
  
  console.log(`Total images: ${imagePaths.length}`);
  
  // Create a tf.data.Dataset from the image paths and labels
  const imageDataset = tf.data.generator(function* () {
    const numSamples = imagePaths.length;
    const indices = tf.util.createShuffledIndices(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      const idx = indices[i];
      const imageTensor = await loadAndPreprocessImage(imagePaths[idx]);
      
      if (imageTensor !== null) {
        const label = labels[idx];
        const oneHotLabel = tf.oneHot(label, classNames.length);
        yield { xs: imageTensor, ys: oneHotLabel };
      }
    }
  });
  
  return {
    dataset: imageDataset.batch(BATCH_SIZE),
    numClasses: classNames.length,
    classIndices,
    totalSamples: imagePaths.length
  };
}

// Create and train a model using transfer learning
async function trainModel(datasetInfo, modelType) {
  console.log(`\nTraining ${modelType} model with ${datasetInfo.totalSamples} samples...`);
  
  // Load MobileNetV2 pre-trained on ImageNet
  const mobilenet = await tf.loadLayersModel(
    'https://storage.googleapis.com/tfjs-models/tfhub/mobilenet_v2_100_224/model.json'
  );
  
  // Get the output of the second-to-last layer of MobileNet
  const bottleneck = mobilenet.getLayer('global_average_pooling2d_1');
  
  // Create a new model that outputs the bottleneck features
  const bottleneckModel = tf.model({
    inputs: mobilenet.inputs,
    outputs: bottleneck.output
  });
  
  // Create a new model that takes the bottleneck features and outputs the class probabilities
  const model = tf.sequential();
  
  // Add a dense layer for feature extraction
  model.add(tf.layers.dense({
    units: 256,
    activation: 'relu',
    inputShape: bottleneckModel.outputs[0].shape.slice(1)
  }));
  
  // Add dropout to prevent overfitting
  model.add(tf.layers.dropout({ rate: 0.5 }));
  
  // Add the output layer
  model.add(tf.layers.dense({
    units: datasetInfo.numClasses,
    activation: 'softmax'
  }));
  
  // Compile the model
  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  // Create a dataset of bottleneck features
  console.log('Preparing dataset...');
  const { dataset, totalSamples } = datasetInfo;
  
  // Split dataset into training and validation
  const validationSize = Math.floor(totalSamples * VALIDATION_SPLIT);
  const trainingSize = totalSamples - validationSize;
  
  // Process the dataset to extract bottleneck features
  const processedDataset = dataset.map(item => {
    const bottleneckFeatures = bottleneckModel.predict(item.xs);
    return { xs: bottleneckFeatures, ys: item.ys };
  });
  
  const trainAndValidationDatasets = processedDataset.take(totalSamples).shuffle(totalSamples);
  const trainDataset = trainAndValidationDatasets.take(trainingSize);
  const validationDataset = trainAndValidationDatasets.skip(trainingSize).take(validationSize);
  
  // Create early stopping callback
  const earlyStoppingCallback = {
    onEpochEnd: async (epoch, logs) => {
      if (epoch % 5 === 0) {
        console.log(`Epoch ${epoch}: accuracy=${logs.acc.toFixed(4)}, val_accuracy=${logs.val_acc.toFixed(4)}`);
      }
      
      // Save model checkpoint on improvement
      if (epoch > 0 && logs.val_acc > bestValAcc) {
        bestValAcc = logs.val_acc;
        bestEpoch = epoch;
        await saveModel(bottleneckModel, model, modelType, `_checkpoint_epoch_${epoch}`);
        console.log(`Saved checkpoint at epoch ${epoch} with validation accuracy ${logs.val_acc.toFixed(4)}`);
      }
      
      // Early stopping check
      if (epoch - bestEpoch >= 10) {
        console.log(`\nEarly stopping at epoch ${epoch}. Best epoch was ${bestEpoch} with val_acc ${bestValAcc.toFixed(4)}`);
        model.stopTraining = true;
      }
    }
  };
  
  // Train the model
  let bestValAcc = 0;
  let bestEpoch = 0;
  
  console.log(`Starting training for ${modelType} model...`);
  
  await model.fitDataset(trainDataset, {
    epochs: EPOCHS,
    validationData: validationDataset,
    callbacks: [earlyStoppingCallback]
  });
  
  // Final model evaluation
  console.log(`\nEvaluating ${modelType} model on validation data...`);
  let totalCorrect = 0;
  let totalSamples = 0;
  
  await validationDataset.forEachAsync(batch => {
    const features = bottleneckModel.predict(batch.xs);
    const predictions = model.predict(features);
    
    const predictedClasses = predictions.argMax(1);
    const actualClasses = batch.ys.argMax(1);
    
    const matches = tf.equal(predictedClasses, actualClasses);
    const numCorrect = matches.sum().dataSync()[0];
    const numSamples = matches.size;
    
    totalCorrect += numCorrect;
    totalSamples += numSamples;
    
    tf.dispose([features, predictions, predictedClasses, actualClasses, matches]);
  });
  
  const accuracy = totalCorrect / totalSamples;
  console.log(`Final validation accuracy: ${(accuracy * 100).toFixed(2)}%`);
  
  // Save the final model
  await saveModel(bottleneckModel, model, modelType);
  
  return {
    bottleneckModel,
    model,
    accuracy
  };
}

// Save model in TensorFlow.js format
async function saveModel(bottleneckModel, model, modelType, suffix = '') {
  // Create a combined model for inference
  const combinedModel = tf.sequential();
  
  // First layer is the bottleneck model
  combinedModel.add(tf.layers.model({
    model: bottleneckModel,
    inputShape: [IMAGE_SIZE, IMAGE_SIZE, 3]
  }));
  
  // Add the classification layers
  combinedModel.add(model);
  
  // Ensure output directory exists
  const outputDir = path.join(MODELS_OUTPUT_DIR, `${modelType}-analysis-model${suffix}`);
  fs.ensureDirSync(outputDir);
  
  // Save model
  await combinedModel.save(`file://${outputDir}`);
  
  // Save metadata
  const metadata = {
    imageSize: IMAGE_SIZE,
    modelType: `${modelType}-analysis`,
    modelVersion: "1.0.0",
    preprocessingType: "mobilenet",
    classLabels: modelType === 'skin' ? 
      Object.keys(SKIN_CONDITIONS) : 
      Object.keys(WOUND_CLASSES)
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`Model and metadata saved to ${outputDir}`);
}

// Main training function
async function trainModels() {
  try {
    console.log("Starting model training process...");
    
    // Ensure models output directory exists
    fs.ensureDirSync(MODELS_OUTPUT_DIR);
    
    // Check if we have skin data
    const hasSkinData = fs.existsSync(SKIN_DATA_DIR) && 
      Object.keys(SKIN_CONDITIONS).some(className => 
        fs.existsSync(path.join(SKIN_DATA_DIR, className)));
    
    // Check if we have wound data
    const hasWoundData = fs.existsSync(WOUND_DATA_DIR) && 
      Object.keys(WOUND_CLASSES).some(className => 
        fs.existsSync(path.join(WOUND_DATA_DIR, className)));
    
    // Train skin model if data is available
    if (hasSkinData) {
      try {
        const skinDatasetInfo = await loadImagesDataset(SKIN_DATA_DIR, SKIN_CONDITIONS);
        const skinModelResult = await trainModel(skinDatasetInfo, 'skin');
        console.log(`Skin model training completed with ${(skinModelResult.accuracy * 100).toFixed(2)}% accuracy`);
      } catch (error) {
        console.error('Error training skin model:', error);
      }
    } else {
      console.log("Skin dataset not found or empty. Skipping skin model training.");
    }
    
    // Train wound model if data is available
    if (hasWoundData) {
      try {
        const woundDatasetInfo = await loadImagesDataset(WOUND_DATA_DIR, WOUND_CLASSES);
        const woundModelResult = await trainModel(woundDatasetInfo, 'wound');
        console.log(`Wound model training completed with ${(woundModelResult.accuracy * 100).toFixed(2)}% accuracy`);
      } catch (error) {
        console.error('Error training wound model:', error);
      }
    } else {
      console.log("Wound dataset not found or empty. Skipping wound model training.");
    }
    
    console.log("\nTraining process completed!");
    console.log("The models are saved in the 'models' directory and can be used by the application.");
    
  } catch (error) {
    console.error("Error in training process:", error);
  }
}

// Start the training process
trainModels();