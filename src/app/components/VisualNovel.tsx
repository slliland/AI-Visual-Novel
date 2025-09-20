'use client';

import { useState, useCallback, useRef } from 'react';
import { StorySegment, Choice, VisualNovelState } from '../lib/types';
import { StreamingXMLParser } from '../lib/xmlParser';
import { StoryDisplay } from './StoryDisplay';
import { ChoiceSystem } from './ChoiceSystem';
import { SettingsPanel } from './SettingsPanel';

interface VisualNovelProps {
  initialPrompt?: string;
}

export function VisualNovel({ initialPrompt }: VisualNovelProps) {
  const [state, setState] = useState<VisualNovelState>({
    currentStoryIndex: 0,
    displayedText: '',
    isTyping: false,
    showChoices: false,
    storyHistory: [],
  });

  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [showSettings, setShowSettings] = useState(false);

  const parserRef = useRef<StreamingXMLParser>(new StreamingXMLParser());
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStory = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setSegments([]);
    setChoices([]);
    setState(prev => ({
      ...prev,
      currentStoryIndex: 0,
      showChoices: false,
      storyHistory: [userPrompt],
    }));

    // Reset parser
    parserRef.current.reset();

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userPrompt }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const newSegments = parserRef.current.processChunk(chunk);

        if (newSegments.length > 0) {
          setSegments(prev => {
            const updated = [...prev, ...newSegments];
            return updated;
          });
        }

        // Check if we have choices and parsing is complete
        if (parserRef.current.isComplete()) {
          const parsedChoices = parserRef.current.getChoices();
          if (parsedChoices.length > 0) {
            setChoices(parsedChoices);
          }
          break;
        }
      }

      setHasStarted(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      console.error('Error fetching story:', err);
      setError('Failed to load the story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChoiceSelected = useCallback(async (choice: Choice) => {
    setChoices([]);
    setState(prev => ({
      ...prev,
      showChoices: false,
      storyHistory: [...prev.storyHistory, choice.text],
    }));

    // For now, we'll just reload the same story
    // In a real implementation, this would send the choice to the API
    await startStory(`Continue the story based on choice: ${choice.text}`);
  }, [startStory]);

  const handleTypingComplete = useCallback(() => {
    setState(prev => {
      const newIndex = prev.currentStoryIndex + 1;
      
      // If we've displayed all segments and have choices, show them
      if (newIndex >= segments.length && choices.length > 0) {
        return {
          ...prev,
          currentStoryIndex: newIndex,
          showChoices: true,
          isTyping: false,
        };
      }
      
      return {
        ...prev,
        currentStoryIndex: newIndex,
        isTyping: false,
      };
    });
  }, [segments.length, choices.length]);

  const handleSkip = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTyping: false,
    }));
  }, []);

  const currentSegment = segments[state.currentStoryIndex];
  const shouldShowChoices = state.showChoices && state.currentStoryIndex >= segments.length && choices.length > 0;

  if (!hasStarted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="max-w-2xl w-full relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              AI Visual Novel
            </h1>
            <p className="text-xl text-gray-200 mb-8 drop-shadow-md">
              Begin your adventure with a simple prompt
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
            <label htmlFor="prompt" className="block text-lg font-medium text-gray-700 mb-4">
              Set the scene for your story:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: A lone wanderer discovers a hidden, ancient library in the middle of a desert..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              rows={4}
              disabled={isLoading}
            />
            
            <button
              onClick={() => startStory(prompt)}
              disabled={isLoading || !prompt.trim()}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Starting your adventure...</span>
                </div>
              ) : (
                'Begin Adventure'
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background overlay for better readability */}
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Your Adventure
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded shadow-lg"></div>
          
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-0 right-4 p-2 text-white/80 hover:text-white transition-colors drop-shadow-md"
            title="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Story Content */}
        <div className="max-w-6xl mx-auto">
          {currentSegment ? (
            <StoryDisplay
              segment={currentSegment}
              onTypingComplete={handleTypingComplete}
              showSkipButton={true}
              onSkip={handleSkip}
            />
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white drop-shadow-md">Loading your story...</p>
            </div>
          ) : null}

          {/* Choices */}
          <ChoiceSystem
            choices={choices}
            onChoiceSelected={handleChoiceSelected}
            isVisible={shouldShowChoices}
          />

          {/* Continue Button for next segment */}
          {!shouldShowChoices && 
           !isLoading && 
           currentSegment && 
           !state.isTyping && 
           state.currentStoryIndex < segments.length - 1 && (
            <div className="text-center mt-8">
              <button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  currentStoryIndex: prev.currentStoryIndex + 1,
                  isTyping: true 
                }))}
                className="bg-blue-500/90 hover:bg-blue-600/90 backdrop-blur-sm text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </div>
  );
}
