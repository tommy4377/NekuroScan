/**
 * USE KEYBOARD SHORTCUTS - Hook per gestire keyboard shortcuts
 * ✅ SEZIONE 2: Keyboard Shortcuts
 */

import { useEffect, useState } from 'react';

interface KeyboardShortcutsOptions {
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  onSearch?: () => void;
  onLibrary?: () => void;
  enabled?: boolean;
  isReaderPage?: boolean;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions = {}) => {
  const {
    onNextPage,
    onPrevPage,
    onToggleFullscreen,
    onClose,
    onSearch,
    onLibrary,
    enabled = true,
    isReaderPage = false
  } = options;

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignora se l'utente sta digitando in un input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;

      if (isTyping && e.key !== 'Escape' && e.key !== '?') {
        return;
      }

      // Shortcut per mostrare shortcuts modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Global shortcuts (solo se non siamo nel reader)
      if (!isReaderPage) {
        // Ctrl+K o Cmd+K per focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          onSearch?.();
          const searchInput = document.querySelector('input[placeholder*="Cerca"], input[type="search"]') as HTMLInputElement | null;
          searchInput?.focus();
          return;
        }

        // Ctrl+B o Cmd+B per library
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault();
          onLibrary?.();
          return;
        }
      }

      // Reader shortcuts (solo se siamo nel reader)
      if (isReaderPage) {
        // F per fullscreen
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          onToggleFullscreen?.();
          return;
        }

        // Escape per chiudere
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose?.();
          return;
        }

        // Space o Arrow Right per next (solo se non è typing)
        if ((e.key === ' ' || e.key === 'ArrowRight') && !isTyping) {
          e.preventDefault();
          onNextPage?.();
          return;
        }

        // Arrow Left per prev (solo se non è typing)
        if (e.key === 'ArrowLeft' && !isTyping) {
          e.preventDefault();
          onPrevPage?.();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, isReaderPage, onNextPage, onPrevPage, onToggleFullscreen, onClose, onSearch, onLibrary]);

  return {
    showShortcutsModal,
    setShowShortcutsModal
  };
};

