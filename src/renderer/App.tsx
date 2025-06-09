import React, { useState } from 'react';
import './styles/App.scss';

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
    };
  }
}

const App: React.FC = () => {
  // State
  const [repoPath, setRepoPath] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [targetDir, setTargetDir] = useState<string>('');
  const [bfgPath, setBfgPath] = useState<string>('');
  const [replacements, setReplacements] = useState<string>('');
  const [fileSizes, setFileSizes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [isRunningPostCommands, setIsRunningPostCommands] = useState<boolean>(false);
  const [showPostCleaningOption, setShowPostCleaningOption] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        setError(
          `${response.message}\n${response.error || ''}`
        );
      }
    } catch (err) {
      setError(`An unexpected error occurred while cloning: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCloning(false);
    }
  };

  // Handle selecting BFG jar file
  const handleSelectBfgJar = async () => {
    const result = await window.electronAPI.selectBfgJar();
    if (!result.canceled && result.filePaths.length > 0) {
      setBfgPath(result.filePaths[0]);
    }
  };

  // Handle cleaning repository
  const handleCleanRepository = async () => {
    if (!repoPath || !bfgPath) {
      setError('Please clone the repository and select the BFG jar file path.');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);
      setError(null);
      setShowPostCleaningOption(false);

      // Parse text replacements from the textarea (one replacement per line)
      const textReplacements = replacements
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Call the main process to execute BFG
      const response = await window.electronAPI.cleanRepository({
        repoPath,
        bfgPath,
        textReplacements,
        fileSizes
      });

      if (response.success) {
        setResult(
          `${response.message}\n\n${response.output || ''}`
        );
        // Show the option to run post-cleaning commands
        setShowPostCleaningOption(true);
      } else {
        setError(
          `${response.message}\n${response.error || ''}`
        );
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
  
  // Handle reset all fields (except BFG jar path)
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      // If we have a repository path, clean it up first
      if (repoPath) {
        await window.electronAPI.resetAndCleanup({
          repoPath
        });
      }
      
      // Reset all state variables except bfgPath
      setRepoPath('');
      setRepoUrl('');
      setTargetDir('');
      setReplacements('');
      setFileSizes('');
      setResult(null);
      setError(null);
      setShowPostCleaningOption(false);
      
    } catch (err) {
      setError(`Error during reset: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>BFG Repo-Cleaner GUI</h1>
        <p className="subtitle">Clean your Git repository of large files & sensitive data</p>
      </header>

      <div className="main">
        <section className="section">
          <h2>Repository Settings</h2>
          
          <div className="repo-selection">
            <h3>Clone Repository with --mirror</h3>
          </div>

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
            <p className="help-text">Select where to clone the repository</p>
          </div>
          
          <div className="clone-actions">
            <button 
              className="clone-button"
              onClick={handleCloneRepository}
              disabled={isCloning || !repoUrl || !targetDir}
            >
              {isCloning ? 'Cloning...' : 'Clone Repository with --mirror'}
            </button>
          </div>

          <div className="form-group">
            <label>BFG JAR File Path:</label>
            <div className="input-with-button">
              <input 
                type="text" 
                value={bfgPath} 
                onChange={(e) => setBfgPath(e.target.value)} 
                placeholder="Select or enter path to bfg-x.x.x.jar" 
              />
              <button onClick={handleSelectBfgJar}>Browse</button>
            </div>
            <p className="help-text">
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://rtyley.github.io/bfg-repo-cleaner/', '_blank');
                }}
              >
                Download BFG Repo-Cleaner
              </a>
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

        <div className="action-buttons">
          <button 
            className="primary-button"
            onClick={handleCleanRepository}
            disabled={isProcessing || isRunningPostCommands || isResetting || !bfgPath || !repoPath}
          >
            {isProcessing ? 'Cleaning Repository...' : 'Clean Repository'}
          </button>
          
          <button
            className="reset-button"
            onClick={handleReset}
            disabled={isProcessing || isRunningPostCommands || isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset All Fields'}
          </button>
        </div>
        
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
          <div className="note">
            <p>Note: After cleaning, run the following commands:</p>
            <pre><code>cd your-repo
git reflog expire --expire=now --all
git gc --prune=now --aggressive</code></pre>
            
            <p>For mirrored repositories, also run:</p>
            <pre><code>cd your-mirror.git
git push --mirror</code></pre>
            
            <p>Or to push to your original repo:</p>
            <pre><code>cd your-original-repo
git remote add origin /path/to/your/mirror.git
git push origin --force</code></pre>
          </div>
        </section>
      </div>

      <footer className="footer">
        <p>BFG Repo-Cleaner GUI © 2025 | <a href="https://github.com/rtyley/bfg-repo-cleaner" target="_blank" rel="noopener noreferrer">BFG Documentation</a></p>
      </footer>
    </div>
  );
};

export default App;
