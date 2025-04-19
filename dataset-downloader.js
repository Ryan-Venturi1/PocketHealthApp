// direct-search-downloader.js
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

// Configuration
const SKIN_DATA_DIR = './data/skin/train';
const WOUND_DATA_DIR = './data/wound/train';
const DOWNLOAD_DIR = './downloads';
const IMAGES_PER_CATEGORY = 1000;
const MAX_CONCURRENT = 5;
const SEARCH_LIMIT = 50;

// Category definitions with search queries
const CATEGORIES = [
  {
    name: 'nevus',
    dir: path.join(SKIN_DATA_DIR, 'nevus'),
    query: 'diagnosis:nevus OR diagnosis:naevus OR diagnosis:"benign nevus" OR diagnosis:"melanocytic nevus"',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'melanoma',
    dir: path.join(SKIN_DATA_DIR, 'melanoma'),
    query: 'diagnosis:melanoma OR mel_class:"invasive melanoma" OR mel_class:"melanoma in situ"',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'basal_cell_carcinoma',
    dir: path.join(SKIN_DATA_DIR, 'basal_cell_carcinoma'),
    query: 'diagnosis:"basal cell carcinoma" OR diagnosis:bcc',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'squamous_cell_carcinoma',
    dir: path.join(SKIN_DATA_DIR, 'squamous_cell_carcinoma'),
    query: 'diagnosis:"squamous cell carcinoma" OR diagnosis:scc',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'actinic_keratosis',
    dir: path.join(SKIN_DATA_DIR, 'actinic_keratosis'),
    query: 'diagnosis:"actinic keratosis" OR diagnosis:"solar keratosis" OR diagnosis:akiec',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'seborrheic_keratosis',
    dir: path.join(SKIN_DATA_DIR, 'seborrheic_keratosis'),
    query: 'diagnosis:"seborrheic keratosis" OR diagnosis:"seborrhoeic keratosis" OR diagnosis:bkl',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'dermatofibroma',
    dir: path.join(SKIN_DATA_DIR, 'dermatofibroma'),
    query: 'diagnosis:dermatofibroma OR diagnosis:df',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'eczema',
    dir: path.join(SKIN_DATA_DIR, 'eczema'),
    query: 'diagnosis:eczema OR diagnosis:dermatitis',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'psoriasis',
    dir: path.join(SKIN_DATA_DIR, 'psoriasis'),
    query: 'diagnosis:psoriasis',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'rosacea',
    dir: path.join(SKIN_DATA_DIR, 'rosacea'),
    query: 'diagnosis:rosacea',
    target: IMAGES_PER_CATEGORY
  },
  {
    name: 'acne',
    dir: path.join(SKIN_DATA_DIR, 'acne'),
    query: 'diagnosis:acne OR diagnosis:"acne vulgaris"',
    target: IMAGES_PER_CATEGORY
  }
];

// Setup directories
function setupDirectories() {
  console.log('Setting up directories...');
  fs.ensureDirSync(DOWNLOAD_DIR);
  fs.ensureDirSync(SKIN_DATA_DIR);
  fs.ensureDirSync(WOUND_DATA_DIR);
  
  // Create category directories
  CATEGORIES.forEach(category => {
    fs.ensureDirSync(category.dir);
  });
  
  // Create wound directories
  ['clean', 'infected', 'deep', 'superficial', 'healing'].forEach(dir => {
    fs.ensureDirSync(path.join(WOUND_DATA_DIR, dir));
  });
}

// Get current image counts
function getCurrentCounts() {
  const counts = {};
  
  CATEGORIES.forEach(category => {
    counts[category.name] = fs.existsSync(category.dir) ? 
      fs.readdirSync(category.dir).filter(f => f.endsWith('.jpg')).length : 0;
  });
  
  return counts;
}

