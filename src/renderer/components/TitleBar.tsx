import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import './TitleBar.scss';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const { theme } = useTheme();

  useEffect(() => {
    // Get platform information
    if (window.electronAPI?.getPlatform) {
      setPlatform(window.electronAPI.getPlatform());
    }

    // Check initial maximized state
    const checkMaximized = async () => {
      if (window.electronAPI?.windowIsMaximized) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();

    // Listen for window state changes
    if (window.electronAPI?.onWindowMaximized) {
      window.electronAPI.onWindowMaximized((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI?.windowMinimize) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.windowMaximize) {
      window.electronAPI.windowMaximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.windowClose) {
      window.electronAPI.windowClose();
    }
  };

  const isMacOS = platform === 'darwin';

  // Don't render window controls on macOS - let the native traffic lights handle it
  const WindowControls = () => {
    if (isMacOS) return null;

    return (
      <div className="title-bar-controls">
        <button 
          className="title-bar-control minimize" 
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5" width="10" height="2" fill="currentColor" />
          </svg>
        </button>
        <button 
          className="title-bar-control maximize" 
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none" />
              <rect x="3" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          )}
        </button>
        <button 
          className="title-bar-control close" 
          onClick={handleClose}
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    );
  };
  return (
    <div className={`title-bar ${isMacOS ? 'title-bar--macos' : 'title-bar--windows'} theme-${theme}`} data-theme={theme}>
      {isMacOS && <div className="title-bar-traffic-light-space" />}
      
      <div className="title-bar-drag-region">
        <div className="title-bar-content">
          <div className="title-bar-theme">
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      <WindowControls />
    </div>
  );
};

export default TitleBar;
