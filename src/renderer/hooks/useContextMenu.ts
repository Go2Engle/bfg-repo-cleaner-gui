import { useState, useRef, useCallback } from 'react';

interface UseContextMenuProps {
  onPaste?: (text: string) => void;
  onCopy?: (text: string) => void;
  onCut?: (text: string) => void;
  onSelectAll?: () => void;
}

interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  canPaste: boolean;
  canCopy: boolean;
  canCut: boolean;
}

export const useInputContextMenu = ({ onPaste, onCopy, onCut, onSelectAll }: UseContextMenuProps = {}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    canPaste: false,
    canCopy: false,
    canCut: false
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const showContextMenu = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    const target = inputRef.current;
    if (!target) return;

    // Check if we can paste (if clipboard has text)
    let canPaste = false;
    try {
      const clipboardResult = await window.electronAPI.clipboardReadText();
      canPaste = clipboardResult.success && !!clipboardResult.text;
    } catch (error) {
      console.error('Error checking clipboard:', error);
    }

    // Check if we can copy/cut (if there's selected text)
    const hasSelection = target.selectionStart !== target.selectionEnd;
    const canCopy = hasSelection;
    const canCut = hasSelection && !target.readOnly;

    setContextMenu({
      isVisible: true,
      x: event.clientX,
      y: event.clientY,
      canPaste,
      canCopy,
      canCut
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardResult = await window.electronAPI.clipboardReadText();
      if (clipboardResult.success && clipboardResult.text && inputRef.current) {
        const target = inputRef.current;
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const currentValue = target.value;
        const newValue = currentValue.slice(0, start) + clipboardResult.text + currentValue.slice(end);
        
        // Update the input value
        target.value = newValue;
        
        // Position cursor after pasted text
        const newCursorPos = start + clipboardResult.text.length;
        target.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger change event
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
        
        // Call custom paste handler if provided
        if (onPaste) {
          onPaste(clipboardResult.text);
        }
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
    }
  }, [onPaste]);

  const handleCopy = useCallback(async () => {
    if (!inputRef.current) return;
    
    const target = inputRef.current;
    const selectedText = target.value.slice(target.selectionStart || 0, target.selectionEnd || 0);
    
    if (selectedText) {
      try {
        await window.electronAPI.clipboardWriteText(selectedText);
        if (onCopy) {
          onCopy(selectedText);
        }
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }, [onCopy]);

  const handleCut = useCallback(async () => {
    if (!inputRef.current) return;
    
    const target = inputRef.current;
    const selectedText = target.value.slice(target.selectionStart || 0, target.selectionEnd || 0);
    
    if (selectedText) {
      try {
        await window.electronAPI.clipboardWriteText(selectedText);
        
        // Remove selected text
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const currentValue = target.value;
        const newValue = currentValue.slice(0, start) + currentValue.slice(end);
        
        target.value = newValue;
        target.setSelectionRange(start, start);
        
        // Trigger change event
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
        
        if (onCut) {
          onCut(selectedText);
        }
      } catch (error) {
        console.error('Error cutting to clipboard:', error);
      }
    }
  }, [onCut]);

  const handleSelectAll = useCallback(() => {
    if (!inputRef.current) return;
    
    inputRef.current.select();
    if (onSelectAll) {
      onSelectAll();
    }
  }, [onSelectAll]);

  return {
    inputRef,
    contextMenu,
    showContextMenu,
    hideContextMenu,
    handlePaste,
    handleCopy,
    handleCut,
    handleSelectAll
  };
};

export const useTextareaContextMenu = ({ onPaste, onCopy, onCut, onSelectAll }: UseContextMenuProps = {}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    canPaste: false,
    canCopy: false,
    canCut: false
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showContextMenu = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    const target = textareaRef.current;
    if (!target) return;

    // Check if we can paste (if clipboard has text)
    let canPaste = false;
    try {
      const clipboardResult = await window.electronAPI.clipboardReadText();
      canPaste = clipboardResult.success && !!clipboardResult.text;
    } catch (error) {
      console.error('Error checking clipboard:', error);
    }

    // Check if we can copy/cut (if there's selected text)
    const hasSelection = target.selectionStart !== target.selectionEnd;
    const canCopy = hasSelection;
    const canCut = hasSelection && !target.readOnly;

    setContextMenu({
      isVisible: true,
      x: event.clientX,
      y: event.clientY,
      canPaste,
      canCopy,
      canCut
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardResult = await window.electronAPI.clipboardReadText();
      if (clipboardResult.success && clipboardResult.text && textareaRef.current) {
        const target = textareaRef.current;
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const currentValue = target.value;
        const newValue = currentValue.slice(0, start) + clipboardResult.text + currentValue.slice(end);
        
        // Update the textarea value
        target.value = newValue;
        
        // Position cursor after pasted text
        const newCursorPos = start + clipboardResult.text.length;
        target.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger change event
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
        
        // Call custom paste handler if provided
        if (onPaste) {
          onPaste(clipboardResult.text);
        }
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
    }
  }, [onPaste]);

  const handleCopy = useCallback(async () => {
    if (!textareaRef.current) return;
    
    const target = textareaRef.current;
    const selectedText = target.value.slice(target.selectionStart || 0, target.selectionEnd || 0);
    
    if (selectedText) {
      try {
        await window.electronAPI.clipboardWriteText(selectedText);
        if (onCopy) {
          onCopy(selectedText);
        }
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }, [onCopy]);

  const handleCut = useCallback(async () => {
    if (!textareaRef.current) return;
    
    const target = textareaRef.current;
    const selectedText = target.value.slice(target.selectionStart || 0, target.selectionEnd || 0);
    
    if (selectedText) {
      try {
        await window.electronAPI.clipboardWriteText(selectedText);
        
        // Remove selected text
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const currentValue = target.value;
        const newValue = currentValue.slice(0, start) + currentValue.slice(end);
        
        target.value = newValue;
        target.setSelectionRange(start, start);
        
        // Trigger change event
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
        
        if (onCut) {
          onCut(selectedText);
        }
      } catch (error) {
        console.error('Error cutting to clipboard:', error);
      }
    }
  }, [onCut]);

  const handleSelectAll = useCallback(() => {
    if (!textareaRef.current) return;
    
    textareaRef.current.select();
    if (onSelectAll) {
      onSelectAll();
    }
  }, [onSelectAll]);

  return {
    textareaRef,
    contextMenu,
    showContextMenu,
    hideContextMenu,
    handlePaste,
    handleCopy,
    handleCut,
    handleSelectAll
  };
};
