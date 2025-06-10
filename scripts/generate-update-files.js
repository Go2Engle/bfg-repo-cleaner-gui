#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate update metadata files for electron-updater
 * This script creates the latest-mac.yml file needed for auto-updates
 */

const packageJson = require('../package.json');
const version = packageJson.version;

// Configuration
const config = {
  owner: 'go2engle',
  repo: 'bfg-repo-cleaner-gui',
  version: version
};

// Generate SHA-512 hash for a file
function generateSha512(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return null;
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha512');
  hashSum.update(fileBuffer);
  return hashSum.digest('base64');
}

// Generate latest-mac.yml content
function generateLatestMacYml() {
  const zipPath = path.join(__dirname, '..', 'out', 'make', 'zip', 'darwin', 'arm64', `bfg-repo-cleaner-gui-darwin-arm64-${version}.zip`);
  const sha512 = generateSha512(zipPath);
  
  if (!sha512) {
    console.error('Could not generate SHA512 for zip file. Make sure you have built the app first.');
    return null;
  }

  const stats = fs.statSync(zipPath);
  const fileSize = stats.size;

  const content = `version: ${version}
files:
  - url: bfg-repo-cleaner-gui-darwin-arm64-${version}.zip
    sha512: ${sha512}
    size: ${fileSize}
path: bfg-repo-cleaner-gui-darwin-arm64-${version}.zip
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

  return content;
}

// Generate latest-linux.yml content
function generateLatestLinuxYml() {
  // Check for both deb and rpm files
  const debPath = path.join(__dirname, '..', 'out', 'make', 'deb', 'x64', `bfg-repo-cleaner-gui_${version}_amd64.deb`);
  const rpmPath = path.join(__dirname, '..', 'out', 'make', 'rpm', 'x64', `bfg-repo-cleaner-gui-${version}-1.x86_64.rpm`);
  
  let targetPath = null;
  let fileName = null;
  
  if (fs.existsSync(debPath)) {
    targetPath = debPath;
    fileName = `bfg-repo-cleaner-gui_${version}_amd64.deb`;
  } else if (fs.existsSync(rpmPath)) {
    targetPath = rpmPath;
    fileName = `bfg-repo-cleaner-gui-${version}-1.x86_64.rpm`;
  } else {
    console.warn('Linux build not found (checked for both .deb and .rpm). Skipping latest-linux.yml generation.');
    return null;
  }

  const sha512 = generateSha512(targetPath);
  if (!sha512) return null;

  const stats = fs.statSync(targetPath);
  const fileSize = stats.size;

  const content = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha512}
    size: ${fileSize}
path: ${fileName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

  return content;
}

// Main function
function main() {
  console.log('Generating update metadata files...');
  
  // Create output directory
  const outputDir = path.join(__dirname, '..', 'update-files');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate latest-mac.yml
  const macContent = generateLatestMacYml();
  if (macContent) {
    const macFilePath = path.join(outputDir, 'latest-mac.yml');
    fs.writeFileSync(macFilePath, macContent);
    console.log(`✅ Generated: ${macFilePath}`);
  }

  // Generate latest-linux.yml
  const linuxContent = generateLatestLinuxYml();
  if (linuxContent) {
    const linuxFilePath = path.join(outputDir, 'latest-linux.yml');
    fs.writeFileSync(linuxFilePath, linuxContent);
    console.log(`✅ Generated: ${linuxFilePath}`);
  }

  console.log('\n📝 Instructions:');
  console.log('1. Upload the generated .yml files to your GitHub release');
  console.log('2. Make sure the file URLs in the .yml files match your release assets');
  console.log(`3. The files should be accessible at:`);
  console.log(`   https://github.com/${config.owner}/${config.repo}/releases/download/v${config.version}/latest-mac.yml`);
  console.log(`   https://github.com/${config.owner}/${config.repo}/releases/download/v${config.version}/latest-linux.yml`);
  console.log(`   https://github.com/${config.owner}/${config.repo}/releases/download/v${config.version}/latest.yml`);
  console.log('\n🚀 For automated uploads, use your GitHub Actions workflow or run: npm run publish');
}

if (require.main === module) {
  main();
}

module.exports = {
  generateLatestMacYml,
  generateLatestLinuxYml
};
