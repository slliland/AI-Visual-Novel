'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { StorySegment, Speaker, Emotion } from '../lib/types';
import { soundManager } from '../lib/soundManager';

interface StoryDisplayProps {
  segment: StorySegment;
  onTypingComplete: () => void;
  showSkipButton?: boolean;
  onSkip?: () => void;
}

export function StoryDisplay({ 
  segment, 
  onTypingComplete, 
  showSkipButton = false,
  onSkip 
}: StoryDisplayProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Avatar mapping for characters
  const getAvatarPath = (speaker: Speaker, emotion: Emotion): string | null => {
    if (speaker === 'NARRATOR') return null;
    
    // Normalize emotion to match file names
    const emotionMap: { [key: string]: string } = {
      'very happy': 'Very Happy',
      'deeply in love': 'Deeply In Love',
      'surprised': 'Surprised',
      'thinking': 'Thinking',
      'confident': 'Confident',
      'concern': 'Concern',
      'annoyed': 'Annoyed',
      'blushing': 'Blushing',
      'crying': 'Crying',
      'disgusted': 'Disgusted',
      'fear': 'Fear',
      'neutral': 'Neutral',
      'happy': 'Happy',
      'sad': 'Sad',
      'angry': 'Angry',
    };

    const capitalizedSpeaker = speaker.charAt(0) + speaker.slice(1).toLowerCase();
    const emotionFile = emotionMap[emotion] || 'Neutral';
    
    return `/avatars/${capitalizedSpeaker}/${emotionFile}.png`;
  };

  // Typing effect
  useEffect(() => {
    if (currentIndex < segment.text.length) {
      intervalRef.current = setTimeout(() => {
        setDisplayedText(prev => prev + segment.text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        
        // Play typing sound occasionally (every 3rd character to avoid spam)
        if (currentIndex % 3 === 0) {
          soundManager.playTypingSound();
        }
      }, 50); // 50ms per character for smooth typing
    } else if (currentIndex >= segment.text.length && isTyping) {
      setIsTyping(false);
      soundManager.playTransitionSound();
      onTypingComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [currentIndex, segment.text, isTyping, onTypingComplete]);

  // Reset when segment changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
  }, [segment]);

  const handleSkip = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    setDisplayedText(segment.text);
    setCurrentIndex(segment.text.length);
    setIsTyping(false);
    onSkip?.();
    onTypingComplete();
  };

  const avatarPath = getAvatarPath(segment.speaker, segment.emotion);

  return (
    <div className="flex flex-col items-center space-y-6 max-w-4xl mx-auto">
      {/* Avatar Display */}
      {avatarPath && (
        <div className="relative w-48 h-48 md:w-64 md:h-64 transition-all duration-500">
          <Image
            src={avatarPath}
            alt={`${segment.speaker} - ${segment.emotion}`}
            fill
            className="object-contain rounded-lg shadow-lg"
            priority
          />
          {/* Character name badge */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
              {segment.speaker.charAt(0) + segment.speaker.slice(1).toLowerCase()}
            </div>
          </div>
        </div>
      )}

      {/* Text Display */}
      <div className="relative w-full">
        <div className={`
          p-6 rounded-lg shadow-lg min-h-[120px] flex items-center justify-center backdrop-blur-sm
          ${segment.speaker === 'NARRATOR' 
            ? 'bg-gray-800/90 text-gray-100 border border-gray-600/50' 
            : 'bg-white/90 text-gray-900 border border-gray-200/50'
          }
        `}>
          <p className="text-lg md:text-xl leading-relaxed text-center font-medium">
            {displayedText}
            {isTyping && (
              <span className="animate-pulse ml-1 text-blue-500">|</span>
            )}
          </p>
        </div>

        {/* Skip Button */}
        {showSkipButton && isTyping && (
          <button
            onClick={handleSkip}
            className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
