import React from 'react';
import './styles/Modal.scss';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal">
            <div className="modal-bg" onClick={onClose}></div>
            <div className="modal-content">
                <button className="modal-close-button" onClick={onClose} aria-label="Close Modal">
                    <FaTimes />
                </button>
                {children}
            </div>
        </div>
    );
};

export default Modal;