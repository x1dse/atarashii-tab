import React, { useState, useContext, useCallback, useId } from 'react';
import AppContext from '../contexts/AppContext';
import Modal from './Modal';
import imageSources from '../services/imageSources';
import {
    FaCog, FaPalette, FaCloudDownloadAlt, FaFilter,
    FaTrash, FaSync, FaImage, FaCheck, FaChevronDown
} from 'react-icons/fa';

import './styles/Settings.scss';

const ORDER_RANDOM = 'random';
const ORDER_SEQUENTIAL = 'sequential';
const DEFAULT_FETCH_LIMIT = 200;
const REFRESH_FEEDBACK_DURATION = 1000;

const Settings = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('theme');
    const {
        config,
        setConfig,
        setCache,
        setGalleryItems,
        setLoaded
    } = useContext(AppContext);
    const [newPrimaryColor, setNewPrimaryColor] = useState(config?.theme?.primary || '#ffc400');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const orderId = useId();
    const limitId = useId();

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const handleClearCache = () => {
        if (window.confirm("Are you sure you want to clear the image cache?")) {
            setCache({ lastUpdated: -1, data: [] });
            alert('Image cache cleared!');
        }
    };

    const handleClearGallery = () => {
        if (window.confirm("Are you sure you want to clear the saved gallery?")) {
            setGalleryItems([]);
            alert('Saved gallery cleared!');
        }
    };

    const handleSourceChange = (e) => {
        setConfig(prevConfig => ({ ...prevConfig, source: e.target.value, num: null }));
        setLoaded(false);
    };

    const handleOrderChange = (e) => {
        const newOrder = e.target.value;
        if (newOrder !== (config.orderMode || ORDER_RANDOM)) {
            setConfig(prevConfig => ({ ...prevConfig, orderMode: newOrder, num: null }));
            setLoaded(false);
        }
    };

    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value, 10);
        if (newLimit > 0 && newLimit !== (config?.fetchLimit || DEFAULT_FETCH_LIMIT)) {
            setConfig(prevConfig => ({ ...prevConfig, fetchLimit: newLimit }));
            setCache(prevCache => ({ ...prevCache, lastUpdated: -1, data: [] }));
            setLoaded(false);
        }
    };

    const handleForceRefresh = () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        setConfig(prev => ({ ...prev, num: null }));
        setCache(prevCache => ({ ...prevCache, lastUpdated: -1, data: [] }));
        setLoaded(false);
        setTimeout(() => setIsRefreshing(false), REFRESH_FEEDBACK_DURATION);
    };

    const handleThemeChange = useCallback(() => {
        setConfig(prevConfig => ({
            ...prevConfig,
            theme: { ...prevConfig.theme, primary: newPrimaryColor },
        }));
    }, [newPrimaryColor, setConfig]);

    const currentSource = config.source || 'reddit';
    const currentSourceInfo = imageSources[currentSource];
    const currentFetchLimit = config?.fetchLimit || DEFAULT_FETCH_LIMIT;

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'theme':
                return (
                    <div className="settings-section theme-settings-content">
                        <h3><FaPalette className="section-icon" /> Theme Customization</h3>
                        <div className="setting-item">
                            <label htmlFor="primaryColor">Primary Accent Color:</label>
                            <div className="color-input-wrapper">
                                <input
                                    type="color"
                                    id="primaryColor"
                                    value={newPrimaryColor}
                                    onChange={(e) => setNewPrimaryColor(e.target.value)}
                                />
                                <span>{newPrimaryColor}</span>
                            </div>
                        </div>
                        <button className="apply-button action-button" onClick={handleThemeChange}>
                            <FaCheck /> Apply Theme
                        </button>
                    </div>
                );
            case 'network':
                return (
                    <div className="network-settings-container">
                        <div className="settings-section source-selection-section">
                            <h3><FaImage className="section-icon" /> Image Source</h3>
                            <div className="setting-item">
                                <label htmlFor="sourceSelect">Select Source:</label>
                                <div className="select-wrapper">
                                    <select
                                        id="sourceSelect"
                                        value={currentSource}
                                        onChange={handleSourceChange}
                                    >
                                        {Object.keys(imageSources).map(sourceKey => (
                                            <option key={sourceKey} value={sourceKey}>
                                                {imageSources[sourceKey].name}
                                            </option>
                                        ))}
                                    </select>
                                    <FaChevronDown className="select-icon" />
                                </div>
                                {currentSourceInfo?.name.includes('(Not Implemented') && (
                                    <p className="warning-text">Note: This source is not fully functional yet.</p>
                                )}
                                {currentSourceInfo?.name.includes('(Placeholder') && (
                                    <p className="warning-text">Note: This source is a placeholder and may not work.</p>
                                )}
                            </div>
                        </div>
                        <div className="settings-section fetch-options-section">
                            <h3><FaFilter className="section-icon" /> Fetch Options</h3>
                            <div className="temporary-options-content">
                                <div className="options-grid">
                                    <div className="setting-item-temp">
                                        <label htmlFor={orderId}>Order</label>
                                        <div className="select-wrapper">
                                            <select
                                                id={orderId}
                                                value={config.orderMode || ORDER_RANDOM}
                                                onChange={handleOrderChange}
                                            >
                                                <option value={ORDER_RANDOM}>Random</option>
                                                <option value={ORDER_SEQUENTIAL}>Sequential</option>
                                            </select>
                                            <FaChevronDown className="select-icon" />
                                        </div>
                                    </div>
                                    <div className="setting-item-temp">
                                        <label htmlFor={limitId}>Fetch Limit</label>
                                        <div className="select-wrapper">
                                            <select
                                                id={limitId}
                                                value={currentFetchLimit}
                                                onChange={handleLimitChange}
                                            >
                                                <option value="100">100 images</option>
                                                <option value="200">200 images</option>
                                                <option value="300">300 images</option>
                                                <option value="500">500 images</option>
                                            </select>
                                            <FaChevronDown className="select-icon" />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={`force-refresh-button action-button ${isRefreshing ? 'refreshing' : ''}`}
                                    onClick={handleForceRefresh}
                                    title="Clear cache & get new random images"
                                    disabled={isRefreshing}
                                >
                                    {isRefreshing ? <FaSync className="spin" /> : <FaSync />}
                                    Force Refresh
                                </button>
                            </div>
                        </div>
                        <div className="settings-section data-cleanup-section">
                            <h3><FaTrash className="section-icon" /> Data Management</h3>
                            <div className="button-group">
                                <button className="action-button" onClick={handleClearCache}>
                                    <FaSync /> Clear Image Cache
                                </button>
                                <button className="action-button" onClick={handleClearGallery}>
                                    <FaTrash /> Clear Saved Gallery
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <button className="settings-trigger-button hideable" onClick={openModal} title="Open Settings">
                <FaCog size={20} />
            </button>
            <Modal isOpen={isModalOpen} onClose={closeModal} title="Configuration Settings">
                <div className="settings-layout">
                    <nav className="settings-nav">
                        <div className="nav-section main-settings">
                            <button
                                className={`nav-button ${activeTab === 'theme' ? 'active' : ''}`}
                                onClick={() => setActiveTab('theme')}
                            >
                                <FaPalette /> Themes
                            </button>
                            <button
                                className={`nav-button ${activeTab === 'network' ? 'active' : ''}`}
                                onClick={() => setActiveTab('network')}
                            >
                                <FaCloudDownloadAlt /> Source & Options
                            </button>
                        </div>
                    </nav>
                    <main className="settings-content">
                        {renderActiveTabContent()}
                    </main>
                </div>
            </Modal>
        </>
    );
};

export default Settings;