import React from 'react';
import { createReactBlockSpec } from "@blocknote/react";

export const DividerBlock = createReactBlockSpec(
  {
    type: "divider",
    propSchema: {},
    content: "none",
  },
  {
    render: (props) => {
      return (
        <div style={{ padding: "12px 0", width: "100%" }} contentEditable={false}>
          <hr 
            style={{ 
              border: "none", 
              borderTop: "1px solid var(--border-color)", 
              margin: 0,
              opacity: 0.7 
            }} 
          />
        </div>
      );
    },
  }
);
