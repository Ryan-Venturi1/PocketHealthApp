// download-isic.js
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const CATEGORIES = {
  'melanoma': ['melanoma'],
  'nevus': ['nevus'],
  'basal_cell_carcinoma': ['basal cell carcinoma'],
  'squamous_cell_carcinoma': ['squamous cell carcinoma'],
  'actinic_keratosis': ['actinic keratosis', 'actinic solar keratosis'],
  'seborrheic_keratosis': ['seborrheic keratosis'],
  'dermatofibroma': ['dermatofibroma']
};

const OUTPUT_DIR = './data/skin';
const API_URL = 'https://api.isic-archive.com/api/v1/';
const MAX_IMAGES_PER_CATEGORY = 500;

async function fetchImages(diagnosis, category) {
  try {
    // Create output directory
    const categoryDir = path.join(OUTPUT_DIR, 'train', category);
    fs.ensureDirSync(categoryDir);
    
    console.log(`Downloading ${diagnosis} images to ${categoryDir}...`);
    
    // Fetch images with the diagnosis
    const response = await axios.get(`${API_URL}image`, {
      params: {
        limit: MAX_IMAGES_PER_CATEGORY,
        detail: 'true',
        sort: 'name',
        sortdir: 1,
        diagnosis: diagnosis
      }
    });
    
    const images = response.data;
    console.log(`Found ${images.length} ${diagnosis} images`);
    
    // Download each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const imagePath = path.join(categoryDir, `${image._id}.jpg`);
      
      // Skip if already downloaded
      if (fs.existsSync(imagePath)) {
        console.log(`Image ${i+1}/${images.length} already exists, skipping`);
        continue;
      }
      
      console.log(`Downloading image ${i+1}/${images.length}: ${image._id}`);
      
      // Download image
      const imageResponse = await axios({
        method: 'get',
        url: `${API_URL}image/${image._id}/download`,
        responseType: 'stream'
      });
      
      // Save image
      const writer = fs.createWriteStream(imagePath);
      imageResponse.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      // Wait to avoid overloading the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error(`Error downloading ${diagnosis} images:`, error.message);
  }
}

async function main() {
  // Create output directories
  fs.ensureDirSync(path.join(OUTPUT_DIR, 'train'));
  
  // Download images for each category
  for (const [category, diagnoses] of Object.entries(CATEGORIES)) {
    for (const diagnosis of diagnoses) {
      await fetchImages(diagnosis, category);
    }
  }
  
  console.log('Done!');
}

main();