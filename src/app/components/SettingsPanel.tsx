'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '../lib/soundManager';
import { musicManager } from '../lib/musicManager';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);

  useEffect(() => {
    // Load settings from localStorage
    const savedSoundEnabled = localStorage.getItem('vn-sound-enabled') === 'true';
    setSoundEnabled(savedSoundEnabled);
    soundManager.setEnabled(savedSoundEnabled);
    
    // Initialize music manager and load music settings
    musicManager.initialize();
    setMusicMuted(musicManager.isMusicMuted());
    setMusicVolume(musicManager.getVolume());
  }, []);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    soundManager.setEnabled(newValue);
    localStorage.setItem('vn-sound-enabled', newValue.toString());
    
    if (newValue) {
      soundManager.playChoiceSound();
    }
  };

  const toggleMusic = () => {
    const newValue = !musicMuted;
    setMusicMuted(newValue);
    musicManager.setMuted(newValue);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMusicVolume(newVolume);
    musicManager.setVolume(newVolume);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border-4 border-amber-200">
        {/* Settings Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold flex items-center">
            ⚙️ Settings
          </h2>
          <p className="text-amber-100 mt-2">Customize your experience</p>
        </div>

        <div className="p-6">

          <div className="space-y-4">
            {/* Background Music Settings */}
            <div className="space-y-3 p-4 bg-white rounded-lg shadow-inner border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-amber-800">Background Music</h3>
                <p className="text-sm text-amber-600">
                  Peaceful background music during your adventure
                </p>
              </div>
              <button
                onClick={toggleMusic}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${!musicMuted ? 'bg-amber-600' : 'bg-gray-300'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${!musicMuted ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
            
            {/* Volume Slider */}
            {!musicMuted && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-amber-600">🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={musicVolume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer slider accent-amber-600"
                />
                <span className="text-sm text-amber-600 w-8">{Math.round(musicVolume * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-md"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
