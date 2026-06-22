import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText } from 'lucide-react';

export default function SearchModal({ pagesTree, onSelectPage, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef(null);

  // Helper to flatten note hierarchy for easy searching
  const flattenTree = (nodes, parentPath = '') => {
    let list = [];
    nodes.forEach(node => {
      const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
      if (node.type === 'page') {
        list.push({
          id: node.id,
          name: node.name,
          path: currentPath
        });
      }
      if (node.children && node.children.length > 0) {
        list = list.concat(flattenTree(node.children, currentPath));
      }
    });
    return list;
  };

  const flatPages = flattenTree(pagesTree);

  // Filter list when search query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults(flatPages.slice(0, 5)); // Show top 5 pages by default
      setSelectedIndex(0);
      return;
    }

    const filtered = flatPages.filter(page => 
      page.name.toLowerCase().includes(query.toLowerCase()) ||
      page.path.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setSelectedIndex(0);
  }, [query, pagesTree]);

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectPage(results[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onSelectPage, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        ref={modalRef} 
        className="search-modal" 
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input bar */}
        <div className="search-input-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search all notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className="search-results">
          {results.length > 0 ? (
            results.map((page, index) => (
              <div 
                key={page.id} 
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => onSelectPage(page.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <FileText size={16} color="var(--text-muted)" />
                <span className="search-result-title">{page.name}</span>
                <span className="search-result-path">{page.path}</span>
              </div>
            ))
          ) : (
            <div className="search-no-results">
              No notes match your search query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
