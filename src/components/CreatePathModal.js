import React, { useState } from 'react';
import './CreatePathModal.css';

const CreatePathModal = ({ isOpen, onClose, onCreate }) => {
  const [pathName, setPathName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pathName.trim()) {
      setIsLoading(true);
      await onCreate(pathName.trim());
      setIsLoading(false);
      setPathName('');
      onClose();
    }
  };

  const handleClose = () => {
    setPathName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Path</h2>
          <button className="close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pathName">Path Name</label>
            <input
              id="pathName"
              type="text"
              value={pathName}
              onChange={(e) => setPathName(e.target.value)}
              placeholder="Enter path name (e.g., Ariel's Journey)"
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-cancel" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-create"
              disabled={!pathName.trim() || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Path'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePathModal;
