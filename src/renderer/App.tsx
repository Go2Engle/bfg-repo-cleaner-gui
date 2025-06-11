import React, { useState, useEffect } from 'react';
import './styles/App.scss';
import { ThemeProvider } from './context/ThemeContext';
import TitleBar from './components/TitleBar';

// Define the type for the window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      selectRepository: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      selectBfgJar: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      selectCloneDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      cloneRepository: (options: {
        repoUrl: string;
        targetDir: string;
      }) => Promise<{
        success: boolean;
        message: string;
        output?: string;
        repoPath?: string;
        error?: string;
      }>;
      cleanRepository: (options: {
        repoPath: string;
        bfgPath: string;
        textReplacements: string[];
        fileSizes: string;
      }) => Promise<{
        success: boolean;
        message: string;
        output?: string;
        error?: string;
        nothingToDo?: boolean;
      }>;
      runPostCleaningCommands: (options: {
        repoPath: string;
      }) => Promise<{
        success: boolean;
        message: string;
        output?: string;
        error?: string;
      }>;
      resetAndCleanup: (options: {
        repoPath: string;
      }) => Promise<{
        success: boolean;
        message: string;
        error?: string;
      }>;
      checkSecretsInHead: (options: {
        repoPath: string;
        secrets: string[];
      }) => Promise<{
        success: boolean;
        foundSecrets: Array<{secret: string, files: string[]}>;
        message: string;
        error?: string;
      }>;      cleanSecretsFromHead: (options: {
        repoPath: string;
        secrets: string[];
        repoUrl: string;
        targetDir: string;
      }) => Promise<{
        success: boolean;
        message: string;
        output?: string;
        replacementsMade: boolean;
        error?: string;
      }>;
      // BFG Manager APIs
      bfgGetStatus: () => Promise<{
        isAvailable: boolean;
        version: string | null;
        path: string | null;
        isDownloading: boolean;
        error: string | null;
      }>;
      bfgCheckUpdate: () => Promise<{
        success: boolean;
        version?: string;
        path?: string;
        message: string;
        error?: string;
      }>;
      bfgGetAvailableVersions: () => Promise<string[]>;
      bfgDownloadVersion: (version: string) => Promise<{
        success: boolean;
        version?: string;
        path?: string;
        message: string;
        error?: string;
      }>;
      onBfgStatusUpdate: (callback: (status: {
        isAvailable: boolean;
        version: string | null;
        path: string | null;
        isDownloading: boolean;
        error: string | null;
        message?: string;
      }) => void) => void;
      // Window controls
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowIsMaximized: () => Promise<boolean>;
      onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
      // Platform information
      getPlatform: () => string;
    };
  }
}

