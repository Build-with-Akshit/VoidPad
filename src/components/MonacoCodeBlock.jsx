import React, { useState, useEffect } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import Editor from '@monaco-editor/react';
import { Copy, Check } from 'lucide-react';

export const MonacoCodeBlock = createReactBlockSpec(
  {
    type: "monacoCode",
    propSchema: {
      textAlignment: { default: "left" },
      textColor: { default: "default" },
      language: { default: "javascript" },
      code: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const codeText = props.block.props.code || "";
      const lineCount = (codeText.match(/\n/g) || []).length + 1;
      const editorHeight = Math.max(80, Math.min(lineCount * 21 + 20, 600)) + "px";
      
      const [copied, setCopied] = useState(false);
      const [isDark, setIsDark] = useState(true);

      // Detect theme changes to sync Monaco editor theme
      useEffect(() => {
        const observer = new MutationObserver(() => {
          setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        setIsDark(document.documentElement.classList.contains('dark'));
        return () => observer.disconnect();
      }, []);

      const handleCopy = () => {
        navigator.clipboard.writeText(codeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };

      return (
        <div 
          contentEditable={false} 
          style={{ 
            width: '100%', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            overflow: 'hidden', 
            margin: '8px 0',
            backgroundColor: isDark ? '#1e1e1e' : '#f7f7f5',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Notion-style minimal header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '6px 12px', 
            borderBottom: '1px solid var(--border-color)', 
            backgroundColor: isDark ? '#2d2d2d' : '#f0f0f0',
            alignItems: 'center'
          }}>
            <select 
              value={props.block.props.language}
              onChange={(e) => props.editor.updateBlock(props.block, { type: "monacoCode", props: { ...props.block.props, language: e.target.value } })}
              style={{ 
                backgroundColor: 'transparent', 
                color: 'var(--text-secondary)', 
                border: 'none', 
                padding: '4px 0', 
                outline: 'none',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="rust">Rust</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
              <option value="dart">Dart</option>
              <option value="sql">SQL</option>
              <option value="markdown">Markdown</option>
              <option value="shell">Shell</option>
            </select>
            
            <button 
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? 'var(--green)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                transition: 'color 0.2s ease'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          
          <div style={{ padding: '12px 0', height: editorHeight, minHeight: '80px' }}>
            <Editor
              height="100%"
              language={props.block.props.language}
              value={codeText}
              theme={isDark ? "vs-dark" : "light"}
              onChange={(value) => {
                 props.editor.updateBlock(props.block, { type: "monacoCode", props: { ...props.block.props, code: value || "" } });
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                wrappingIndent: "indent",
                automaticLayout: true,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                tabSize: 2,
                formatOnType: true,
                padding: { top: 8, bottom: 8 },
                lineNumbersMinChars: 3,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                renderLineHighlight: "none"
              }}
            />
          </div>
        </div>
      );
    }
  }
);