// Download a file with retry logic
async function downloadFile(url, outputPath, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000
      });
      
      await streamPipeline(response.data, fs.createWriteStream(outputPath));
      return true;
    } catch (error) {
      console.log(`Download retry ${attempt + 1}/${retries} for ${path.basename(outputPath)}`);
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error(`Failed to download ${path.basename(outputPath)}`);
        return false;
      }
    }
  }
  return false;
}

// Download images by category using direct search
async function downloadImagesByCategory(category, currentCount) {
  console.log(`Downloading ${category.name} images (${currentCount}/${category.target})...`);
  
  // Track downloaded files
  const downloadTracking = path.join(DOWNLOAD_DIR, `${category.name}_downloads.json`);
  let downloadedImages = {};
  
  if (fs.existsSync(downloadTracking)) {
    try {
      downloadedImages = JSON.parse(fs.readFileSync(downloadTracking, 'utf8'));
    } catch (error) {
      console.error(`Error reading download tracking for ${category.name}:`, error.message);
    }
  }
  
  let offset = 0;
  let cursor = null;
  let needMore = category.target - currentCount;
  let newlyDownloaded = 0;
  
  while (needMore > 0) {
    try {
      // Build request URL with cursor pagination
      let url = `https://api.isic-archive.com/api/v2/images/search?limit=${SEARCH_LIMIT}&query=${encodeURIComponent(category.query)}`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }
      
      console.log(`Searching ${category.name} (page ${Math.floor(offset/SEARCH_LIMIT) + 1})...`);
      const response = await axios.get(url);
      
      // Check if we got results
      if (!response.data.results || response.data.results.length === 0) {
        console.log(`No more results for ${category.name}`);
        break;
      }
      
      // Update cursor for next page
      cursor = response.data.next ? new URL(response.data.next).searchParams.get('cursor') : null;
      
      // Process each image
      const downloadPromises = [];
      
      for (const image of response.data.results) {
        // Stop if we have enough
        if (newlyDownloaded >= needMore) break;
        
        // Skip if already downloaded
        if (downloadedImages[image.isic_id]) continue;
        
        // Ensure we have a download URL
        if (!image.files || !image.files.full || !image.files.full.url) {
          console.log(`No download URL for ${image.isic_id}, skipping`);
          continue;
        }
        
        // Download the image
        const outputPath = path.join(category.dir, `${image.isic_id}.jpg`);
        
        // Track that we're downloading this image
        downloadedImages[image.isic_id] = {
          status: 'downloading',
          timestamp: new Date().toISOString()
        };
        
        // Add to download queue
        downloadPromises.push(
          (async () => {
            console.log(`Downloading ${category.name} image: ${image.isic_id} (${newlyDownloaded + 1}/${needMore})`);
            const success = await downloadFile(image.files.full.url, outputPath);
            
            if (success) {
              downloadedImages[image.isic_id] = {
                status: 'completed',
                timestamp: new Date().toISOString(),
                metadata: image.metadata || {}
              };
              newlyDownloaded++;
              
              // Save metadata in a separate file for reference
              const metadataPath = path.join(category.dir, `${image.isic_id}.json`);
              fs.writeFileSync(metadataPath, JSON.stringify(image.metadata || {}, null, 2));
              
              // Update tracking file periodically
              fs.writeFileSync(downloadTracking, JSON.stringify(downloadedImages, null, 2));
            } else {
              downloadedImages[image.isic_id] = {
                status: 'failed',
                timestamp: new Date().toISOString()
              };
            }
          })()
        );
        
        // Limit concurrent downloads
        if (downloadPromises.length >= MAX_CONCURRENT) {
          await Promise.all(downloadPromises);
          downloadPromises.length = 0;
        }
      }
      
      // Wait for remaining downloads
      if (downloadPromises.length > 0) {
        await Promise.all(downloadPromises);
      }
      
      // Save download tracking
      fs.writeFileSync(downloadTracking, JSON.stringify(downloadedImages, null, 2));
      
      // Update offset
      offset += response.data.results.length;
      
      // Check if we have enough or if there are no more results
      if (newlyDownloaded >= needMore || !cursor) {
        break;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error searching for ${category.name}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return newlyDownloaded;
}

// Process all categories
async function processAllCategories() {
  // Get current counts
  const counts = getCurrentCounts();
  console.log('Current image counts:');
  let totalCount = 0;
  
  CATEGORIES.forEach(category => {
    const count = counts[category.name] || 0;
    console.log(`  ${category.name}: ${count}/${category.target}`);
    totalCount += count;
  });
  
  console.log(`Total: ${totalCount} images`);
  
  // Process each category
  for (const category of CATEGORIES) {
    const currentCount = counts[category.name] || 0;
    
    if (currentCount >= category.target) {
      console.log(`Already have enough ${category.name} images (${currentCount}/${category.target}), skipping`);
      continue;
    }
    
    const newImages = await downloadImagesByCategory(category, currentCount);
    console.log(`Downloaded ${newImages} new ${category.name} images`);
  }
  
  // Final counts
  const finalCounts = getCurrentCounts();
  console.log('\nFinal image counts:');
  let finalTotal = 0;
  
  CATEGORIES.forEach(category => {
    const count = finalCounts[category.name] || 0;
    console.log(`  ${category.name}: ${count}/${category.target}`);
    finalTotal += count;
  });
  
  console.log(`Final total: ${finalTotal} images`);
}

// Download DeepWound dataset
async function downloadDeepWoundDataset() {
  console.log('\nDownloading DeepWound dataset...');
  
  const zipPath = path.join(DOWNLOAD_DIR, 'DeepWound.zip');
  const extractPath = path.join(DOWNLOAD_DIR, 'DeepWound');
  
  if (!fs.existsSync(zipPath)) {
    console.log('Downloading DeepWound dataset...');
    const url = 'https://github.com/Pele324/ChronicWoundSeg/archive/refs/heads/master.zip';
    await downloadFile(url, zipPath);
  } else {
    console.log('DeepWound zip already exists, skipping download');
  }
  
  if (!fs.existsSync(extractPath)) {
    console.log('Extracting DeepWound dataset...');
    fs.ensureDirSync(extractPath);
    
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);
      console.log('Extraction complete');
    } catch (error) {
      console.error('Error extracting DeepWound dataset:', error.message);
      return;
    }
  } else {
    console.log('DeepWound directory already exists, skipping extraction');
  }
  
  // Organize wound images
  console.log('Organizing DeepWound images...');
  
  const folderMappings = {
    'ChronicWoundSeg-master/imgs/Classification/Granulation': 'healing',
    'ChronicWoundSeg-master/imgs/Classification/Necrotic': 'infected', 
    'ChronicWoundSeg-master/imgs/Classification/Slough': 'infected',
    'ChronicWoundSeg-master/imgs/Normal': 'clean'
  };
  
  let processed = 0;
  
  // Process each folder mapping
  Object.entries(folderMappings).forEach(([sourceFolder, category]) => {
    const sourcePath = path.join(extractPath, sourceFolder);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`Source folder not found: ${sourcePath}`);
      return;
    }
    
    // Get all image files in the source folder
    const files = fs.readdirSync(sourcePath)
      .filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'));
    
    // Copy each image to the correct category folder
    files.forEach(file => {
      const sourceImagePath = path.join(sourcePath, file);
      const targetPath = path.join(WOUND_DATA_DIR, category, file);
      fs.copySync(sourceImagePath, targetPath);
      processed++;
    });
    
    console.log(`Processed ${files.length} images from ${sourceFolder} to ${category}`);
  });
  
  console.log(`DeepWound organization complete. Processed: ${processed} images`);
}

// Main function
async function main() {
  console.log('Starting enhanced skin and wound dataset downloader...');
  
  // Setup directories
  setupDirectories();
  
  // Download skin images
  await processAllCategories();
  
  // Download wound images
  await downloadDeepWoundDataset();
  
  console.log('\nDownload process complete!');
}

// Start the process
main();