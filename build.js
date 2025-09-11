const fs = require('fs');
const path = require('path');

console.log('Starting build process...');
console.log('Current directory:', process.cwd());
console.log('Files in current directory:', fs.readdirSync('.'));

// Check if nextjs-template exists
if (!fs.existsSync('nextjs-template')) {
  console.error('nextjs-template directory not found!');
  process.exit(1);
}

console.log('nextjs-template directory found');
console.log('Files in nextjs-template:', fs.readdirSync('nextjs-template'));

// Check if nextjs-template/src exists
if (!fs.existsSync('nextjs-template/src')) {
  console.error('nextjs-template/src directory not found!');
  process.exit(1);
}

console.log('nextjs-template/src directory found');

// Function to copy directory recursively
function copyDir(src, dest) {
  console.log(`Copying from ${src} to ${dest}`);
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`Created directory: ${dest}`);
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  console.log(`Found ${entries.length} entries in ${src}`);
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      console.log(`Copying directory: ${entry.name}`);
      copyDir(srcPath, destPath);
    } else {
      console.log(`Copying file: ${entry.name}`);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Copy template files to main src directory
  console.log('Copying nextjs-template files to src...');
  copyDir('nextjs-template/src', 'src');
  console.log('Template files copied successfully');
  
  console.log('Build script completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}
