import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Settings, 
  Sun, 
  Moon, 
  Check,
  X,
  ChevronsLeft
} from 'lucide-react';

export default function Sidebar({
  activePageId,
  workspaceName,
  isDarkMode,
  collapsed,
  onSelectPage,
  onRenamePage,
  onDeletePage,
  onToggleTheme,
  onOpenSearch,
  onOpenSettings,
  onToggleCollapse,
  onTreeUpdate
}) {
  const [pagesTree, setPagesTree] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const refreshNotes = async () => {
    try {
      const treeJson = await invoke('get_all_notes');
      const tree = JSON.parse(treeJson);
      setPagesTree(tree);
      if (onTreeUpdate) onTreeUpdate(tree);
    } catch (error) {
      console.error('Failed to get notes:', error);
    }
  };

  useEffect(() => {
    refreshNotes();

    const handleRefresh = () => refreshNotes();
    const handleCreate = () => handleCreatePage(null);

    window.addEventListener('refresh-sidebar-notes', handleRefresh);
    window.addEventListener('create-sidebar-note', handleCreate);

    return () => {
      window.removeEventListener('refresh-sidebar-notes', handleRefresh);
      window.removeEventListener('create-sidebar-note', handleCreate);
    };
  }, []);

  const handleCreatePage = async (parentId) => {
    try {
      const resultStr = await invoke('create_note', { parentId, name: 'Untitled' });
      const result = JSON.parse(resultStr);
      if (result.success) {
        await refreshNotes();
        onSelectPage(result.pageId);
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const handleRenamePage = async (pageId, newName) => {
    try {
      const resultStr = await invoke('rename_note', { pageId, newName });
      const result = JSON.parse(resultStr);
      if (result.success) {
        await refreshNotes();
        onRenamePage(pageId, newName, result.newPageId);
      }
    } catch (error) {
      console.error('Failed to rename page:', error);
    }
  };

  const handleDeletePage = async (pageId) => {
    try {
      const resultStr = await invoke('delete_note', { pageId });
      const result = JSON.parse(resultStr);
      if (result.success) {
        await refreshNotes();
        onDeletePage(pageId);
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const toggleExpand = (nodeId, e) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const startRename = (node, e) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setRenameValue(node.name);
  };

  const cancelRename = (e) => {
    if (e) e.stopPropagation();
    setEditingNodeId(null);
    setRenameValue('');
  };

  const submitRename = (nodeId, e) => {
    e.stopPropagation();
    const trimmed = renameValue.trim();
    if (trimmed) handleRenamePage(nodeId, trimmed);
    setEditingNodeId(null);
  };

  const renderTree = (nodes, depth = 0) => {
    return nodes.map(node => {
      const isExpanded = !!expandedNodes[node.id];
      const isActive = activePageId === node.id;
      const isEditing = editingNodeId === node.id;
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.id} className="tree-node">
          <div 
            className={`tree-node-content ${isActive ? 'active' : ''}`}
            onClick={() => node.type === 'page' && onSelectPage(node.id)}
            onDoubleClick={(e) => startRename(node, e)}
            style={{ paddingLeft: `${8 + depth * 0}px` }}
          >
            <div 
              className={`tree-node-arrow ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => toggleExpand(node.id, e)}
              style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
            >
              <ChevronRight size={12} />
            </div>

            <span className="tree-node-icon">
              {node.type === 'folder' ? '📁' : '📄'}
            </span>

            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="settings-input"
                  style={{ padding: '2px 6px', fontSize: '13px', height: '22px' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename(node.id, e);
                    if (e.key === 'Escape') cancelRename(e);
                  }}
                  onBlur={() => cancelRename()}
                />
                <button className="tree-action-btn" onClick={(e) => submitRename(node.id, e)} style={{ color: 'var(--green)' }}>
                  <Check size={11} />
                </button>
              </div>
            ) : (
              <span className="tree-node-name">{node.name}</span>
            )}

            {!isEditing && (
              <div className="tree-node-actions" onClick={e => e.stopPropagation()}>
                <button className="tree-action-btn" onClick={() => handleCreatePage(node.id)} title="Add sub-page">
                  <Plus size={12} />
                </button>
                <button className="tree-action-btn" onClick={(e) => startRename(node, e)} title="Rename">
                  <Edit3 size={11} />
                </button>
                <button 
                  className="tree-action-btn" 
                  onClick={() => { if (confirm(`Move "${node.name}" to Recycle Bin?`)) handleDeletePage(node.id); }}
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>

          {isExpanded && hasChildren && (
            <div className="tree-children">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo" onClick={onOpenSettings}>
          <div className="sidebar-logo-icon">V</div>
          <span>{workspaceName || 'VoidPad'}</span>
        </div>
        <div className="sidebar-actions">
          <button className="sidebar-icon-btn" onClick={onOpenSearch} title="Search (Ctrl+P)">
            <Search size={15} />
          </button>
          <button className="sidebar-icon-btn" onClick={onToggleCollapse} title="Collapse sidebar (Ctrl+\\)">
            <ChevronsLeft size={15} />
          </button>
        </div>
      </div>

      <div className="sidebar-scrollable">
        {/* Notion-style search bar */}
        <button 
          className="sidebar-search-bar" 
          onClick={onOpenSearch}
          title="Search (Ctrl+P)"
        >
          <Search size={14} />
          <span>Search</span>
          <span className="sidebar-search-shortcut">Ctrl+P</span>
        </button>

        <div className="sidebar-section-title">
          <span>Pages</span>
          <button className="tree-action-btn" onClick={() => handleCreatePage(null)} title="New page" style={{ padding: 0 }}>
            <Plus size={14} />
          </button>
        </div>
        
        <div>
          {pagesTree.length > 0 ? (
            renderTree(pagesTree)
          ) : (
            <div style={{ padding: '24px 8px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              No pages yet
            </div>
          )}
        </div>
      </div>

      {/* New Page button at bottom */}
      <button className="sidebar-new-page-btn" onClick={() => handleCreatePage(null)}>
        <Plus size={16} />
        New page
      </button>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="sidebar-icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button className="sidebar-icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
