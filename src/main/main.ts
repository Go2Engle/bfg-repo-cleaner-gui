import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BFGManager } from './bfg-manager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let bfgManager: BFGManager;

const createWindow = (): void => {  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false, // Remove the default title bar completely
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    // Remove titleBarOverlay for Windows to prevent default controls
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', '..', 'icons', 'png', '256x256.png'),
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Initialize BFG manager and check for updates
    initializeBFGManager();
  });

  // Set up window event listeners to sync state with renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false);
  });

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// When the app is ready, create the window
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// BFG Manager IPC handlers
ipcMain.handle('bfg-get-status', () => {
  if (!bfgManager) {
    return { isAvailable: false, version: null, path: null, isDownloading: false, error: 'BFG Manager not initialized' };
  }
  return bfgManager.getStatus();
});

ipcMain.handle('bfg-check-update', async () => {
  if (!bfgManager) {
    return { success: false, message: 'BFG Manager not initialized' };
  }
  
  try {
    const result = await bfgManager.checkAndUpdateBFG();
    
    // Send status update to renderer
    if (mainWindow) {
      const status = bfgManager.getStatus();
      mainWindow.webContents.send('bfg-status-update', { 
        ...status, 
        message: result.message 
      });
    }
    
    return result;
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : String(error) 
    };
  }
});

ipcMain.handle('bfg-get-available-versions', async () => {
  if (!bfgManager) {
    return [];
  }
  
  try {
    return await bfgManager.getAvailableVersions();
  } catch (error) {
    console.error('Error getting available BFG versions:', error);
    return [];
  }
});

ipcMain.handle('bfg-download-version', async (event, version: string) => {
  if (!bfgManager) {
    return { success: false, message: 'BFG Manager not initialized' };
  }
  
  try {
    const result = await bfgManager.downloadSpecificVersion(version);
    
    // Send status update to renderer
    if (mainWindow) {
      const status = bfgManager.getStatus();
      mainWindow.webContents.send('bfg-status-update', { 
        ...status, 
        message: result.message 
      });
    }
    
    return result;
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : String(error) 
    };
  }
});

// Check for BFG jar existence and version
const execPromise = promisify(exec);

// Initialize BFG Manager
async function initializeBFGManager(): Promise<void> {
  try {
    bfgManager = BFGManager.getInstance();
    console.log('Initializing BFG Manager...');
    
    // Send status update to renderer
    if (mainWindow) {
      mainWindow.webContents.send('bfg-status-update', { 
        isDownloading: true, 
        message: 'Checking for BFG updates...' 
      });
    }
    
    const result = await bfgManager.checkAndUpdateBFG();
    console.log('BFG Manager initialization result:', result);
    
    // Send final status to renderer
    if (mainWindow) {
      const status = bfgManager.getStatus();
      mainWindow.webContents.send('bfg-status-update', { 
        ...status, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error('Error initializing BFG Manager:', error);
    if (mainWindow) {
      mainWindow.webContents.send('bfg-status-update', { 
        isAvailable: false,
        isDownloading: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to initialize BFG'
      });
    }
  }
}

// Handle repository cleaning request
ipcMain.handle('clean-repository', async (event, options) => {
  try {
    const { repoPath, bfgPath, textReplacements, fileSizes } = options;
    
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: 'Repository path does not exist' };
    }
    
    // Use provided bfgPath or get from BFG manager
    let actualBfgPath = bfgPath;
    if (!actualBfgPath && bfgManager) {
      const status = bfgManager.getStatus();
      if (status.isAvailable && status.path) {
        actualBfgPath = status.path;
      }
    }
    
    if (!actualBfgPath || !fs.existsSync(actualBfgPath)) {
      return { success: false, message: 'BFG jar file not available. Please ensure BFG is downloaded.' };
    }
    
    // Construct the BFG command based on user options
    let command = `java -jar "${actualBfgPath}" `;
    
    // Add text replacements if any
    if (textReplacements && textReplacements.length > 0) {
      // Create a temporary replacements file
      const replacementsFile = path.join(app.getPath('temp'), 'bfg-replacements.txt');
      fs.writeFileSync(replacementsFile, textReplacements.join('\n'));
      command += `--replace-text "${replacementsFile}" `;
    }
    
    // Add file size filter if specified
    if (fileSizes && fileSizes.trim()) {
      command += `--strip-blobs-bigger-than ${fileSizes} `;
    }
    
    // Add the repository path
    command += `"${repoPath}"`;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    // Check if BFG found nothing to clean
    const combinedOutput = `${stdout}\n${stderr}`.toLowerCase();
    const isNothingToDo = combinedOutput.includes('no refs to update - no dirty commits found') ||
                         combinedOutput.includes('bfg aborting: no refs to update');
    
    return {
      success: true,
      message: 'Repository cleaned successfully',
      output: stdout,
      error: stderr,
      nothingToDo: isNothingToDo
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error cleaning repository',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle repository path selection dialog
ipcMain.handle('select-repository', async () => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });
  
  return result;
});

// Handle BFG jar file selection dialog
ipcMain.handle('select-bfg-jar', async () => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JAR Files', extensions: ['jar'] }
    ],
    title: 'Select BFG Repo-Cleaner JAR'
  });
  
  return result;
});

