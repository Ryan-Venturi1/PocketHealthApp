// download-wounds.js
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { createWriteStream } = require('fs');

const OUTPUT_DIR = './data/wound';
const DATASETS = [
  {
    name: 'DeepWound',
    url: 'https://github.com/Pele324/ChronicWoundSeg/archive/refs/heads/master.zip',
    categories: {
      'clean': 'clean',
      'infected': 'infected',
      'deep': 'deep',
      'superficial': 'superficial',
      'healing': 'healing'
    }
  }
];

async function downloadFile(url, outputPath) {
  const writer = createWriteStream(outputPath);
  
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function main() {
  // Create output directory
  fs.ensureDirSync(OUTPUT_DIR);
  
  // Download each dataset
  for (const dataset of DATASETS) {
    console.log(`Downloading ${dataset.name} dataset...`);
    
    const zipPath = path.join(OUTPUT_DIR, `${dataset.name}.zip`);
    await downloadFile(dataset.url, zipPath);
    
    console.log(`Downloaded ${dataset.name} dataset to ${zipPath}`);
    console.log(`Please extract the ZIP file and organize images into the following directories:`);
    
    for (const category of Object.keys(dataset.categories)) {
      console.log(`- ${path.join(OUTPUT_DIR, 'train', category)}`);
      fs.ensureDirSync(path.join(OUTPUT_DIR, 'train', category));
    }
  }
  
  console.log('\nAfter extraction, organize wound images into the appropriate category folders');
  console.log('Some manual sorting may be required for specific wound types');
}

main();