'use client';

import { useState } from 'react';
import { Choice, StorySegment } from '../lib/types';
import { soundManager } from '../lib/soundManager';

interface ChoiceSystemProps {
  choices: Choice[];
  onChoiceSelected: (choice: Choice) => void;
  isVisible: boolean;
  contextSegments?: StorySegment[];
  allSegments?: StorySegment[];
  previousChoices?: string[];
  hubText?: string;
}

export function ChoiceSystem({ choices, onChoiceSelected, isVisible, contextSegments = [], allSegments = [], previousChoices = [], hubText }: ChoiceSystemProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleChoiceClick = async (choice: Choice) => {
    if (selectedChoice || isAnimating || choice.disabled) return;

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

  // Use contextSegments if available, otherwise use last 10 segments from allSegments
  const allSegmentsToUse = contextSegments.length > 0 ? contextSegments : allSegments.slice(-10);
  
  // Filter to show character dialogue and some narrator context, but not hub text
  const displaySegments = allSegmentsToUse.filter(segment => {
    // Skip hub text specifically
    if (segment.text === 'Who do you sit with?') return false;
    
    // Skip actions (text in parentheses)
    if (segment.text.startsWith('(') && segment.text.endsWith(')')) return false;
    
    // Skip very short text
    if (segment.text.length < 8) return false;
    
    // Include character dialogue and meaningful narrator segments
    return true;
  }).slice(-8); // Keep last 8 segments for more context
  
  console.log('🎯 ChoiceSystem displaySegments:', displaySegments.length, 'segments');

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      {/* Previous Choices Display */}
      {previousChoices.length > 0 && (
        <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-3 drop-shadow-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your Previous Choices
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto story-scroll">
            {previousChoices.map((choice, index) => (
              <div key={index} className="text-sm text-white/90 p-2 bg-green-500/20 rounded border-l-4 border-green-400">
                <span className="font-medium text-green-300">Choice {index + 1}:</span>
                <span className="ml-2">{choice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Display */}
      {displaySegments.length > 0 && (
        <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-3 drop-shadow-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Context
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto story-scroll">
            {displaySegments.map((segment, index) => (
              <div key={index} className="text-sm text-white/90 p-2 bg-white/5 rounded">
                <span className="font-medium text-pink-300">
                  {segment.speaker === 'NARRATOR' ? 'Narrator' : segment.speaker}:
                </span>
                <span className="ml-2">{segment.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-1 drop-shadow-lg">
          What do you choose to do?
        </h3>
        {hubText && (
          <h4 className="text-lg text-white/90 mb-3 drop-shadow-md font-medium">
            {hubText}
          </h4>
        )}
        <div className="w-24 h-1 bg-gradient-to-r from-pink-400 to-rose-400 mx-auto rounded shadow-lg"></div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceClick(choice)}
            disabled={selectedChoice !== null || choice.disabled}
            className={`
              group relative p-6 rounded-lg border-2 transition-all duration-300 text-left backdrop-blur-sm
              ${choice.disabled
                ? 'border-gray-300 bg-gray-100/70 opacity-60 cursor-not-allowed'
                : selectedChoice === choice.id
                ? 'border-green-400 bg-green-50/90 scale-105 shadow-lg'
                : selectedChoice
                ? 'border-gray-300 bg-gray-50/70 opacity-50 cursor-not-allowed'
                : 'border-gray-300 bg-white/90 hover:border-pink-400 hover:bg-pink-50/90 hover:scale-102 hover:shadow-md cursor-pointer'
              }
            `}
            style={{
              animationDelay: `${index * 100}ms`,
              animationName: isVisible ? 'fadeInUp' : 'none',
              animationDuration: '0.5s',
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${choice.disabled
                  ? 'bg-gray-400 text-gray-200'
                  : selectedChoice === choice.id
                  ? 'bg-green-500 text-white'
                  : 'bg-pink-500 text-white group-hover:bg-pink-600'
                }
              `}>
                {choice.disabled ? '✅' : index + 1}
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
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </button>
        ))}
      </div>

      {/* Loading indicator when choice is selected */}
      {selectedChoice && (
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 text-white drop-shadow-md">
            <div className="animate-spin w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full"></div>
            <span>Loading next part of the story...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Note: fadeInUp animation is defined in globals.css
