import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ paths, selectedPath, onSelectPath, onRenamePath, onDeletePath }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (path) => {
    setEditingId(path._id);
    setEditName(path.name);
  };

  const handleSaveEdit = async (pathId) => {
    if (editName.trim()) {
      await onRenamePath(pathId, editName.trim());
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (pathId) => {
    if (window.confirm('Are you sure you want to delete this path?')) {
      await onDeletePath(pathId);
    }
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Turtle Paths</h2>
          <button 
            className="toggle-btn" 
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isOpen ? '→' : '←'}
          </button>
        </div>
        
        {isOpen && (
          <div className="paths-list">
            {paths.length === 0 ? (
              <div className="empty-state">
                <p>No paths yet. Create one to get started!</p>
              </div>
            ) : (
              paths.map((path) => (
                <div
                  key={path._id}
                  className={`path-item ${selectedPath?._id === path._id ? 'selected' : ''}`}
                  onClick={() => onSelectPath(path)}
                >
                  {editingId === path._id ? (
                    <div className="edit-mode" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(path._id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button onClick={() => handleSaveEdit(path._id)} className="save-btn">
                          ✓
                        </button>
                        <button onClick={handleCancelEdit} className="cancel-btn">
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="path-info">
                        <span className="path-name">{path.name}</span>
                        <span className="location-count">
                          {path.locations?.length || 0} locations
                        </span>
                      </div>
                      <div className="path-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEdit(path)}
                          className="action-btn edit"
                          title="Rename path"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(path._id)}
                          className="action-btn delete"
                          title="Delete path"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {!isOpen && (
        <button 
          className="sidebar-toggle-floating"
          onClick={() => setIsOpen(true)}
          title="Open sidebar"
        >
          ☰
        </button>
      )}
    </>
  );
};

export default Sidebar;
