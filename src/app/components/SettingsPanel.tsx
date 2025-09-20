'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '../lib/soundManager';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSoundEnabled = localStorage.getItem('vn-sound-enabled') === 'true';
    setSoundEnabled(savedSoundEnabled);
    soundManager.setEnabled(savedSoundEnabled);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Sound Settings */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-700">Sound Effects</h3>
              <p className="text-sm text-gray-500">
                Enable subtle sound effects for typing and interactions
              </p>
            </div>
            <button
              onClick={toggleSound}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {!soundManager.isAvailable() && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                ⚠️ Audio not available in your browser or device
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
