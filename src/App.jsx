import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import SearchModal from './components/SearchModal';
import { 
  Minus, 
  Square, 
  X, 
  Loader2, 
  FileText,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export default function App() {
  const [workspacePath, setWorkspacePath] = useState(localStorage.getItem('voidpad_workspace') || null);
  const [pagesTree, setPagesTree] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [activePageData, setActivePageData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('voidpad_dark_mode') !== 'false');
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('voidpad_dark_mode', isDarkMode);
  }, [isDarkMode]);

  const refreshWorkspace = useCallback(async () => {
    if (!workspacePath) return;
    try {
      const treeJson = await invoke('read_workspace', { workspacePath });
      const tree = JSON.parse(treeJson);
      setPagesTree(tree);
    } catch (error) {
      console.error('Failed to read workspace:', error);
    }
  }, [workspacePath]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  // Auto-select first page when workspace loads
  useEffect(() => {
    if (!activePageId && pagesTree.length > 0) {
      const firstPage = findFirstPage(pagesTree);
      if (firstPage) handleSelectPage(firstPage.id);
    }
  }, [pagesTree]);

  const findFirstPage = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'page') return node;
      if (node.children?.length > 0) {
        const found = findFirstPage(node.children);
        if (found) return found;
      }
    }
    return null;
  };

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Window control handlers
  const handleMinimize = async () => {
    try { await getCurrentWindow().minimize(); } catch(e) {}
  };
  const handleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      if (await win.isMaximized()) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    } catch(e) {}
  };
  const handleClose = async () => {
    try { await getCurrentWindow().close(); } catch(e) {}
  };

  const handleSelectWorkspace = async () => {
    try {
      const path = await invoke('select_workspace');
      if (path) {
        setWorkspacePath(path);
        localStorage.setItem('voidpad_workspace', path);
        setActivePageId(null);
        setActivePageData(null);
      }
    } catch (error) {
      console.error('Failed to select workspace:', error);
    }
  };

  const handleSelectPage = async (pageId) => {
    if (!workspacePath) return;
    setIsLoadingPage(true);
    try {
      const dataStr = await invoke('read_page', { workspacePath, pageId });
      const data = JSON.parse(dataStr);
      setActivePageId(pageId);
      setActivePageData(data);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleCreatePage = async (parentId) => {
    if (!workspacePath) return;
    try {
      const resultStr = await invoke('create_page', { workspacePath, parentId, name: 'Untitled' });
      const result = JSON.parse(resultStr);
      if (result.success) {
        await refreshWorkspace();
        handleSelectPage(result.pageId);
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const handleRenamePage = async (pageId, newName) => {
    if (!workspacePath) return;
    try {
      const resultStr = await invoke('rename_page', { workspacePath, pageId, newName });
      const result = JSON.parse(resultStr);
      if (result.success) {
        await refreshWorkspace();
        if (activePageId === pageId) {
          setActivePageId(result.newPageId);
          setActivePageData(prev => ({ ...prev, title: newName }));
        }
      }
    } catch (error) {
      console.error('Failed to rename page:', error);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!workspacePath) return;
    try {
      const resultStr = await invoke('delete_page', { workspacePath, pageId });
      const result = JSON.parse(resultStr);
      if (result.success) {
        if (activePageId === pageId) {
          setActivePageId(null);
          setActivePageData(null);
        }
        await refreshWorkspace();
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const handleSavePage = async (title, markdownText, metadata) => {
    if (!workspacePath || !activePageId) return;
    try {
      await invoke('save_page', { 
        workspacePath, 
        pageId: activePageId, 
        title, 
        markdownText, 
        metadata 
      });
      setActivePageData(prev => ({ ...prev, title, metadata, markdownText }));
      if (activePageData?.title !== title) {
        await refreshWorkspace();
      }
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleDisconnectWorkspace = () => {
    setWorkspacePath(null);
    setPagesTree([]);
    setActivePageId(null);
    setActivePageData(null);
    localStorage.removeItem('voidpad_workspace');
    setSettingsOpen(false);
  };

  // Window controls component
  const WindowControls = () => (
    <div className="window-controls">
      <button className="window-control-btn" onClick={handleMinimize} title="Minimize">
        <Minus size={14} />
      </button>
      <button className="window-control-btn" onClick={handleMaximize} title="Maximize">
        <Square size={12} />
      </button>
      <button className="window-control-btn close" onClick={handleClose} title="Close">
        <X size={14} />
      </button>
    </div>
  );

  if (!workspacePath) {
    return (
      <div className="welcome-container">
        <div className="window-titlebar" data-tauri-drag-region>
          <span>VoidPad</span>
          <WindowControls />
        </div>
        <div className="welcome-card">
          <div className="welcome-logo">VoidPad</div>
          <p className="welcome-subtitle">
            A fully offline, local-first workspace for your notes. Everything is saved as standard Markdown on your computer.
          </p>
          <button className="btn-primary" onClick={handleSelectWorkspace}>
            Open Workspace Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="window-titlebar" data-tauri-drag-region>
        <div />
        <WindowControls />
      </div>

      <Sidebar 
        pagesTree={pagesTree}
        activePageId={activePageId}
        workspaceName={workspacePath.split(/[\\/]/).pop()}
        isDarkMode={isDarkMode}
        collapsed={sidebarCollapsed}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onRenamePage={handleRenamePage}
        onDeletePage={handleDeletePage}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Sidebar toggle button (visible when collapsed) */}
      <button 
        className="sidebar-toggle-btn"
        onClick={() => setSidebarCollapsed(prev => !prev)}
        title="Toggle Sidebar (Ctrl+\\)"
        style={{ left: sidebarCollapsed ? 8 : `calc(var(--sidebar-width) - 32px)` }}
      >
        {sidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
      </button>

      <div className="editor-panel">
        {isLoadingPage ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={28} color="var(--accent-color)" />
            <p>Loading page...</p>
          </div>
        ) : activePageId && activePageData ? (
          <Editor 
            key={activePageId}
            workspacePath={workspacePath}
            pageId={activePageId}
            initialTitle={activePageData.title}
            initialMarkdown={activePageData.markdownText}
            initialMetadata={activePageData.metadata}
            isDarkMode={isDarkMode}
            onSave={handleSavePage}
          />
        ) : (
          <div className="empty-state">
            <FileText size={40} color="var(--border-color)" strokeWidth={1.5} />
            <h2>No Page Selected</h2>
            <p>Select a page from the sidebar or create a new one to start writing.</p>
            <button className="btn-primary" onClick={() => handleCreatePage(null)} style={{ marginTop: 8 }}>
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
              <label>Workspace</label>
              <div className="settings-input-group">
                <input type="text" className="settings-input" value={workspacePath} readOnly />
                <button className="btn-secondary" onClick={handleSelectWorkspace}>Change</button>
              </div>
            </div>

            <div className="settings-row">
              <label>Actions</label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                Disconnecting removes the link to this folder. Your Markdown files remain untouched.
              </p>
              <button 
                className="btn-secondary" 
                style={{ color: 'var(--red)', borderColor: 'rgba(235, 87, 87, 0.2)' }}
                onClick={handleDisconnectWorkspace}
              >
                Disconnect Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
