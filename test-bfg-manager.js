/**
 * Test script for BFG Manager
 * This script tests the BFG Manager functionality without requiring Electron
 */

import { BFGManager } from '../src/main/bfg-manager';

// Mock the electron app module
const mockApp = {
  getPath: (path: string) => {
    if (path === 'userData') {
      return './test-data';
    }
    return './test-data';
  }
};

// Replace the app import with our mock
global.app = mockApp;

async function testBFGManager() {
  console.log('Testing BFG Manager...');
  
  try {
    // Initialize the BFG Manager
    const bfgManager = BFGManager.getInstance();
    console.log('✓ BFG Manager initialized');
    
    // Get initial status
    const initialStatus = bfgManager.getStatus();
    console.log('Initial status:', initialStatus);
    
    // Test fetching available versions (this will make a real HTTP request)
    console.log('Fetching available versions...');
    const versions = await bfgManager.getAvailableVersions();
    console.log(`✓ Found ${versions.length} available versions`);
    if (versions.length > 0) {
      console.log('Latest versions:', versions.slice(-3));
    }
    
    // Test checking for updates (this will attempt to download)
    console.log('Checking for updates...');
    const updateResult = await bfgManager.checkAndUpdateBFG();
    console.log('Update result:', updateResult);
    
    // Get final status
    const finalStatus = bfgManager.getStatus();
    console.log('Final status:', finalStatus);
    
    console.log('✓ All tests completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBFGManager();
