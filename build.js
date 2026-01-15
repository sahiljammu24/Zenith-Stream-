const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const filesToCopy = ['index.html', 'styles.css', 'player.js'];

// Create dist directory
if (!fs.existsSync(distDir)){
    fs.mkdirSync(distDir);
}

// Copy files
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
});

console.log('Build complete: Static files copied to dist/ for deployment.');