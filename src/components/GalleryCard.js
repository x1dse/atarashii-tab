import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FaEye, FaEyeSlash, FaCheck, FaTrash } from 'react-icons/fa';

import './styles/GalleryCard.scss';

const GalleryCard = ({ item, onUse, onRemove }) => {
  const [isNsfwVisible, setIsNsfwVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isBlurred = useMemo(() => item.isNsfw && !isNsfwVisible, [item.isNsfw, isNsfwVisible]);

  const toggleNsfwVisibility = useCallback(() => {
    setIsNsfwVisible(prev => !prev);
  }, []);

  const handleUseClick = useCallback(() => {
    onUse(item);
  }, [item, onUse]);

  const handleRemoveClick = useCallback(() => {
    if (window.confirm("Are you sure you want to remove this item from the gallery?")) {
      onRemove(item.url);
    }
  }, [item.url, onRemove]);

  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
    setImageError(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
     setImageLoading(false);
     setImageError(true);
  }, []);

  const imageStyle = useMemo(() => ({
      display: (imageLoading || imageError) ? 'none' : 'block',
  }), [imageLoading, imageError]);


  return (
    <div className={`gallery-card ${isBlurred ? 'blurred' : ''}`}>
      <div className="gallery-card-image-wrapper">
         {imageLoading && <div className="gallery-card-placeholder">Loading...</div>}
         {imageError && <div className="gallery-card-placeholder error">Error loading image</div>}
         {!imageLoading && !imageError && !item.url && <div className="gallery-card-placeholder">No Image URL</div>}

         {item.url && !imageError && (
           <img
             src={item.url}
             alt={item.title || 'Wallpaper'}
             loading="lazy"
             onLoadStart={handleImageLoadStart}
             onLoad={handleImageLoad}
             onError={handleImageError}
             style={imageStyle}
           />
         )}
         {isBlurred && <div className="blur-overlay">NSFW</div>}
      </div>
      <div className="gallery-card-content">
        <p className="card-title" title={item.title}>{item.title || 'Untitled'}</p>
        {item.res && <p className="card-res">{item.res}</p>}
        {item.link && (
           <p className="card-link">
             <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
               View Post
             </a>
           </p>
         )}
      </div>
      <div className="gallery-card-actions">
        <button onClick={handleUseClick} title="Use this wallpaper">
          <FaCheck /> Use
        </button>
        {item.isNsfw && (
          <button onClick={toggleNsfwVisibility} title={isBlurred ? 'Show NSFW content' : 'Hide NSFW content'} aria-pressed={!isBlurred}>
            {isBlurred ? <FaEye /> : <FaEyeSlash />}
            {isBlurred ? 'Show' : 'Hide'}
          </button>
        )}
         <button className="remove-button" onClick={handleRemoveClick} title="Remove from gallery" aria-label="Remove from gallery">
            <FaTrash />
         </button>
      </div>
    </div>
  );
};

GalleryCard.propTypes = {
  item: PropTypes.shape({
    url: PropTypes.string.isRequired,
    title: PropTypes.string,
    res: PropTypes.string,
    link: PropTypes.string,
    isNsfw: PropTypes.bool,
  }).isRequired,
  onUse: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};


export default GalleryCard;