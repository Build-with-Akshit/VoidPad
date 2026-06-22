import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import SearchModal from './components/SearchModal';
import { 
  Minus, 
  Square, 
  X, 
  FileText,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export default function App() {
  const [pagesTree, setPagesTree] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('voidpad_dark_mode') !== 'false');
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // History for Alt+Arrow navigation
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('voidpad_dark_mode', isDarkMode);
  }, [isDarkMode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      
      // Browser-like history navigation
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setHistoryIndex(prev => {
          if (prev > 0) {
            setActivePageId(history[prev - 1]);
            return prev - 1;
          }
          return prev;
        });
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setHistoryIndex(prev => {
          if (prev < history.length - 1) {
            setActivePageId(history[prev + 1]);
            return prev + 1;
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex, activePageId]);

  // Window control handlers
  const handleMinimize = async () => {
    try { await getCurrentWindow().minimize(); } catch(e) {}
  };
  const handleMaximize = async () => {
    try { await getCurrentWindow().toggleMaximize(); } catch(e) {}
  };
  const handleClose = async () => {
    try { await getCurrentWindow().close(); } catch(e) {}
  };

  const handleSelectPage = (pageId, skipHistory = false) => {
    if (pageId !== activePageId && !skipHistory) {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(pageId);
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
    }
    setActivePageId(pageId);
  };

  const handleRenamePageCallback = (pageId, newName, newPageId) => {
    if (activePageId === pageId) {
      setActivePageId(newPageId);
    }
  };

  const handleDeletePageCallback = (pageId) => {
    if (activePageId === pageId) {
      setActivePageId(null);
    }
  };

  useEffect(() => {
    const handleNavigate = (e) => {
      handleSelectPage(e.detail);
    };
    window.addEventListener('navigate-page', handleNavigate);
    return () => window.removeEventListener('navigate-page', handleNavigate);
  }, [history, historyIndex, activePageId]);


  return (
    <div className="app-container">

      <Sidebar 
        activePageId={activePageId}
        workspaceName="VoidPad Notes"
        isDarkMode={isDarkMode}
        collapsed={sidebarCollapsed}
        onSelectPage={handleSelectPage}
        onRenamePage={handleRenamePageCallback}
        onDeletePage={handleDeletePageCallback}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        onTreeUpdate={(tree) => setPagesTree(tree)}
      />

      {/* Sidebar toggle button (visible when collapsed) */}
      {sidebarCollapsed && (
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(false)}
          title="Open Sidebar (Ctrl+\\)"
          style={{ left: 8 }}
        >
          <ChevronsRight size={14} />
        </button>
      )}

      <div className="editor-panel">
        {activePageId ? (
          <Editor 
            pageId={activePageId}
            isDarkMode={isDarkMode}
            sidebarCollapsed={sidebarCollapsed}
            onRenameActivePage={(oldId, newId) => {
               setActivePageId(newId);
               setHistory(prev => prev.map(id => id === oldId ? newId : id));
            }}
            onTitleChange={(id, newTitle) => {
              // Trigger Sidebar refresh
              const refreshEvent = new CustomEvent('refresh-sidebar-notes');
              window.dispatchEvent(refreshEvent);
            }}
          />
        ) : (
          <div className="empty-state">
            <FileText size={40} color="var(--border-color)" strokeWidth={1.5} />
            <h2>No Page Selected</h2>
            <p>Select a page from the sidebar or create a new one to start writing.</p>
            <button 
              className="btn-primary" 
              onClick={() => {
                const createEvent = new CustomEvent('create-sidebar-note');
                window.dispatchEvent(createEvent);
              }} 
              style={{ marginTop: 8 }}
            >
              + New Page
            </button>
          </div>
        )}
      </div>

      {searchOpen && (
        <SearchModal 
          pagesTree={pagesTree}
          onSelectPage={(id) => {
            handleSelectPage(id);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <span>Settings</span>
              <button className="sidebar-icon-btn" onClick={() => setSettingsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="settings-row">
              <label>Storage Location</label>
              <div className="settings-input-group">
                <input type="text" className="settings-input" value="Documents/VoidPad_Notes" readOnly />
              </div>
            </div>

            <div className="settings-row">
              <label>Info</label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                VoidPad is running completely offline. Your notes are stored as standard Markdown files under your system's Documents folder.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
