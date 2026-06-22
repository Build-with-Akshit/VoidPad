import React from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import Editor from '@monaco-editor/react';

export const MonacoCodeBlock = createReactBlockSpec(
  {
    type: "monacoCode",
    propSchema: {
      textAlignment: { default: "left" },
      textColor: { default: "default" },
      language: { default: "python" },
      code: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const codeText = props.block.props.code || "";
      // Dynamic height calculation based on lines
      const lineCount = (codeText.match(/\n/g) || []).length + 1;
    // Calculate height (approx 19px per line + padding), bounded between 100px and 600px
    const editorHeight = Math.max(100, Math.min(lineCount * 19 + 20, 600)) + "px";

    return (
      <div 
        contentEditable={false} // Prevent Prosemirror from capturing focus events
        style={{ 
          width: '100%', 
          border: '1px solid #333', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          margin: '12px 0',
          backgroundColor: '#1e1e1e',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #333', backgroundColor: '#2d2d2d' }}>
          <select 
            value={props.block.props.language}
            onChange={(e) => props.editor.updateBlock(props.block, { type: "monacoCode", props: { ...props.block.props, language: e.target.value } })}
            style={{ 
              backgroundColor: '#1e1e1e', 
              color: '#fff', 
              border: '1px solid #555', 
              borderRadius: '4px', 
              padding: '4px 8px', 
              outline: 'none',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="python">Python</option>
            <option value="dart">Dart</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="rust">Rust</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
          </select>
          <span style={{ color: '#888', fontSize: '12px', alignSelf: 'center', userSelect: 'none' }}>VS Code offline engine</span>
        </div>
        <div style={{ padding: '8px 0', height: editorHeight, minHeight: '100px' }}>
          <Editor
            height="100%"
            language={props.block.props.language}
            value={codeText}
            theme="vs-dark"
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
              tabSize: 2,
              formatOnType: true,
              suggestOnTriggerCharacters: true
            }}
          />
        </div>
      </div>
    );
  }
});
