import React from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { FileText } from 'lucide-react';

export const PageLinkBlock = createReactBlockSpec(
  {
    type: "pageLink",
    propSchema: {
      pageId: {
        default: "",
      },
      pageName: {
        default: "Untitled Page",
      }
    },
    content: "none",
  },
  {
    render: (props) => {
      const handleNavigate = () => {
        if (props.block.props.pageId) {
          window.dispatchEvent(new CustomEvent('navigate-page', { detail: props.block.props.pageId }));
        }
      };

      return (
        <div 
          className="page-link-block" 
          onClick={handleNavigate}
          contentEditable={false}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 4px',
            borderRadius: '4px',
            cursor: 'pointer',
            userSelect: 'none',
            color: 'var(--text-main)',
            borderBottom: '1px solid var(--border-color)',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <FileText size={16} color="var(--text-muted)" strokeWidth={2} />
          <span style={{ 
            fontWeight: 500, 
            fontSize: '1em',
            fontFamily: 'inherit',
            lineHeight: 1
          }}>
            {props.block.props.pageName || "Untitled"}
          </span>
        </div>
      );
    },
  }
);