// Handle cloning a repository with --mirror
ipcMain.handle('clone-repository', async (event, options) => {
  try {
    const { repoUrl, targetDir } = options;
    
    if (!repoUrl) {
      return { success: false, message: 'Repository URL is required' };
    }

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Generate a directory name based on the repo URL
    const repoName = repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'cloned-repo';
    const cloneDir = path.join(targetDir, `${repoName}.git`);
    
    // Construct the git clone command with --mirror
    const command = `git clone --mirror "${repoUrl}" "${cloneDir}"`;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    return {
      success: true,
      message: 'Repository cloned successfully with --mirror',
      output: stdout,
      repoPath: cloneDir,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error cloning repository',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle directory selection for clone target
ipcMain.handle('select-clone-directory', async () => {
  if (!mainWindow) return { canceled: true };
  
  const selectDirectory = async (): Promise<{ canceled: boolean; filePaths: string[] }> => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Directory to Clone Repository Into'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      
      try {
        // Check if directory is empty (ignoring hidden files and system files)
        const files = fs.readdirSync(selectedPath);
        const visibleFiles = files.filter(file => {
          // Filter out hidden files (starting with .) and common system files
          return !file.startsWith('.') && 
                 file !== 'Thumbs.db' && 
                 file !== 'desktop.ini' &&
                 file !== '$RECYCLE.BIN';
        });
        
        if (visibleFiles.length > 0) {
          // Directory is not empty, show warning dialog
          const warningResult = await dialog.showMessageBox(mainWindow!, {
            type: 'warning',
            title: 'Directory Not Empty',
            message: 'The selected directory is not empty.',
            detail: `For the BFG Repo-Cleaner to work properly, it needs to clone the repository into an empty directory. The selected directory contains: ${visibleFiles.slice(0, 5).join(', ')}${visibleFiles.length > 5 ? '...' : ''}. Please select an empty directory or create a new one.`,
            buttons: ['Select Different Directory', 'Cancel'],
            defaultId: 0,
            cancelId: 1
          });
          
          if (warningResult.response === 0) {
            // User wants to select a different directory, recursively call this function
            return await selectDirectory();
          } else {
            // User canceled
            return { canceled: true, filePaths: [] };
          }
        }
      } catch (error) {
        // If we can't read the directory, it might not exist or be inaccessible
        // In this case, we'll allow the selection and let the clone operation handle it
        console.warn('Could not check if directory is empty:', error);
      }
    }
    
    return result;
  };
  
  return await selectDirectory();
});

// Handle running post-cleaning Git commands
ipcMain.handle('run-post-cleaning-commands', async (event, options) => {
  try {
    const { repoPath } = options;
    
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: 'Repository path does not exist' };
    }
    
    console.log(`Running post-cleaning commands in path: ${repoPath}`);
    
    // Split the commands to execute them one by one for better error handling
    // First, run git reflog expire
    let reflogCommand = `cd "${repoPath}" && git reflog expire --expire=now --all`;
    console.log(`Executing command: ${reflogCommand}`);
    const reflogResult = await execPromise(reflogCommand);
    console.log('Reflog result:', reflogResult.stdout, reflogResult.stderr);
    
    // Then run git gc
    let gcCommand = `cd "${repoPath}" && git gc --prune=now --aggressive`;
    console.log(`Executing command: ${gcCommand}`);
    const gcResult = await execPromise(gcCommand);
    console.log('GC result:', gcResult.stdout, gcResult.stderr);
    
    // For push, we need to handle the case of no remote configured
    // First check if origin exists
    let checkOriginCommand = `cd "${repoPath}" && git remote -v`;
    const checkOriginResult = await execPromise(checkOriginCommand);
    console.log('Remote check result:', checkOriginResult.stdout);
    
    let pushOutput = '';
    if (checkOriginResult.stdout.includes('origin')) {
      // Use --mirror for push since we cloned with --mirror
      let pushCommand = `cd "${repoPath}" && git push --mirror`;
      console.log(`Executing command: ${pushCommand}`);
      try {
        const pushResult = await execPromise(pushCommand);
        pushOutput = `Push result: ${pushResult.stdout || 'Success!'}\n${pushResult.stderr || ''}`;
        console.log('Push result:', pushResult.stdout, pushResult.stderr);
      } catch (pushError) {
        pushOutput = `Push failed: ${pushError instanceof Error ? pushError.message : String(pushError)}`;
        console.error('Push error:', pushOutput);
      }
    } else {
      pushOutput = 'Skipped push: No origin remote configured.';
      console.log(pushOutput);
    }
    
    return {
      success: true,
      message: 'Post-cleaning commands executed successfully',
      output: `Reflog: ${reflogResult.stdout || 'Success!'}\n\nGC: ${gcResult.stdout || 'Success!'}\n\n${pushOutput}`
    };
  } catch (error) {
    console.error('Error in post-cleaning commands:', error);
    return {
      success: false,
      message: 'Error executing post-cleaning commands',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle reset and cleanup request
ipcMain.handle('reset-and-cleanup', async (event, options) => {
  try {
    const { repoPath } = options;
    
    if (repoPath && fs.existsSync(repoPath)) {
      // Use rimraf or fs.rmSync (Node.js >= 14) to recursively delete the directory
      fs.rmSync(repoPath, { recursive: true, force: true });
      
      // Also try to delete any BFG report folders
      const repoDir = path.dirname(repoPath);
      const repoName = path.basename(repoPath);
      const bfgReportPath = path.join(repoDir, `${repoName}.bfg-report`);
      
      if (fs.existsSync(bfgReportPath)) {
        fs.rmSync(bfgReportPath, { recursive: true, force: true });
      }
    }
    
    return {
      success: true,
      message: 'Reset and cleanup completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error during reset and cleanup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle checking for secrets in HEAD branch
ipcMain.handle('check-secrets-in-head', async (event, options) => {
  try {
    const { repoPath, secrets } = options;
    
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: 'Repository path does not exist' };
    }

    if (!secrets || secrets.length === 0) {
      return { success: true, foundSecrets: [], message: 'No secrets to check' };
    }

    // Create a working directory from the mirror
    const tempWorkingDir = path.join(path.dirname(repoPath), 'temp-working-copy');
    
    // Remove temp directory if it exists
    if (fs.existsSync(tempWorkingDir)) {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
    }

    // Clone the mirror to a working directory
    const cloneCommand = `git clone "${repoPath}" "${tempWorkingDir}"`;
    await execPromise(cloneCommand);

    // Search for secrets in the HEAD branch
    const foundSecrets: Array<{secret: string, files: string[]}> = [];
    
    for (const secret of secrets) {
      if (!secret.trim()) continue;
      
      try {
        // Get all files tracked by git
        const gitLsCommand = `cd "${tempWorkingDir}" && git ls-files`;
        const { stdout } = await execPromise(gitLsCommand);
        const files = stdout.trim().split('\n').filter(file => file.trim());
        
        const filesWithSecret: string[] = [];
        
        // Check each file for the secret
        for (const file of files) {
          const filePath = path.join(tempWorkingDir, file);
          
          if (fs.existsSync(filePath)) {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              if (content.includes(secret)) {
                filesWithSecret.push(file);
              }
            } catch (fileError) {
              // Skip binary files or files that can't be read as text
              continue;
            }
          }
        }
        
        if (filesWithSecret.length > 0) {
          foundSecrets.push({ secret, files: filesWithSecret });
        }
      } catch (error) {
        // Continue checking other secrets even if one fails
        console.error(`Error checking secret "${secret}":`, error);
      }
    }

    // Clean up temp directory
    if (fs.existsSync(tempWorkingDir)) {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
    }

    return {
      success: true,
      foundSecrets,
      message: foundSecrets.length > 0 
        ? `Found ${foundSecrets.length} secret(s) in HEAD branch`
        : 'No secrets found in HEAD branch'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking secrets in HEAD branch',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle cleaning secrets from HEAD branch
ipcMain.handle('clean-secrets-from-head', async (event, options) => {
  try {
    const { repoPath, secrets, repoUrl, targetDir } = options;
    
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: 'Repository path does not exist' };
    }

    if (!repoUrl) {
      return { success: false, message: 'Repository URL is required for pushing changes' };
    }

    // Create a working directory - clone directly from the remote URL, not the mirror
    const tempWorkingDir = path.join(path.dirname(repoPath), 'temp-working-copy');
    
    // Remove temp directory if it exists
    if (fs.existsSync(tempWorkingDir)) {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
    }

    const replacementLog: string[] = [];
    replacementLog.push(`Cloning repository from ${repoUrl}...`);

    // Clone the repository directly from the remote URL (not the mirror)
    const cloneCommand = `git clone "${repoUrl}" "${tempWorkingDir}"`;
    await execPromise(cloneCommand);
    replacementLog.push('Repository cloned successfully');

    let replacementsMade = false;
    let totalFilesChecked = 0;

    // Replace secrets with "REMOVED" in all files
    for (const secret of secrets) {
      if (!secret.trim()) continue;
      
      try {
        // Use the same approach as detection: get all files tracked by git
        const gitLsCommand = `cd "${tempWorkingDir}" && git ls-files`;
        const { stdout } = await execPromise(gitLsCommand);
        const filesToCheck = stdout.trim().split('\n').filter(file => file.trim());
        
        totalFilesChecked = filesToCheck.length;
        replacementLog.push(`Checking ${filesToCheck.length} git-tracked files for secret: "${secret}"`);
        
        // Check each file for the secret
        for (const relativeFile of filesToCheck) {
          const filePath = path.join(tempWorkingDir, relativeFile);
          
          if (fs.existsSync(filePath)) {
            try {
              let content = fs.readFileSync(filePath, 'utf8');
              const originalContent = content;
              
              // Check if the secret exists in the file
              if (content.includes(secret)) {
                // Replace all occurrences of the secret with "REMOVED"
                content = content.replace(new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'REMOVED');
                
                if (content !== originalContent) {
                  fs.writeFileSync(filePath, content, 'utf8');
                  replacementsMade = true;
                  replacementLog.push(`Replaced secret "${secret}" in: ${relativeFile}`);
                }
              }
            } catch (fileError) {
              // Skip binary files or files that can't be read as text
              replacementLog.push(`Skipped binary/unreadable file: ${relativeFile}`);
              continue;
            }
          }
        }
      } catch (error) {
        // Continue with other secrets even if one fails
        replacementLog.push(`Warning: Could not process secret "${secret}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (replacementsMade) {
      replacementLog.push('Making changes to repository...');
      
      // Configure git user if not already configured
      try {
        // Check if user is already configured
        try {
          await execPromise(`cd "${tempWorkingDir}" && git config user.email`);
        } catch {
          // Set user if not configured
          await execPromise(`cd "${tempWorkingDir}" && git config user.email "bfg-gui@localhost"`);
          await execPromise(`cd "${tempWorkingDir}" && git config user.name "BFG GUI"`);
          replacementLog.push('Configured git user for commit');
        }
      } catch (error) {
        replacementLog.push(`Warning: Could not configure git user: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Add all changes
      await execPromise(`cd "${tempWorkingDir}" && git add .`);
      replacementLog.push('Staged changes');
      
      // Check if there are actually changes to commit
      try {
        const statusResult = await execPromise(`cd "${tempWorkingDir}" && git status --porcelain`);
        if (!statusResult.stdout.trim()) {
          replacementLog.push('No changes detected after replacement');
          replacementsMade = false;
        } else {
          // Commit the changes
          const commitMessage = "Remove sensitive data from HEAD branch (BFG GUI)";
          await execPromise(`cd "${tempWorkingDir}" && git commit -m "${commitMessage}"`);
          replacementLog.push('Changes committed successfully');
          
          // Push the changes back to origin - this is critical!
          try {
            // Get current branch name
            const branchResult = await execPromise(`cd "${tempWorkingDir}" && git branch --show-current`);
            const currentBranch = branchResult.stdout.trim() || 'main';
            replacementLog.push(`Current branch: ${currentBranch}`);
            
            // Push the current branch with changes
            const pushCommand = `cd "${tempWorkingDir}" && git push origin ${currentBranch}`;
            replacementLog.push(`Executing: ${pushCommand}`);
            const pushResult = await execPromise(pushCommand);
            replacementLog.push(`Push successful: ${pushResult.stdout || 'Changes pushed to remote'}`);
            if (pushResult.stderr) {
              replacementLog.push(`Push stderr: ${pushResult.stderr}`);
            }
            
            // Also push any tags that might exist
            try {
              const pushTagsCommand = `cd "${tempWorkingDir}" && git push --tags origin`;
              const tagsResult = await execPromise(pushTagsCommand);
              if (tagsResult.stdout.trim()) {
                replacementLog.push(`Tags pushed: ${tagsResult.stdout}`);
              }
            } catch (tagsError) {
              // Tags push is optional - don't fail if there are no tags or permission issues
              replacementLog.push(`Note: Could not push tags: ${tagsError instanceof Error ? tagsError.message : String(tagsError)}`);
            }
            
          } catch (pushError) {
            const errorMsg = `CRITICAL ERROR: Failed to push changes to remote: ${pushError instanceof Error ? pushError.message : String(pushError)}`;
            replacementLog.push(errorMsg);
            throw new Error(errorMsg);
          }
        }
      } catch (commitError) {
        if (commitError instanceof Error && commitError.message.includes('CRITICAL ERROR')) {
          throw commitError; // Re-throw push errors
        }
        const errorMsg = `Error during commit: ${commitError instanceof Error ? commitError.message : String(commitError)}`;
        replacementLog.push(errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      replacementLog.push(`No secrets found in repository files (checked ${totalFilesChecked} files)`);
    }

    // Clean up temp directory
    if (fs.existsSync(tempWorkingDir)) {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
      replacementLog.push('Cleaned up temporary working directory');
    }

    // Remove and re-clone the mirror to get fresh copy
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
      replacementLog.push('Removed old mirror repository');
    }

    // Re-clone with --mirror to get the updated repository
    const recloneCommand = `git clone --mirror "${repoUrl}" "${repoPath}"`;
    await execPromise(recloneCommand);
    replacementLog.push('Re-cloned fresh mirror repository');

    return {
      success: true,
      message: replacementsMade 
        ? 'Secrets removed from HEAD branch and repository re-cloned'
        : 'No secrets found to remove, but repository re-cloned',
      output: replacementLog.join('\n'),
      replacementsMade
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error cleaning secrets from HEAD branch',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
