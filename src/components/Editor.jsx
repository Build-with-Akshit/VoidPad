import React, { useState, useEffect, useRef } from 'react';
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { MonacoCodeBlock } from './MonacoCodeBlock';
import { CalloutBlock } from './CalloutBlock';
import { DividerBlock } from './DividerBlock';
import { ToggleBlock } from './ToggleBlock';
import { 
  SuggestionMenuController, 
  getDefaultReactSlashMenuItems,
  useCreateBlockNote 
} from "@blocknote/react";
import { filterSuggestionItems, BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { 
  Smile, 
  Image as ImageIcon, 
  Trash2, 
  FileText,
  Minus,
  ChevronRight,
  Table,
  Quote,
  ListOrdered,
  List,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Video,
  Music,
  Paperclip,
  Type
} from 'lucide-react';

import { PageLinkBlock } from './PageLinkBlock';

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    monacoCode: MonacoCodeBlock,
    callout: CalloutBlock,
    divider: DividerBlock,
    toggle: ToggleBlock,
    pageLink: PageLinkBlock,
  },
});

// === Slash Menu Items — Notion-complete ===

const insertParagraph = (editor) => ({
  title: "Text",
  onItemClick: () => { editor.insertBlocks([{ type: "paragraph" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["text", "paragraph", "p"],
  group: "Basic blocks",
  icon: <Type size={18} />,
  subtext: "Just start writing with plain text.",
});

const insertHeading1 = (editor) => ({
  title: "Heading 1",
  onItemClick: () => { editor.insertBlocks([{ type: "heading", props: { level: 1 } }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["h1", "heading1", "title"],
  group: "Headings",
  icon: <Heading1 size={18} />,
  subtext: "Big section heading.",
});

const insertHeading2 = (editor) => ({
  title: "Heading 2",
  onItemClick: () => { editor.insertBlocks([{ type: "heading", props: { level: 2 } }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["h2", "heading2", "subtitle"],
  group: "Headings",
  icon: <Heading2 size={18} />,
  subtext: "Medium section heading.",
});

const insertHeading3 = (editor) => ({
  title: "Heading 3",
  onItemClick: () => { editor.insertBlocks([{ type: "heading", props: { level: 3 } }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["h3", "heading3"],
  group: "Headings",
  icon: <Heading3 size={18} />,
  subtext: "Small section heading.",
});

const insertBulletList = (editor) => ({
  title: "Bullet List",
  onItemClick: () => { editor.insertBlocks([{ type: "bulletListItem" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["ul", "bullet", "list", "unordered"],
  group: "Basic blocks",
  icon: <List size={18} />,
  subtext: "Create a simple bulleted list.",
});

const insertNumberedList = (editor) => ({
  title: "Numbered List",
  onItemClick: () => { editor.insertBlocks([{ type: "numberedListItem" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["ol", "numbered", "ordered"],
  group: "Basic blocks",
  icon: <ListOrdered size={18} />,
  subtext: "Create a numbered list.",
});

const insertCheckList = (editor) => ({
  title: "To-do List",
  onItemClick: () => { editor.insertBlocks([{ type: "checkListItem" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["todo", "check", "checkbox", "task"],
  group: "Basic blocks",
  icon: <CheckSquare size={18} />,
  subtext: "Track tasks with a to-do list.",
});

const insertToggleItem = (editor) => ({
  title: "Toggle List",
  onItemClick: () => { editor.insertBlocks([{ type: "toggle" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["toggle", "expand", "collapse", "dropdown"],
  group: "Basic blocks",
  icon: <ChevronRight size={18} />,
  subtext: "Toggles can hide and show content inside.",
});

const insertQuoteItem = (editor) => ({
  title: "Quote",
  onItemClick: () => { editor.insertBlocks([{ type: "quote" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["quote", "blockquote", ">"],
  group: "Basic blocks",
  icon: <Quote size={18} />,
  subtext: "Capture a quote.",
});

const insertDividerItem = (editor) => ({
  title: "Divider",
  onItemClick: () => { editor.insertBlocks([{ type: "divider" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["divider", "line", "hr", "---"],
  group: "Basic blocks",
  icon: <Minus size={18} />,
  subtext: "Visually divide blocks.",
});

const insertCalloutItem = (editor) => ({
  title: "Callout",
  onItemClick: () => { editor.insertBlocks([{ type: "callout" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["callout", "alert", "info", "warning", "tip"],
  group: "Advanced blocks",
  icon: <Smile size={18} />,
  subtext: "Make writing stand out.",
});

const insertTableItem = (editor) => ({
  title: "Table",
  onItemClick: () => {
    editor.insertBlocks(
      [{ type: "table", content: { type: "tableContent", rows: [
        { cells: [["Column 1"], ["Column 2"], ["Column 3"]] },
        { cells: [[""], [""], [""]] },
        { cells: [[""], [""], [""]] },
      ]}}],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  aliases: ["table", "grid", "spreadsheet"],
  group: "Advanced blocks",
  icon: <Table size={18} />,
  subtext: "Add a simple table.",
});

const insertMonacoCodeItem = (editor) => ({
  title: "Code Block",
  onItemClick: () => { editor.insertBlocks([{ type: "monacoCode" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["code", "monaco", "snippet", "script"],
  group: "Advanced blocks",
  icon: <FileText size={18} />,
  subtext: "VS Code powered code editor.",
});

const insertImageItem = (editor) => ({
  title: "Image",
  onItemClick: () => { editor.insertBlocks([{ type: "image" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["image", "img", "picture", "photo"],
  group: "Media",
  icon: <ImageIcon size={18} />,
  subtext: "Upload or embed an image.",
});

const insertVideoItem = (editor) => ({
  title: "Video",
  onItemClick: () => { editor.insertBlocks([{ type: "video" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["video", "mp4", "clip"],
  group: "Media",
  icon: <Video size={18} />,
  subtext: "Upload or embed a video.",
});

const insertAudioItem = (editor) => ({
  title: "Audio",
  onItemClick: () => { editor.insertBlocks([{ type: "audio" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["audio", "sound", "music", "mp3"],
  group: "Media",
  icon: <Music size={18} />,
  subtext: "Upload or embed audio.",
});

const insertFileItem = (editor) => ({
  title: "File",
  onItemClick: () => { editor.insertBlocks([{ type: "file" }], editor.getTextCursorPosition().block, "after"); },
  aliases: ["file", "attachment", "upload"],
  group: "Media",
  icon: <Paperclip size={18} />,
  subtext: "Upload or embed a file.",
});

const insertPageLinkItem = (editor) => ({
  title: "Page",
  onItemClick: async () => { 
    try {
      const resStr = await invoke('create_note', { parentId: null });
      const res = JSON.parse(resStr);
      if (res.success && res.pageId) {
        editor.insertBlocks(
          [{ type: "pageLink", props: { pageId: res.pageId, pageName: "Untitled" } }], 
          editor.getTextCursorPosition().block, 
          "after"
        );
        window.dispatchEvent(new CustomEvent('refresh-sidebar-notes'));
      }
    } catch (e) {
      console.error(e);
    }
  },
  aliases: ["page", "link", "subpage"],
  group: "Advanced blocks",
  icon: <FileText size={18} />,
  subtext: "Embed a sub-page inside this page.",
});

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
  sidebarCollapsed,
  onTitleChange,
  onRenameActivePage
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
  const lastLoadedPageId = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) setEmojiOpen(false);
      if (coverRef.current && !coverRef.current.contains(event.target)) setCoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editor = useCreateBlockNote({
    schema,
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
      if (pageId === lastLoadedPageId.current) return;

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
        lastLoadedPageId.current = pageId;
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

        let newActivePageId = pageId;
        const currentFileName = pageId.split('/').pop();
        const cleanedTitle = title.trim();

        if (cleanedTitle && cleanedTitle !== currentFileName) {
           const resultStr = await invoke('rename_note', { pageId, newName: cleanedTitle });
           const result = JSON.parse(resultStr);
           if (result.success && result.newPageId) {
             newActivePageId = result.newPageId;
             lastLoadedPageId.current = newActivePageId;
             if (onRenameActivePage) {
               onRenameActivePage(pageId, newActivePageId);
             }
           }
        }

        setSaveStatus('Saved');
        setIsDirty(false);
        if (onTitleChange) {
          onTitleChange(newActivePageId, title);
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

  // Build breadcrumbs from the page path
  const breadcrumbParts = pageId ? pageId.split('/') : [];

  return (
    <>
      {/* Top bar */}
      <div className={`editor-topbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-tauri-drag-region>
        <div className="editor-breadcrumbs no-drag">
          {breadcrumbParts.map((part, i) => {
            const isLast = i === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="separator">/</span>}
                <span className={isLast ? 'active-crumb' : ''}>
                  {isLast ? (title || 'Untitled') : part}
                </span>
              </React.Fragment>
            );
          })}
        </div>
        <div className="editor-status no-drag">
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
            slashMenu={false}
            formattingToolbar={true}
          >
            <SuggestionMenuController
              triggerCharacter={"/"}
              getItems={async (query) =>
                filterSuggestionItems(
                  [
                    insertParagraph(editor),
                    insertHeading1(editor),
                    insertHeading2(editor),
                    insertHeading3(editor),
                    insertBulletList(editor),
                    insertNumberedList(editor),
                    insertCheckList(editor),
                    insertToggleItem(editor),
                    insertQuoteItem(editor),
                    insertDividerItem(editor),
                    insertCalloutItem(editor),
                    insertTableItem(editor),
                    insertMonacoCodeItem(editor),
                    insertImageItem(editor),
                    insertVideoItem(editor),
                    insertAudioItem(editor),
                    insertFileItem(editor),
                    insertPageLinkItem(editor),
                  ],
                  query
                )
              }
            />
          </BlockNoteView>
        </div>
      </div>
    </>
  );
}
