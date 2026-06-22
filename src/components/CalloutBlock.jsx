import React from 'react';
import { createReactBlockSpec } from "@blocknote/react";

const EMOJIS = ["💡", "⚠️", "ℹ️", "🔥", "📌", "✅", "🎉", "⭐", "📝"];

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      emoji: { default: "💡" },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const handleEmojiClick = (e) => {
        // Prevent default behavior which might mess with editor focus
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = EMOJIS.indexOf(props.block.props.emoji);
        const nextIndex = (currentIndex + 1) % EMOJIS.length;
        props.editor.updateBlock(props.block, {
          type: "callout",
          props: { ...props.block.props, emoji: EMOJIS[nextIndex] }
        });
      };

      return (
        <div 
          className="callout-block-container" 
          style={{
            display: "flex",
            padding: "16px 16px 16px 12px",
            borderRadius: "4px",
            backgroundColor: "var(--bg-active)",
            margin: "4px 0",
            alignItems: "flex-start",
            gap: "12px",
            border: "1px solid transparent",
            transition: "all 0.2s ease"
          }}
        >
          <div 
            onClick={handleEmojiClick}
            contentEditable={false}
            title="Click to change icon"
            style={{ 
              fontSize: "20px", 
              cursor: "pointer", 
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              transition: "background 0.15s ease",
              flexShrink: 0,
              marginTop: "-2px"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {props.block.props.emoji}
          </div>
          <div 
            className="inline-content" 
            style={{ 
              flex: 1, 
              minWidth: 0, 
              outline: "none", 
              lineHeight: "1.6",
              color: "var(--text-main)"
            }} 
            ref={props.contentRef} 
          />
        </div>
      );
    },
  }
);
