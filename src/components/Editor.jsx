import React, { useState, useEffect, useRef } from 'react';
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { invoke } from '@tauri-apps/api/core';
import { 
  Smile, 
  Image as ImageIcon, 
  Trash2, 
  FileDown, 
  CheckCircle,
  FileText
} from 'lucide-react';

const POPULAR_EMOJIS = [
  '📄', '🚀', '💡', '📝', '📅', '🎯', '🎨', '💻', '🏠', '🔍', 
  '📁', '⚙️', '🔑', '📊', '🏆', '❤️', '🔥', '⭐', '📌', '💬', 
  '🛠️', '🧬', '🌍', '🏔️', '🌲', '🍕', '☕', '✈️', '🎮', '📦', 
  '🔔', '📎', '🔒', '🌈', '⚡', '💎', '⏳', '🐾', '📚', '💡'
];

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(135deg, #130cb7 0%, #52e5e7 100%)',
  'linear-gradient(135deg, #09090b 0%, #27272a 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)'
];

export default function Editor({
  workspacePath,
  pageId,
  initialTitle,
  initialMarkdown,
  initialMetadata,
  onSave
}) {
  const [title, setTitle] = useState(initialTitle || '');
  const [icon, setIcon] = useState(initialMetadata?.icon || '📄');
  const [cover, setCover] = useState(initialMetadata?.cover || '');
  
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [editorLoaded, setEditorLoaded] = useState(false);

  const emojiRef = useRef(null);
  const coverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiOpen(false);
      }
      if (coverRef.current && !coverRef.current.contains(event.target)) {
        setCoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editor = useCreateBlockNote({
    uploadFile: async (file) => {
      // In Tauri, web file inputs might not provide native local absolute paths directly via `file.path`.
      // We will read the file as an array buffer, and invoke the rust backend to save it.
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        const resultStr = await invoke('save_asset_bytes', { 
          workspacePath, 
          fileName: file.name, 
          bytes 
        });
        const result = JSON.parse(resultStr);
        if (result.success) {
          // Return the Tauri custom protocol URL (e.g. asset://localhost/...)
          return result.assetUrl;
        }
      } catch (e) {
        console.error("Asset upload failed:", e);
      }
      return URL.createObjectURL(file);
    }
  });

  // Load initial markdown into editor
  useEffect(() => {
    async function loadInitialMarkdown() {
      if (initialMarkdown) {
        const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
        editor.replaceBlocks(editor.document, blocks);
      } else {
        // Clear editor if no markdown
        editor.replaceBlocks(editor.document, [{ type: "paragraph", content: "" }]);
      }
      setEditorLoaded(true);
    }
    loadInitialMarkdown();
  }, []); // Run exactly once on mount per page instance

  const updateStats = () => {
    try {
      let count = 0;
      editor.forEachBlock((block) => {
        if (block.content && Array.isArray(block.content)) {
          block.content.forEach((item) => {
            if (item.text) {
              const words = item.text.trim().split(/\s+/);
              count += words.filter(w => w !== '').length;
            }
          });
        }
        return true;
      });
      setWordCount(count);
    } catch (e) {}
  };

  const [isDirty, setIsDirty] = useState(false);
  const [markdownText, setMarkdownText] = useState(initialMarkdown || '');

  const onEditorChange = async () => {
    if (!editorLoaded) return;
    const blocks = editor.document;
    const markdown = await editor.blocksToMarkdownLossy(blocks);
    setMarkdownText(markdown);
    
    updateStats();
    setIsDirty(true);
    setSaveStatus('Unsaved Changes');
  };

  useEffect(() => {
    if (!isDirty || !editorLoaded) return;

    setSaveStatus('Saving...');
    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave(title, markdownText, { icon, cover });
        setSaveStatus('Saved');
        setIsDirty(false);
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus('Save Failed');
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, markdownText, icon, cover, isDirty, editorLoaded]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setIsDirty(true);
    setSaveStatus('Unsaved Changes');
  };

  const handleSelectIcon = (emoji) => {
    setIcon(emoji);
    setIsDirty(true);
    setSaveStatus('Unsaved Changes');
    setEmojiOpen(false);
  };

  const handleSelectCover = (coverVal) => {
    setCover(coverVal);
    setIsDirty(true);
    setSaveStatus('Unsaved Changes');
    setCoverOpen(false);
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        const resultStr = await invoke('save_asset_bytes', { 
          workspacePath, 
          fileName: file.name, 
          bytes 
        });
        const result = JSON.parse(resultStr);
        if (result.success) {
          handleSelectCover(result.assetUrl);
        }
      } catch (err) {
        console.error("Failed uploading custom cover photo:", err);
      }
    }
  };

  const handleRemoveCover = () => {
    setCover('');
    setIsDirty(true);
    setSaveStatus('Unsaved Changes');
    setCoverOpen(false);
  };

  // The custom protocol for Tauri images is typically "asset://localhost/..."
  // But we might get back whatever we resolve from rust.
  const formatCoverUrl = (url) => {
    if (!url) return '';
    // Tauri asset protocol handling
    return url;
  };

  return (
    <>
      <div className="editor-header-bar">
        <div className="editor-path-breadcrumbs">
          <span>Notes</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{title || 'Untitled'}</span>
        </div>

        <div className="editor-toolbar">
          <span className="word-count-badge" style={{ marginRight: 6 }}>
            <span style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              backgroundColor: saveStatus === 'Saved' ? '#10b981' : saveStatus === 'Saving...' ? '#f59e0b' : '#ef4444',
              display: 'inline-block',
              marginRight: 6
            }} />
            {saveStatus}
          </span>

          <span className="word-count-badge">
            <FileText size={11} style={{ marginRight: 4 }} />
            {wordCount} words
          </span>
        </div>
      </div>

      <div className="editor-scrollable">
        <div className="page-cover-container">
          {cover ? (
            <img 
              src={formatCoverUrl(cover)} 
              alt="Page Cover" 
              className="page-cover-image" 
            />
          ) : (
            <div className="page-cover-placeholder" />
          )}

          <div ref={coverRef} style={{ position: 'absolute', bottom: '16px', right: '24px' }}>
            <button className="change-cover-btn" onClick={() => setCoverOpen(prev => !prev)}>
              <ImageIcon size={12} />
              <span>Change Cover</span>
            </button>

            {coverOpen && (
              <div className="cover-picker-popover">
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Gradients
                </div>
                <div className="cover-grid">
                  {COVER_GRADIENTS.map((g, idx) => (
                    <div 
                      key={idx} 
                      className={`cover-option ${cover === g ? 'active' : ''}`}
                      style={{ background: g }}
                      onClick={() => handleSelectCover(g)}
                    />
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 12, paddingTop: 10, display: 'flex', gap: 8 }}>
                  <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: '11px' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleUploadCover} 
                    />
                    Upload Image
                  </label>

                  {cover && (
                    <button 
                      className="btn-secondary" 
                      style={{ color: '#ef4444', flex: 1, padding: '6px 0', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onClick={handleRemoveCover}
                    >
                      <Trash2 size={11} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="page-meta-wrapper">
          <div ref={emojiRef} style={{ position: 'relative', display: 'inline-block' }}>
            <div className="page-icon-container" onClick={() => setEmojiOpen(prev => !prev)}>
              {icon}
            </div>

            {emojiOpen && (
              <div className="emoji-picker-container">
                <div style={{ background: 'var(--bg-sidebar)', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', width: '260px', maxHeight: '180px', overflowY: 'auto' }}>
                  {POPULAR_EMOJIS.map((e, idx) => (
                    <div 
                      key={idx} 
                      style={{ fontSize: '20px', cursor: 'pointer', textAlign: 'center', padding: '4px', borderRadius: '4px', transition: 'background 0.2s' }}
                      onClick={() => handleSelectIcon(e)}
                      onMouseEnter={(el) => el.target.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(el) => el.target.style.backgroundColor = 'transparent'}
                    >
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            className="page-title-input"
            placeholder="Untitled"
            value={title}
            onChange={handleTitleChange}
          />
        </div>

        <div className="blocknote-editor-container">
          <BlockNoteView 
            editor={editor} 
            onChange={onEditorChange}
            theme={document.documentElement.classList.contains('dark') ? "dark" : "light"}
          />
        </div>
      </div>
    </>
  );
}
