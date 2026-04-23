import React, { useState } from 'react';
import { FaCog, FaTimes, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useGameContext } from './Context';
import './SettingsMenu.css';

const SettingsMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { musicVolume, setMusicVolume, isMuted, setIsMuted } = useGameContext();

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleVolumeChange = (e) => {
        setMusicVolume(parseFloat(e.target.value));
        if (isMuted && parseFloat(e.target.value) > 0) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <>
            <button className="settings-cog-btn" onClick={toggleMenu} aria-label="Settings">
                <FaCog />
            </button>

            {isOpen && (
                <div className="settings-modal-overlay" onClick={toggleMenu}>
                    <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="settings-close-btn" onClick={toggleMenu}>
                            <FaTimes />
                        </button>
                        <h2>Audio Settings</h2>
                        
                        <div className="settings-control-group">
                            <button className="mute-toggle-btn" onClick={toggleMute}>
                                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : musicVolume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                            <span className="volume-display">
                                {isMuted ? "0%" : `${Math.round(musicVolume * 100)}%`}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SettingsMenu;
