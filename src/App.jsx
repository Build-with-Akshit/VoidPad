import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import SearchModal from './components/SearchModal';
import { 
  FolderOpen, 
  Settings, 
  Search, 
  Sun, 
  Moon, 
  Loader2, 
  FileText,
  X
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

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('voidpad_dark_mode', isDarkMode);
  }, [isDarkMode]);

  const refreshWorkspace = async () => {
    if (!workspacePath) return;
    try {
      // Returns a JSON string of the tree
      const treeJson = await invoke('read_workspace', { workspacePath });
      const tree = JSON.parse(treeJson);
      setPagesTree(tree);
      
      if (!activePageId && tree.length > 0) {
        const firstPage = findFirstPage(tree);
        if (firstPage) {
          handleSelectPage(firstPage.id);
        }
      }
    } catch (error) {
      console.error('Failed to read workspace:', error);
    }
  };

  useEffect(() => {
    refreshWorkspace();
  }, [workspacePath]);

  const findFirstPage = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'page') return node;
      if (node.children && node.children.length > 0) {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      // Expecting { title, metadata: { icon, cover }, markdownText }
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
          setActivePageData(prev => ({
            ...prev,
            title: newName
          }));
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

  // The editor now only gives us markdownText to save (no JSON blocks anymore!)
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
      setActivePageData(prev => ({
        ...prev,
        title,
        metadata,
        markdownText
      }));
      // Only refresh sidebar if title actually changed
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

  if (!workspacePath) {
    return (
      <div className="welcome-container" data-tauri-drag-region>
        <div className="window-titlebar" data-tauri-drag-region>
          <span>VoidPad</span> Desktop Notes
        </div>
        <div className="welcome-card">
          <div className="welcome-logo">VoidPad</div>
          <p className="welcome-subtitle">
            A premium, completely offline, local-first Notion clone. All notes are saved on your computer in 100% standard Markdown format.
          </p>
          <button className="btn-primary" onClick={handleSelectWorkspace}>
            Select Workspace Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="window-titlebar" data-tauri-drag-region>
        <span>VoidPad</span> — {workspacePath.split(/[\\/]/).pop()}
      </div>

      <Sidebar 
        pagesTree={pagesTree}
        activePageId={activePageId}
        workspaceName={workspacePath.split(/[\\/]/).pop()}
        isDarkMode={isDarkMode}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onRenamePage={handleRenamePage}
        onDeletePage={handleDeletePage}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="editor-panel">
        {isLoadingPage ? (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading page...</span>
          </div>
        ) : activePageId && activePageData ? (
          <Editor 
            key={activePageId}
            workspacePath={workspacePath}
            pageId={activePageId}
            initialTitle={activePageData.title}
            initialMarkdown={activePageData.markdownText}
            initialMetadata={activePageData.metadata}
            onSave={handleSavePage}
          />
        ) : (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 15, padding: 40, textAlign: 'center' }}>
            <FileText size={48} color="var(--border-color)" />
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 600, marginBottom: 6 }}>No Page Selected</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 300 }}>
                Select a page from the sidebar explorer or create a new one to begin writing.
              </p>
            </div>
            <button className="btn-secondary" onClick={() => handleCreatePage(null)}>
              + Create New Page
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
              <span>Workspace Settings</span>
              <button className="sidebar-menu-btn" onClick={() => setSettingsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="settings-row">
              <label>Current Folder Path</label>
              <div className="settings-input-group">
                <input 
                  type="text" 
                  className="settings-input" 
                  value={workspacePath} 
                  readOnly 
                />
                <button className="btn-secondary" onClick={handleSelectWorkspace}>
                  Change
                </button>
              </div>
            </div>

            <div className="settings-row" style={{ marginTop: 10 }}>
              <label>Database Actions</label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 10 }}>
                Disconnecting will remove the workspace configuration folder connection. Your pure Markdown notes will remain untouched on your local disk.
              </p>
              <button 
                className="btn-secondary" 
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
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
