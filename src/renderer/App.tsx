import React, { useState } from 'react';
import './styles/App.scss';

// Define the type for the window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      selectRepository: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      selectBfgJar: () => Promise<{ canceled: boolean; filePaths: string[] }>;
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
    };
  }
}

const App: React.FC = () => {
  // State
  const [repoPath, setRepoPath] = useState<string>('');
  const [bfgPath, setBfgPath] = useState<string>('');
  const [replacements, setReplacements] = useState<string>('');
  const [fileSizes, setFileSizes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle selecting repository folder
  const handleSelectRepo = async () => {
    const result = await window.electronAPI.selectRepository();
    if (!result.canceled && result.filePaths.length > 0) {
      setRepoPath(result.filePaths[0]);
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
      setError('Please select both a repository path and the BFG jar file path.');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);
      setError(null);

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

  return (
    <div className="app">
      <header className="header">
        <h1>BFG Repo-Cleaner GUI</h1>
        <p className="subtitle">Clean your Git repository of large files & sensitive data</p>
      </header>

      <div className="main">
        <section className="section">
          <h2>Repository Settings</h2>
          
          <div className="form-group">
            <label>Git Repository Path:</label>
            <div className="input-with-button">
              <input 
                type="text" 
                value={repoPath} 
                onChange={(e) => setRepoPath(e.target.value)} 
                placeholder="Select or enter git repository path" 
              />
              <button onClick={handleSelectRepo}>Browse</button>
            </div>
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
            disabled={isProcessing || !repoPath || !bfgPath}
          >
            {isProcessing ? 'Cleaning Repository...' : 'Clean Repository'}
          </button>
        </div>

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
          <p className="note">
            Note: After cleaning, run <code>cd your-repo && git reflog expire --expire=now --all && git gc --prune=now --aggressive</code>
          </p>
        </section>
      </div>

      <footer className="footer">
        <p>BFG Repo-Cleaner GUI © 2025 | <a href="https://github.com/rtyley/bfg-repo-cleaner" target="_blank" rel="noopener noreferrer">BFG Documentation</a></p>
      </footer>
    </div>
  );
};

export default App;
