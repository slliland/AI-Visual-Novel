'use client';

import { useState } from 'react';
import { Choice } from '../lib/types';
import { soundManager } from '../lib/soundManager';

interface ChoiceSystemProps {
  choices: Choice[];
  onChoiceSelected: (choice: Choice) => void;
  isVisible: boolean;
}

export function ChoiceSystem({ choices, onChoiceSelected, isVisible }: ChoiceSystemProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleChoiceClick = async (choice: Choice) => {
    if (selectedChoice || isAnimating) return;

    soundManager.playChoiceSound();
    setSelectedChoice(choice.id);
    setIsAnimating(true);

    // Brief animation delay before proceeding
    setTimeout(() => {
      onChoiceSelected(choice);
      setSelectedChoice(null);
      setIsAnimating(false);
    }, 300);
  };

  if (!isVisible || choices.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-lg">
          What do you choose to do?
        </h3>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded shadow-lg"></div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceClick(choice)}
            disabled={selectedChoice !== null}
            className={`
              group relative p-6 rounded-lg border-2 transition-all duration-300 text-left backdrop-blur-sm
              ${selectedChoice === choice.id
                ? 'border-green-400 bg-green-50/90 scale-105 shadow-lg'
                : selectedChoice
                ? 'border-gray-300 bg-gray-50/70 opacity-50 cursor-not-allowed'
                : 'border-gray-300 bg-white/90 hover:border-blue-400 hover:bg-blue-50/90 hover:scale-102 hover:shadow-md cursor-pointer'
              }
            `}
            style={{
              animationDelay: `${index * 100}ms`,
              animation: isVisible ? 'fadeInUp 0.5s ease-out forwards' : 'none'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${selectedChoice === choice.id
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white group-hover:bg-blue-600'
                }
              `}>
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium leading-relaxed">
                  {choice.text}
                </p>
              </div>
            </div>

            {/* Selection indicator */}
            {selectedChoice === choice.id && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </button>
        ))}
      </div>

      {/* Loading indicator when choice is selected */}
      {selectedChoice && (
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 text-white drop-shadow-md">
            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span>Loading next part of the story...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Note: fadeInUp animation is defined in globals.css
