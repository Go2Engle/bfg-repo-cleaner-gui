#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const path = require('path');

// Define the platforms and architectures to build
const platforms = [
  { platform: 'darwin', arch: 'x64' },
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'win32', arch: 'x64' },
  { platform: 'linux', arch: 'x64' }
];

// Ensure the scripts directory exists
const scriptsDir = path.join(__dirname, 'builds');
if (!existsSync(scriptsDir)) {
  mkdirSync(scriptsDir, { recursive: true });
}

console.log('Building all platforms...');

// Loop through each platform and build
platforms.forEach(({ platform, arch }) => {
  try {
    console.log(`Building for ${platform}-${arch}...`);
    
    // Set the command to run
    const command = `npx electron-forge make --platform=${platform} --arch=${arch}`;
    
    // Execute the command
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log(`Successfully built for ${platform}-${arch}`);
  } catch (error) {
    console.error(`Failed to build for ${platform}-${arch}:`, error.message);
  }
});

console.log('All builds completed!');
