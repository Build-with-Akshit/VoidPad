import React, { useState, useEffect, useRef } from 'react';
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { 
  Smile, 
  Image as ImageIcon, 
  Trash2, 
  FileText
} from 'lucide-react';

const POPULAR_EMOJIS = [
  '📄', '🚀', '💡', '📝', '📅', '🎯', '🎨', '💻', '🏠', '🔍', 
  '📁', '⚙️', '🔑', '📊', '🏆', '❤️', '🔥', '⭐', '📌', '💬', 
  '🛠️', '🧬', '🌍', '🏔️', '🌲', '🍕', '☕', '✈️', '🎮', '📦', 
  '🔔', '📎', '🔒', '🌈', '⚡', '💎', '⏳', '🐾', '📚', '🎵'
];

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
  'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
];

export default function Editor({
  pageId,
  isDarkMode,
  onTitleChange
}) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [cover, setCover] = useState('');
  
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [markdownText, setMarkdownText] = useState('');

  const emojiRef = useRef(null);
  const coverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) setEmojiOpen(false);
      if (coverRef.current && !coverRef.current.contains(event.target)) setCoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editor = useCreateBlockNote({
    uploadFile: async (file) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        const resultStr = await invoke('save_asset_bytes', { fileName: file.name, bytes });
        const result = JSON.parse(resultStr);
        if (result.success) return convertFileSrc(result.assetUrl);
      } catch (e) {
        console.error("Asset upload failed:", e);
      }
      return URL.createObjectURL(file);
    }
  });

  // Load initial note content when pageId changes
  useEffect(() => {
    async function loadNote() {
      if (!pageId) return;
      setEditorLoaded(false);
      setSaveStatus('Loading...');
      try {
        const dataStr = await invoke('read_note', { pageId });
        const data = JSON.parse(dataStr);
        setTitle(data.title || '');
        setIcon(data.metadata?.icon || '');
        setCover(data.metadata?.cover || '');
        setMarkdownText(data.markdownText || '');
        
        if (data.markdownText) {
          const blocks = await editor.tryParseMarkdownToBlocks(data.markdownText);
          editor.replaceBlocks(editor.document, blocks);
        } else {
          editor.replaceBlocks(editor.document, [{ type: "paragraph", content: "" }]);
        }
        
        setSaveStatus('Saved');
        setIsDirty(false);
      } catch (e) {
        console.error("Error loading note:", e);
        setSaveStatus('Error');
      } finally {
        setEditorLoaded(true);
      }
    }
    loadNote();
  }, [pageId]);

  const updateStats = () => {
    try {
      let count = 0;
      editor.forEachBlock((block) => {
        if (block.content && Array.isArray(block.content)) {
          block.content.forEach((item) => {
            if (item.text) {
              count += item.text.trim().split(/\s+/).filter(w => w !== '').length;
            }
          });
        }
        return true;
      });
      setWordCount(count);
    } catch (e) {}
  };

  const onEditorChange = async () => {
    if (!editorLoaded) return;
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    setMarkdownText(markdown);
    updateStats();
    setIsDirty(true);
    setSaveStatus('Editing');
  };

  // Auto-save with debounce
  useEffect(() => {
    if (!isDirty || !editorLoaded || !pageId) return;
    setSaveStatus('Saving...');
    const timer = setTimeout(async () => {
      try {
        await invoke('save_note', {
          pageId,
          title,
          markdownText,
          metadata: { icon, cover }
        });
        setSaveStatus('Saved');
        setIsDirty(false);
        if (onTitleChange) {
          onTitleChange(pageId, title);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus('Error');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [title, markdownText, icon, cover, isDirty, editorLoaded, pageId]);

  const markDirty = () => { setIsDirty(true); setSaveStatus('Editing'); };

  const handleTitleChange = (e) => { setTitle(e.target.value); markDirty(); };

  const handleSelectIcon = (emoji) => { setIcon(emoji); markDirty(); setEmojiOpen(false); };
  const handleRemoveIcon = () => { setIcon(''); markDirty(); setEmojiOpen(false); };

  const handleSelectCover = (val) => { setCover(val); markDirty(); setCoverOpen(false); };
  const handleRemoveCover = () => { setCover(''); markDirty(); setCoverOpen(false); };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      const resultStr = await invoke('save_asset_bytes', { fileName: file.name, bytes });
      const result = JSON.parse(resultStr);
      if (result.success) handleSelectCover(result.assetUrl);
    } catch (err) {
      console.error("Cover upload failed:", err);
    }
  };

  // Determine if cover is a CSS gradient or an image URL
  const isGradient = cover && cover.startsWith('linear-gradient');

  const resolveAssetSrc = (src) => {
    if (!src) return '';
    if (src.startsWith('linear-gradient') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    return convertFileSrc(src);
  };

  return (
    <>
      {/* Top bar */}
      <div className="editor-topbar">
        <div className="editor-breadcrumbs">
          <span>Notes</span>
          <span>/</span>
          <span className="active-crumb">{title || 'Untitled'}</span>
        </div>
        <div className="editor-status">
          <div className="status-badge">
            <span className={`status-dot ${saveStatus === 'Saved' ? 'saved' : saveStatus === 'Saving...' ? 'saving' : 'error'}`} />
            {saveStatus}
          </div>
          <div className="status-badge">
            <FileText size={10} />
            {wordCount} words
          </div>
        </div>
      </div>

      <div className="editor-scrollable">
        {/* Cover Section */}
        <div className="page-cover-container" style={{ height: cover ? 200 : 0, transition: 'height 0.25s ease' }}>
          {cover && (
            isGradient ? (
              <div className="page-cover-gradient" style={{ background: cover }} />
            ) : (
              <img src={resolveAssetSrc(cover)} alt="Cover" className="page-cover-image" />
            )
          )}
          {cover && (
            <div className="cover-hover-controls" ref={coverRef}>
              <button className="cover-control-btn" onClick={() => setCoverOpen(prev => !prev)}>
                <ImageIcon size={11} /> Change cover
              </button>
              <button className="cover-control-btn" onClick={handleRemoveCover}>
                <Trash2 size={11} /> Remove
              </button>
              {coverOpen && (
                <div className="cover-picker-popover" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 8 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Gradients
                  </div>
                  <div className="cover-grid">
                    {COVER_GRADIENTS.map((g, idx) => (
                      <div key={idx} className={`cover-option ${cover === g ? 'active' : ''}`} style={{ background: g }} onClick={() => handleSelectCover(g)} />
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 10, paddingTop: 8 }}>
                    <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px', fontSize: '11px', cursor: 'pointer', width: '100%' }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadCover} />
                      Upload image
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Page Meta: Icon, Title, Hover Actions */}
        <div className="page-meta-wrapper">
          {/* Icon */}
          {icon && (
            <div ref={emojiRef} style={{ position: 'relative', display: 'inline-block' }}>
              <div className="page-icon-container" onClick={() => setEmojiOpen(prev => !prev)}>
                {icon}
              </div>
              {emojiOpen && (
                <div className="emoji-picker-container">
                  <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, width: 260, maxHeight: 180, overflowY: 'auto' }}>
                    {POPULAR_EMOJIS.map((e, idx) => (
                      <div key={idx} style={{ fontSize: 20, cursor: 'pointer', textAlign: 'center', padding: 4, borderRadius: 4, transition: 'background 0.1s' }}
                        onClick={() => handleSelectIcon(e)}
                        onMouseEnter={(el) => el.target.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={(el) => el.target.style.backgroundColor = 'transparent'}
                      >{e}</div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 10px' }}>
                    <button className="meta-action-btn" onClick={handleRemoveIcon} style={{ color: 'var(--red)', width: '100%', justifyContent: 'center' }}>
                      <Trash2 size={12} /> Remove icon
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notion-style hover actions: Add icon / Add cover */}
          <div className="page-meta-hover-actions">
            {!icon && (
              <button className="meta-action-btn" onClick={() => { setIcon('📄'); markDirty(); }}>
                <Smile size={14} /> Add icon
              </button>
            )}
            {!cover && (
              <button className="meta-action-btn" onClick={() => setCoverOpen(true)}>
                <ImageIcon size={14} /> Add cover
              </button>
            )}
          </div>

          {/* Cover picker when no cover yet */}
          {!cover && coverOpen && (
            <div ref={coverRef} style={{ position: 'relative', display: 'inline-block' }}>
              <div className="cover-picker-popover" style={{ position: 'absolute', top: 0, left: 0, zIndex: 100 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Gradients
                </div>
                <div className="cover-grid">
                  {COVER_GRADIENTS.map((g, idx) => (
                    <div key={idx} className="cover-option" style={{ background: g }} onClick={() => handleSelectCover(g)} />
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 10, paddingTop: 8 }}>
                  <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px', fontSize: '11px', cursor: 'pointer', width: '100%' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadCover} />
                    Upload image
                  </label>
                </div>
              </div>
            </div>
          )}

          <input
            type="text"
            className="page-title-input"
            placeholder="Untitled"
            value={title}
            onChange={handleTitleChange}
          />
        </div>

        {/* BlockNote Editor */}
        <div className="blocknote-editor-container">
          <BlockNoteView 
            editor={editor} 
            onChange={onEditorChange}
            theme={isDarkMode ? "dark" : "light"}
            sideMenu={true}
            slashMenu={true}
            formattingToolbar={true}
          />
        </div>
      </div>
    </>
  );
}
