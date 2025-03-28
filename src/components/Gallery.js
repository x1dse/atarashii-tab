import React, { useContext, useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';
import AppContext from '../contexts/AppContext';
import GalleryCard from './GalleryCard';

import './styles/Gallery.scss';

const Gallery = ({ isOpen, onClose }) => {
  const { galleryItems, handleUseFromGallery, handleRemoveFromGallery } = useContext(AppContext);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="gallery-overlay" onClick={handleBackdropClick}>
      <div className="gallery-modal">
        <button
          className="gallery-close-btn"
          onClick={onClose}
          aria-label="Close Gallery"
        >
          <FaTimes />
        </button>
        <h2 className="gallery-title">My Wallpapers</h2>
        {galleryItems.length === 0 ? (
          <p className="gallery-empty">
            Your wallpapers gallery is empty. Use the "Save" button to add wallpapers!
          </p>
        ) : (
          <div className="gallery-grid">
            {galleryItems.map((item) => (
              <GalleryCard
                key={item.url}
                item={item}
                onUse={handleUseFromGallery}
                onRemove={handleRemoveFromGallery}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;