const AppContent: React.FC = () => {
  // State
  const [repoPath, setRepoPath] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [targetDir, setTargetDir] = useState<string>('');
  const [bfgPath, setBfgPath] = useState<string>('');
  const [replacements, setReplacements] = useState<string>('');
  const [fileSizes, setFileSizes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [cloneStatus, setCloneStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isRunningPostCommands, setIsRunningPostCommands] = useState<boolean>(false);
  const [showPostCleaningOption, setShowPostCleaningOption] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New state for secret checking workflow
  const [isCheckingSecrets, setIsCheckingSecrets] = useState<boolean>(false);
  const [foundSecrets, setFoundSecrets] = useState<Array<{secret: string, files: string[]}>>([]);
  const [showSecretWarning, setShowSecretWarning] = useState<boolean>(false);  const [isCleaningSecrets, setIsCleaningSecrets] = useState<boolean>(false);

  // BFG Manager state
  const [bfgStatus, setBfgStatus] = useState<{
    isAvailable: boolean;
    version: string | null;
    path: string | null;
    isDownloading: boolean;
    error: string | null;
    message?: string;
  }>({
    isAvailable: false,
    version: null,
    path: null,
    isDownloading: false,    error: null
  });

  // Initialize BFG status and listen for updates
  useEffect(() => {
    // Get initial BFG status
    const initializeBfgStatus = async () => {
      try {
        const status = await window.electronAPI.bfgGetStatus();
        setBfgStatus(status);
      } catch (error) {
        console.error('Error getting initial BFG status:', error);
        setBfgStatus(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
      }
    };

    initializeBfgStatus();

    // Listen for BFG status updates
    window.electronAPI.onBfgStatusUpdate((status) => {
      setBfgStatus(prev => ({ ...prev, ...status }));
    });
  }, []);

  // Auto-set BFG path when it becomes available
  useEffect(() => {
    if (bfgStatus.isAvailable && bfgStatus.path && !bfgPath) {
      setBfgPath(bfgStatus.path);
    }
  }, [bfgStatus.isAvailable, bfgStatus.path, bfgPath]);

  // Repository selection is now only through cloning

  // Handle selecting target directory for cloning
  const handleSelectCloneDirectory = async () => {
    const result = await window.electronAPI.selectCloneDirectory();
    if (!result.canceled && result.filePaths.length > 0) {
      setTargetDir(result.filePaths[0]);
    }
  };

  // Handle cloning repository
  const handleCloneRepository = async () => {
    if (!repoUrl || !targetDir) {
      setError('Please provide both repository URL and target directory.');
      return;
    }

    try {
      setIsCloning(true);
      setResult(null);
      setError(null);

      // Call the main process to clone the repository
      const response = await window.electronAPI.cloneRepository({
        repoUrl,
        targetDir
      });

      if (response.success) {
        setResult(
          `${response.message}\n\n${response.output || ''}`
        );
        // Set the repository path to the cloned repository
        if (response.repoPath) {
          setRepoPath(response.repoPath);
        }
        setCloneStatus('success');
      } else {
        setError(
          `${response.message}\n${response.error || ''}`
        );
        setCloneStatus('error');
      }
    } catch (err) {
      setError(`An unexpected error occurred while cloning: ${err instanceof Error ? err.message : String(err)}`);
      setCloneStatus('error');
    } finally {
      setIsCloning(false);
    }
  };
  // Handle checking for BFG updates
  const handleCheckBfgUpdate = async () => {
    try {
      const result = await window.electronAPI.bfgCheckUpdate();
      if (result.success && result.path) {
        setBfgPath(result.path);
      }
      // Status will be updated via the listener
    } catch (error) {
      console.error('Error checking for BFG update:', error);
    }
  };

  // Handle selecting BFG jar file (fallback option)
  const handleSelectBfgJar = async () => {
    const result = await window.electronAPI.selectBfgJar();
    if (!result.canceled && result.filePaths.length > 0) {
      setBfgPath(result.filePaths[0]);
    }
  };
  // Handle cleaning repository - updated to check for secrets first
  const handleCleanRepository = async () => {
    if (!repoPath) {
      setError('Please clone the repository first.');
      return;
    }

    // Use automatic BFG path if available, otherwise require manual selection
    const effectiveBfgPath = bfgStatus.isAvailable && bfgStatus.path ? bfgStatus.path : bfgPath;
    
    if (!effectiveBfgPath) {
      setError('BFG jar file is not available. Please wait for automatic download or select manually.');
      return;
    }

    // Parse text replacements from the textarea (one replacement per line)
    const textReplacements = replacements
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // If we have text replacements, check for secrets in HEAD first
    if (textReplacements.length > 0) {
      try {
        setIsCheckingSecrets(true);
        setResult(null);
        setError(null);
        setShowPostCleaningOption(false);
        setShowSecretWarning(false);

        // Check for secrets in HEAD branch
        const secretCheckResponse = await window.electronAPI.checkSecretsInHead({
          repoPath,
          secrets: textReplacements
        });

        if (secretCheckResponse.success) {
          if (secretCheckResponse.foundSecrets.length > 0) {
            // Secrets found - show warning
            setFoundSecrets(secretCheckResponse.foundSecrets);
            setShowSecretWarning(true);
            setIsCheckingSecrets(false);
            return; // Stop here and wait for user decision
          } else {
            // No secrets found in HEAD, proceed with BFG cleaning
            setResult('No secrets found in HEAD branch. Proceeding with BFG cleaning...');
          }
        } else {
          setError(`Error checking secrets in HEAD: ${secretCheckResponse.message}\n${secretCheckResponse.error || ''}`);
          setIsCheckingSecrets(false);
          return;
        }
      } catch (err) {
        setError(`An unexpected error occurred while checking secrets: ${err instanceof Error ? err.message : String(err)}`);
        setIsCheckingSecrets(false);
        return;
      } finally {
        setIsCheckingSecrets(false);
      }    }

    // Proceed with BFG cleaning
    await proceedWithBfgCleaning(textReplacements, effectiveBfgPath);
  };
  // Handle cleaning secrets from HEAD branch
  const handleCleanSecretsFromHead = async () => {
    if (!repoPath || !repoUrl) {
      setError('Repository path or URL is missing.');
      return;
    }

    // Use automatic BFG path if available, otherwise require manual selection
    const effectiveBfgPath = bfgStatus.isAvailable && bfgStatus.path ? bfgStatus.path : bfgPath;
    
    if (!effectiveBfgPath) {
      setError('BFG jar file is not available. Please wait for automatic download or select manually.');
      return;
    }

    try {
      setIsCleaningSecrets(true);
      setError(null);

      // Parse text replacements from the textarea (one replacement per line)
      const textReplacements = replacements
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await window.electronAPI.cleanSecretsFromHead({
        repoPath,
        secrets: textReplacements,
        repoUrl,
        targetDir
      });

      if (response.success) {
        setResult(`${response.message}\n\n${response.output || ''}`);
        setShowSecretWarning(false);
        setFoundSecrets([]);
          if (response.replacementsMade) {
          // Repository was re-cloned, proceed with BFG cleaning
          setResult(prev => `${prev}\n\nProceeding with BFG cleaning...`);
          await proceedWithBfgCleaning(textReplacements, effectiveBfgPath);
        }
      } else {
        setError(`${response.message}\n${response.error || ''}`);
      }
    } catch (err) {
      setError(`An unexpected error occurred while cleaning secrets: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCleaningSecrets(false);
    }
  };

  // Handle aborting the operation when secrets are found
  const handleAbortOperation = () => {
    setShowSecretWarning(false);
    setFoundSecrets([]);
    setResult('Operation aborted by user - secrets found in HEAD branch');
  };
  // Extracted BFG cleaning logic
  const proceedWithBfgCleaning = async (textReplacements: string[], bfgJarPath?: string) => {
    try {
      setIsProcessing(true);
      setShowPostCleaningOption(false);

      // Use provided path or determine the effective BFG path
      const effectiveBfgPath = bfgJarPath || (bfgStatus.isAvailable && bfgStatus.path ? bfgStatus.path : bfgPath);
      
      if (!effectiveBfgPath) {
        setError('BFG jar file is not available.');
        return;
      }

      // Call the main process to execute BFG
      const response = await window.electronAPI.cleanRepository({
        repoPath,
        bfgPath: effectiveBfgPath,
        textReplacements,
        fileSizes
      });

      if (response.success) {
        const resultText = `${response.message}\n\n${response.output || ''}`;
        setResult(prev => prev ? `${prev}\n\n==== BFG Cleaning ====\n${resultText}` : resultText);
        // Only show the option to run post-cleaning commands if something was actually cleaned
        if (!response.nothingToDo) {
          setShowPostCleaningOption(true);
        }
      } else {
        setError(`${response.message}\n${response.error || ''}`);
      }
    } catch (err) {
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle running post-cleaning commands
  const handleRunPostCleaningCommands = async () => {
    if (!repoPath) {
      setError('Repository path is missing.');
      return;
    }

    try {
      setIsRunningPostCommands(true);
      // Keep the previous result visible
      setError(null);

      console.log('Running post-cleaning commands for repository:', repoPath);
      const response = await window.electronAPI.runPostCleaningCommands({
        repoPath
      });

      console.log('Post-cleaning commands response:', response);
      if (response.success) {
        const resultText = `==== Post-Cleaning Commands ====\n${response.message}\n\n${response.output || ''}`;
        
        setResult(prev => 
          prev ? `${prev}\n\n${resultText}` 
               : `Post-Cleaning Commands Executed:\n${resultText}`
        );
        
        console.log('Post-cleaning commands executed successfully');
      } else {
        const errorText = `Error executing post-cleaning commands:\n${response.message}\n${response.error || ''}`;
        console.error(errorText);
        setError(errorText);
      }
    } catch (err) {
      const errorMessage = `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsRunningPostCommands(false);
      // Hide the option after running
      setShowPostCleaningOption(false);
    }
  };
  
  // Handle reset all fields (except BFG jar path and target directory)
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      // If we have a repository path, clean it up first
      if (repoPath) {
        await window.electronAPI.resetAndCleanup({
          repoPath
        });
      }
      
      // Reset all state variables except bfgPath and targetDir
      setRepoPath('');
      setRepoUrl('');
      // Don't clear target directory: setTargetDir('');
      setReplacements('');
      setFileSizes('');
      setResult(null);
      setError(null);
      setCloneStatus('idle');
      setShowPostCleaningOption(false);
      
      // Reset new secret checking state
      setFoundSecrets([]);
      setShowSecretWarning(false);
      
    } catch (err) {
      setError(`Error during reset: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="app">
      <TitleBar />
      <div className="app-content">
        <div className="content-container">
          <header className="header">
            <h1>BFG Repo-Cleaner GUI</h1>
            <p className="subtitle">Clean your Git repository of large files & sensitive data</p>
          </header>

      <div className="main">
        <section className="section info-section">
          <h2>What is BFG Repo-Cleaner?</h2>
          <p>
            BFG Repo-Cleaner is a simpler, faster alternative to git-filter-branch for cleansing bad data out of your Git repository history:
          </p>
          <ul>
            <li>Remove Crazy Big Files</li>
            <li>Remove Passwords, Credentials & other Private data</li>
          </ul>
          <p>
            The BFG is typically 10-720x faster than git-filter-branch, and is well tested with the major Git providers.
          </p>
          
          <div className="important-note">
            <h3>Important Note:</h3>
            <p>
              By default the BFG doesn't modify the contents of your latest commit on your master (or 'HEAD') branch, even though it will clean all the commits before it.
            </p>
            <p>
              That's because your latest commit is likely to be the one that you deploy to production, and a simple deletion of a private credential or a big file is quite likely to result in broken code that no longer has the hard-coded data it expects - you need to fix that, the BFG can't do it for you. Once you've committed your changes- and your latest commit is clean with none of the undesired data in it - you can run the BFG to perform it's simple deletion operations over all your historical commits.
            </p>
          </div>
        </section>

        <section className="section">
          <h2>Repository Settings</h2>

          <div className="form-group">
            <label>Git Repository URL:</label>
            <input 
              type="text" 
              value={repoUrl} 
              onChange={(e) => setRepoUrl(e.target.value)} 
              placeholder="https://github.com/username/repository.git" 
            />
            <p className="help-text">Enter the URL of the Git repository to clone</p>
          </div>
          
          <div className="form-group">
            <label>Target Directory:</label>
            <div className="input-with-button">
              <input 
                type="text" 
                value={targetDir} 
                onChange={(e) => setTargetDir(e.target.value)} 
                placeholder="Select directory to clone into" 
              />
              <button onClick={handleSelectCloneDirectory}>Browse</button>
            </div>
            <p className="help-text">Select where to clone the repository - this should be an empty folder for the tool to work properly</p>
          </div>
          
          <div className="clone-actions">
            <button 
              className={`clone-button ${cloneStatus === 'success' ? 'success' : ''} ${cloneStatus === 'error' ? 'error' : ''}`}
              onClick={handleCloneRepository}
              disabled={isCloning || !repoUrl || !targetDir || cloneStatus === 'success'}
            >
              {isCloning ? 'Cloning...' : 
               cloneStatus === 'success' ? 'Cloned' : 
               cloneStatus === 'error' ? 'Error - Try Again' : 
               'Clone Repository'}
            </button>
          </div>          <div className="form-group">
            <label>BFG JAR Status:</label>
            <div className="bfg-status-section">
              {bfgStatus.isDownloading ? (
                <div className="bfg-status downloading">
                  <span className="status-icon">⏳</span>
                  <span className="status-text">Downloading BFG...</span>
                  {bfgStatus.message && <span className="status-message">{bfgStatus.message}</span>}
                </div>
              ) : bfgStatus.isAvailable ? (
                <div className="bfg-status available">
                  <span className="status-icon">✅</span>
                  <span className="status-text">BFG v{bfgStatus.version} ready</span>
                  <button 
                    className="update-button" 
                    onClick={handleCheckBfgUpdate}
                    disabled={bfgStatus.isDownloading}
                  >
                    Check for Updates
                  </button>
                </div>
              ) : bfgStatus.error ? (
                <div className="bfg-status error">
                  <span className="status-icon">❌</span>
                  <span className="status-text">Error: {bfgStatus.error}</span>
                  <button 
                    className="retry-button" 
                    onClick={handleCheckBfgUpdate}
                    disabled={bfgStatus.isDownloading}
                  >
                    Retry Download
                  </button>
                </div>
              ) : (
                <div className="bfg-status unknown">
                  <span className="status-icon">❔</span>
                  <span className="status-text">BFG status unknown</span>
                  <button 
                    className="retry-button" 
                    onClick={handleCheckBfgUpdate}
                    disabled={bfgStatus.isDownloading}
                  >
                    Initialize BFG
                  </button>
                </div>
              )}
            </div>
            
            {/* Fallback manual selection */}
            <details className="manual-bfg-selection">
              <summary>Manual BFG Selection (Advanced)</summary>
              <div className="input-with-button">
                <input 
                  type="text" 
                  value={bfgPath} 
                  onChange={(e) => setBfgPath(e.target.value)} 
                  placeholder="Select or enter path to bfg-x.x.x.jar" 
                />
                <button onClick={handleSelectBfgJar}>Browse</button>
              </div>
            </details>
            
            <p className="help-text">
              BFG is automatically downloaded and managed. Visit <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://rtyley.github.io/bfg-repo-cleaner/', '_blank');
                }}
                rel="noopener noreferrer"
              >
                BFG Documentation
              </a> for more information.
            </p>
          </div>
        </section>
        
        <section className="section">
          <h2>Cleaning Options</h2>
          
          <div className="form-group">
            <label>Replace Text (Secrets, Passwords, etc.):</label>
            <textarea 
              value={replacements} 
              onChange={(e) => setReplacements(e.target.value)} 
              placeholder="Enter text to replace (one per line, e.g. 'password=123')..."
              rows={5}
            />
            <p className="help-text">Enter one replacement per line</p>
          </div>

          <div className="form-group">
            <label>Strip Files Larger Than:</label>
            <input 
              type="text" 
              value={fileSizes} 
              onChange={(e) => setFileSizes(e.target.value)} 
              placeholder="e.g., 50M, 10K" 
            />
            <p className="help-text">Examples: 10M (10 megabytes), 1K (1 kilobyte)</p>
          </div>
        </section>

        <div className="action-buttons">          <button 
            className="primary-button"
            onClick={handleCleanRepository}
            disabled={isProcessing || isRunningPostCommands || isResetting || isCheckingSecrets || isCleaningSecrets || !repoPath || (!bfgStatus.isAvailable && !bfgPath)}
          >
            {isCheckingSecrets ? 'Checking for Secrets...' : 
             isProcessing ? 'Cleaning Repository...' : 'Clean Repository'}
          </button>
          
          <button
            className="reset-button"
            onClick={() => {
              if (window.confirm('Reset will delete files from the working directory. Continue?')) {
                handleReset();
              }
            }}
            disabled={isProcessing || isRunningPostCommands || isResetting || isCheckingSecrets || isCleaningSecrets}
          >
            {isResetting ? 'Resetting...' : 'Reset'}
          </button>
        </div>
        
        {showSecretWarning && foundSecrets.length > 0 && (
          <div className="secret-warning-section">
            <h3 className="warning-title">⚠️ Secrets Found in HEAD Branch</h3>
            <p className="warning-message">
              The following secrets were found in your HEAD branch. BFG Repo-Cleaner does not clean the HEAD branch by default.
            </p>
            
            <div className="found-secrets">
              {foundSecrets.map((item, index) => (
                <div key={index} className="secret-item">
                  <strong>Secret:</strong> <code>{item.secret}</code>
                  <br />
                  <strong>Found in files:</strong>
                  <ul>
                    {item.files.map((file, fileIndex) => (
                      <li key={fileIndex}><code>{file}</code></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="warning-actions">
              <div className="warning-note">
                <strong>⚠️ WARNING:</strong> Cleaning secrets from HEAD will modify your latest commit and push the changes to the remote repository. 
                Only proceed if you're sure this will not break production or cause issues with your deployment.
                <br /><br />
                <strong>Recommendation:</strong> Consider manually removing secrets from your HEAD branch first, then re-run this tool.
              </div>
              
              <div className="action-buttons">
                <button
                  className="danger-button"
                  onClick={handleCleanSecretsFromHead}
                  disabled={isCleaningSecrets}
                >
                  {isCleaningSecrets ? 'Cleaning Secrets from HEAD...' : 'Clean Secrets from HEAD & Continue'}
                </button>
                
                <button
                  className="secondary-button"
                  onClick={handleAbortOperation}
                  disabled={isCleaningSecrets}
                >
                  Abort Operation
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showPostCleaningOption && (
          <div className="post-cleaning-section">
            <p>Repository cleaning completed. Would you like to run the recommended post-cleaning commands?</p>
            <div className="post-cleaning-code">
              <pre><code>git reflog expire --expire=now --all && git gc --prune=now --aggressive && git push --mirror</code></pre>
            </div>
            <button
              className="secondary-button"
              onClick={handleRunPostCleaningCommands}
              disabled={isRunningPostCommands}
            >
              {isRunningPostCommands ? 'Running Commands...' : 'Run Post-Cleaning Commands'}
            </button>
          </div>
        )}

        {error && (
          <div className="result error">
            <h3>Error</h3>
            <pre>{error}</pre>
          </div>
        )}

        {result && (
          <div className="result success">
            <h3>Result</h3>
            <pre>{result}</pre>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>BFG Repo-Cleaner GUI © 2025 | <a href="https://github.com/rtyley/bfg-repo-cleaner" target="_blank" rel="noopener noreferrer">BFG Documentation</a></p>
      </footer>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
