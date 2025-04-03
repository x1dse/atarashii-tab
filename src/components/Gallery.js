import React, { useContext, useState, useCallback, useRef, useMemo } from 'react';
import { FaTimes, FaFileDownload, FaFileUpload } from 'react-icons/fa';
import AppContext from '../contexts/AppContext';
import GalleryCard from './GalleryCard';
import { toast } from 'react-toastify';
import './styles/Gallery.scss';

const Gallery = ({ isOpen, onClose }) => {
  const { galleryItems, handleUseFromGallery, handleRemoveFromGallery, handleImportGallery } = useContext(AppContext);
  const [filter, setFilter] = useState('all');
  const fileInputRef = useRef(null);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const counts = useMemo(() => ({
    all: galleryItems.length,
    sfw: galleryItems.filter(i => !i.isNsfw).length,
    nsfw: galleryItems.filter(i => i.isNsfw).length
  }), [galleryItems]);

  const filteredItems = useMemo(() => galleryItems.filter(item => {
    if (filter === 'sfw') return !item.isNsfw;
    if (filter === 'nsfw') return item.isNsfw;
    return true;
  }), [galleryItems, filter]);

  const handleExport = useCallback(() => {
    if (galleryItems.length === 0) {
      toast.info("Gallery is empty, nothing to export.");
      return;
    }
    
    const blob = new Blob([JSON.stringify(galleryItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gallery-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Gallery exported!");
  }, [galleryItems]);

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        handleImportGallery(importedData);
      } catch (error) {
        console.error("[!] Error parsing imported file:", error);
        toast.error("Import failed: Could not parse the JSON file. Make sure it's valid.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    
    reader.onerror = () => {
      console.error("[!] Error reading file");
      toast.error("Import failed: Could not read the file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    reader.readAsText(file);
  }, [handleImportGallery]);

  if (!isOpen) return null;

  const renderFilterButtons = () => (
    ['all', 'sfw', 'nsfw'].map(type => (
      <button
        key={type}
        className={`gallery-filter-btn ${filter === type ? 'active' : ''}`}
        onClick={() => setFilter(type)}
        aria-pressed={filter === type}
      >
        {type.toUpperCase()} ({counts[type]})
      </button>
    ))
  );

  return (
    <div className="gallery-overlay" onClick={handleBackdropClick}>
      <div className="gallery-modal">
        <button className="gallery-close-btn" onClick={onClose} aria-label="Close Gallery">
          <FaTimes />
        </button>
        <h2 className="gallery-title">My Wallpapers</h2>

        <div className="gallery-controls">
          <div className="gallery-filters">
            {renderFilterButtons()}
          </div>
          
          <div className="gallery-actions">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <button className="gallery-action-btn" onClick={handleImportClick} title="Import Gallery (JSON)">
              <FaFileUpload /> Import
            </button>
            <button className="gallery-action-btn" onClick={handleExport} title="Export Gallery (JSON)">
              <FaFileDownload /> Export
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="gallery-empty">
            {galleryItems.length === 0
              ? 'Your wallpapers gallery is empty. Use the "Save" button to add wallpapers!'
              : `No ${filter !== 'all' ? filter.toUpperCase() : ''} wallpapers found.`}
          </p>
        ) : (
          <div className="gallery-grid">
            {filteredItems.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onUse={handleUseFromGallery}
                onRemove={() => handleRemoveFromGallery(item.url)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;