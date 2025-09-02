import React, { useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

interface KeyboardShortcutsProps {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onFullscreen?: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onSave,
  onUndo,
  onRedo,
  onNext,
  onPrevious,
  onPlay,
  onPause,
  onFullscreen
}) => {
  const { addToast } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement).contentEditable === 'true'
      ) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      switch (event.key.toLowerCase()) {
        case 's':
          if (isCtrlOrCmd && !isShift) {
            event.preventDefault();
            onSave?.();
            addToast('Saved!', 'success');
          }
          break;

        case 'z':
          if (isCtrlOrCmd && !isShift) {
            event.preventDefault();
            onUndo?.();
          } else if (isCtrlOrCmd && isShift) {
            event.preventDefault();
            onRedo?.();
          }
          break;

        case 'y':
          if (isCtrlOrCmd) {
            event.preventDefault();
            onRedo?.();
          }
          break;

        case 'arrowright':
          if (isCtrlOrCmd) {
            event.preventDefault();
            onNext?.();
          }
          break;

        case 'arrowleft':
          if (isCtrlOrCmd) {
            event.preventDefault();
            onPrevious?.();
          }
          break;

        case ' ':
          event.preventDefault();
          if (onPlay) {
            onPlay();
          } else if (onPause) {
            onPause();
          }
          break;

        case 'f':
          if (isCtrlOrCmd) {
            event.preventDefault();
            onFullscreen?.();
          }
          break;

        case 'escape':
          // Close any open modals or panels
          const modals = document.querySelectorAll('[data-modal]');
          modals.forEach(modal => {
            if (modal instanceof HTMLElement) {
              modal.style.display = 'none';
            }
          });
          break;

        case '?':
          if (isCtrlOrCmd) {
            event.preventDefault();
            addToast('Keyboard shortcuts: Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+Y (Redo), Space (Play/Pause), Ctrl+F (Fullscreen)', 'info');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onUndo, onRedo, onNext, onPrevious, onPlay, onPause, onFullscreen, addToast]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts;
