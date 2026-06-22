import React from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { ChevronRight, ChevronDown } from 'lucide-react';

export const ToggleBlock = createReactBlockSpec(
  {
    type: "toggle",
    propSchema: {
      isOpen: { default: "false" }
    },
    content: "inline",
  },
  {
    render: (props) => {
      const isOpen = props.block.props.isOpen === "true";

      const toggleOpen = (e) => {
        e.preventDefault();
        e.stopPropagation();
        props.editor.updateBlock(props.block, {
          type: "toggle",
          props: { ...props.block.props, isOpen: isOpen ? "false" : "true" }
        });
      };

      return (
        <div 
          className={`toggle-block-container ${isOpen ? 'toggle-open' : 'toggle-closed'}`}
          style={{ 
            display: "flex", 
            alignItems: "flex-start",
          }}
        >
          <div 
            contentEditable={false} 
            onClick={toggleOpen}
            title="Toggle children"
            style={{
              cursor: "pointer",
              padding: "4px",
              marginRight: "2px",
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              userSelect: "none",
              color: "var(--text-muted)",
              transition: "background 0.1s ease, color 0.1s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          <div 
            className="inline-content" 
            style={{ 
              flex: 1, 
              minWidth: 0, 
              outline: "none", 
              lineHeight: "1.6" 
            }} 
            ref={props.contentRef} 
          />
        </div>
      );
    }
  }
);
