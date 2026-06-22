import React, { useState } from 'react';
import { 
  Folder, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Settings, 
  Sun, 
  Moon, 
  FileText,
  Check,
  X
} from 'lucide-react';

export default function Sidebar({
  pagesTree,
  activePageId,
  workspaceName,
  isDarkMode,
  onSelectPage,
  onCreatePage,
  onRenamePage,
  onDeletePage,
  onToggleTheme,
  onOpenSearch,
  onOpenSettings
}) {
  const [expandedNodes, setExpandedNodes] = useState({});
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleExpand = (nodeId, e) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
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
    if (trimmed && trimmed !== '') {
      onRenamePage(nodeId, trimmed);
    }
    setEditingNodeId(null);
  };

  const renderTree = (nodes) => {
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
          >
            {/* Toggle Arrow (Only show if node has children or is a folder) */}
            <div 
              className={`tree-node-arrow ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => toggleExpand(node.id, e)}
              style={{ visibility: (hasChildren || node.type === 'folder') ? 'visible' : 'hidden' }}
            >
              <ChevronRight size={14} />
            </div>

            {/* Icon */}
            <span className="tree-node-icon">
              {node.type === 'folder' ? <Folder size={14} color="var(--accent-color)" /> : '📄'}
            </span>

            {/* Name/Edit Input */}
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="settings-input"
                  style={{ padding: '2px 6px', fontSize: '12px', height: '24px' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename(node.id, e);
                    if (e.key === 'Escape') cancelRename(e);
                  }}
                />
                <button 
                  className="tree-action-btn" 
                  onClick={(e) => submitRename(node.id, e)}
                  style={{ color: '#10b981' }}
                >
                  <Check size={12} />
                </button>
                <button 
                  className="tree-action-btn" 
                  onClick={cancelRename}
                  style={{ color: '#ef4444' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <span className="tree-node-name">{node.name}</span>
            )}

            {/* Actions Hover Panel */}
            {!isEditing && (
              <div className="tree-node-actions" onClick={e => e.stopPropagation()}>
                {/* Create sub-page button */}
                <button 
                  className="tree-action-btn" 
                  onClick={() => onCreatePage(node.id)}
                  title="Create Subpage"
                >
                  <Plus size={12} />
                </button>
                
                {/* Rename button */}
                <button 
                  className="tree-action-btn" 
                  onClick={(e) => startRename(node, e)}
                  title="Rename"
                >
                  <Edit3 size={12} />
                </button>

                {/* Delete/Trash button */}
                <button 
                  className="tree-action-btn" 
                  onClick={() => {
                    if (confirm(`Move "${node.name}" to Recycle Bin?`)) {
                      onDeletePage(node.id);
                    }
                  }}
                  title="Delete"
                  style={{ hover: { color: '#ef4444' } }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Sub-nodes Recursive Render */}
          {isExpanded && (node.children || node.type === 'folder') && (
            <div className="tree-children">
              {hasChildren ? (
                renderTree(node.children)
              ) : (
                <div style={{ padding: '6px 20px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No subpages
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="sidebar">
      {/* Search Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">V</div>
          <span>VoidPad</span>
        </div>
        <button className="sidebar-menu-btn" onClick={onOpenSearch} title="Search Notes (Ctrl+P)">
          <Search size={16} />
        </button>
      </div>

      {/* Pages Section */}
      <div className="sidebar-scrollable">
        <div className="sidebar-section-title">
          <span>Notes Explorer</span>
          <button 
            className="tree-action-btn" 
            onClick={() => onCreatePage(null)}
            title="Create Root Page"
            style={{ padding: 0 }}
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div style={{ marginTop: '8px' }}>
          {pagesTree.length > 0 ? (
            renderTree(pagesTree)
          ) : (
            <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              No notes created yet.<br/>
              Click the <Plus size={10} style={{ display: 'inline' }} /> icon above to create one!
            </div>
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="sidebar-footer">
        <div className="user-workspace-indicator">
          <span className="workspace-label">Workspace</span>
          <span className="workspace-name" title={workspaceName}>{workspaceName}</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {/* Light/Dark Toggle */}
          <button className="sidebar-menu-btn" onClick={onToggleTheme} title="Toggle Theme">
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Settings Trigger */}
          <button className="sidebar-menu-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
