import React, { useState, useEffect, useRef } from 'react';
import './ContextMenu.scss';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onPaste: () => void;
  onCopy: () => void;
  onCut: () => void;
  onSelectAll: () => void;
  canPaste: boolean;
  canCopy: boolean;
  canCut: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onPaste,
  onCopy,
  onCut,
  onSelectAll,
  canPaste,
  canCopy,
  canCut
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="context-menu" 
      style={{ left: x, top: y }}
    >
      <div 
        className={`context-menu-item ${!canCut ? 'disabled' : ''}`}
        onClick={() => canCut && handleItemClick(onCut)}
      >
        Cut
      </div>
      <div 
        className={`context-menu-item ${!canCopy ? 'disabled' : ''}`}
        onClick={() => canCopy && handleItemClick(onCopy)}
      >
        Copy
      </div>
      <div 
        className={`context-menu-item ${!canPaste ? 'disabled' : ''}`}
        onClick={() => canPaste && handleItemClick(onPaste)}
      >
        Paste
      </div>
      <div className="context-menu-separator" />
      <div 
        className="context-menu-item"
        onClick={() => handleItemClick(onSelectAll)}
      >
        Select All
      </div>
    </div>
  );
};

export default ContextMenu;
