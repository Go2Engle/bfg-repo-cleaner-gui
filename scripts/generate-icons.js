const { execSync } = require('child_process');
const path = require('path');

// Source icon path (your existing icon in assets folder)
const sourceIcon = path.join(__dirname, '../assets/bfg-cleaner-gui-icon.png');

// Output directory
const outputDir = path.join(__dirname, '../');

try {
  console.log('Generating icons from', sourceIcon);
  
  // Run electron-icon-maker CLI
  const result = execSync(
    `npx electron-icon-maker --input="${sourceIcon}" --output="${outputDir}"`,
    { stdio: 'inherit' }
  );
  
  console.log('Icon generation completed successfully!');
} catch (error) {
  console.error('Error generating icons:', error);
}
