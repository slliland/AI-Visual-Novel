'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { StorySegment, Speaker, Emotion } from '../lib/types';
import { soundManager } from '../lib/soundManager';

interface StoryDisplayProps {
  segment: StorySegment;
  onTypingComplete: () => void;
  onSkipTyping?: () => void;
  showSkipButton?: boolean;
}

export function StoryDisplay({ 
  segment, 
  onTypingComplete, 
  onSkipTyping,
  showSkipButton = false,
}: StoryDisplayProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionCalledRef = useRef(false);

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
    console.log('Typing effect - currentIndex:', currentIndex, 'text length:', segment.text.length, 'isTyping:', isTyping, 'speaker:', segment.speaker);
    
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
      console.log('🔴 StoryDisplay: Typing completed for', segment.speaker, '- calling onTypingComplete');
      console.log('🔴 Segment text:', segment.text);
      console.log('🔴 Current index:', currentIndex, 'Text length:', segment.text.length);
      completionCalledRef.current = true;
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
    console.log('🟣 STORY DISPLAY: New segment received:', {
      speaker: segment.speaker,
      text: segment.text.substring(0, 50) + '...',
      emotion: segment.emotion
    });
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
  }, [segment]);

  // Track if completion has been called for this segment (declared above)

  // Reset completion flag when segment changes
  useEffect(() => {
    completionCalledRef.current = false;
  }, [segment]);

  // Ensure completion is called when segment is fully displayed (backup mechanism)
  useEffect(() => {
    console.log('🔵 BACKUP CHECK:', { 
      currentIndex, 
      textLength: segment.text.length, 
      isTyping, 
      completionCalled: completionCalledRef.current,
      speaker: segment.speaker 
    });
    
    if (currentIndex >= segment.text.length && currentIndex > 0 && !isTyping && !completionCalledRef.current) {
      console.log('🔵 BACKUP MECHANISM TRIGGERED - calling onTypingComplete');
      completionCalledRef.current = true;
      // Small delay to ensure state is settled
      const timeout = setTimeout(() => {
        onTypingComplete();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, segment.text.length, isTyping, segment.speaker, onTypingComplete]);

  const handleSkip = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    completionCalledRef.current = true;
    setDisplayedText(segment.text);
    setCurrentIndex(segment.text.length);
    setIsTyping(false);
    soundManager.playTransitionSound();
    
    // Call onSkipTyping if provided (just shows text, doesn't advance)
    // Otherwise call onTypingComplete (advances story)
    if (onSkipTyping) {
      onSkipTyping();
    } else {
      onTypingComplete();
    }
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
              <span className="animate-pulse ml-1 text-pink-500">|</span>
            )}
          </p>
        </div>

        {/* Skip Typing Button */}
        {showSkipButton && isTyping && (
          <button
            onClick={handleSkip}
            className="absolute bottom-4 right-4 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded text-sm transition-colors shadow-lg"
            title="Skip typing animation and show full text"
          >
            Skip Typing
          </button>
        )}
      </div>
    </div>
  );
}
