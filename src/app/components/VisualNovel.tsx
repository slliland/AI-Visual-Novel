'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StorySegment, Choice, VisualNovelState, ConversationSection } from '../lib/types';
import { StreamingXMLParser } from '../lib/xmlParser';
import { BackendConversationManager } from '../lib/backendConversationManager';
import { StoryDisplay } from './StoryDisplay';
import { ChoiceSystem } from './ChoiceSystem';
import { SettingsPanel } from './SettingsPanel';
import { ConversationSidebar } from './ConversationSidebar';
import { IllustratedBook } from './IllustratedBook';
import { musicManager } from '../lib/musicManager';
import { soundManager } from '../lib/soundManager';

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
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversations, setConversations] = useState<ConversationSection[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [contextSegments, setContextSegments] = useState<StorySegment[]>([]);
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [storyCompleted, setStoryCompleted] = useState(false);
  const [storySummary, setStorySummary] = useState<string>('');
  const [completedThreads, setCompletedThreads] = useState<string[]>([]);
  const [encounteredCharacters, setEncounteredCharacters] = useState<string[]>([]);
  const [characterInformation, setCharacterInformation] = useState<Record<string, string[]>>({});
  const [showBook, setShowBook] = useState(false);
  const [characterProgress, setCharacterProgress] = useState<Record<string, string>>({});
  const characterProgressRef = useRef<Record<string, string>>({});
  const completedThreadsRef = useRef<string[]>([]);

  const parserRef = useRef<StreamingXMLParser>(new StreamingXMLParser());
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationManagerRef = useRef<BackendConversationManager>(BackendConversationManager.getInstance());

  // Sync refs with state
  useEffect(() => {
    characterProgressRef.current = characterProgress;
  }, [characterProgress]);
  
  useEffect(() => {
    completedThreadsRef.current = completedThreads;
  }, [completedThreads]);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      const manager = conversationManagerRef.current;
      await manager.initialize();
      
      // Initialize music manager
      musicManager.initialize();
      
      // Initialize sound effects with default enabled
      const savedSoundEnabled = localStorage.getItem('vn-sound-enabled');
      const soundEnabledValue = savedSoundEnabled === null ? true : savedSoundEnabled === 'true';
      soundManager.setEnabled(soundEnabledValue);
      
      // Mobile-specific: Add touch event listeners for audio context
      const enableAudio = () => {
        if (typeof window !== 'undefined') {
          // Create a silent audio context to enable audio on mobile
          const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
        }
      };
      
      // Enable audio on first user interaction
      const events = ['touchstart', 'touchend', 'click', 'keydown'];
      events.forEach(event => {
        document.addEventListener(event, enableAudio, { once: true });
      });
      
      const conversations = await manager.getAllConversations();
      setConversations(conversations);
      
      const current = await manager.getCurrentConversation();
      if (current) {
        setCurrentConversationId(current.id);
        setSegments(current.segments);
        setChoices(current.choices);
        const context = await manager.getConversationContext(current.id, 5);
        setContextSegments(context);
        // Don't automatically start - let user decide to continue or start new
      }
    };
    
    loadConversations().catch(console.error);
  }, []);

  // Update context segments when conversation changes
  useEffect(() => {
    const updateContext = async () => {
      if (currentConversationId) {
        const manager = conversationManagerRef.current;
        const context = await manager.getConversationContext(currentConversationId, 5);
        setContextSegments(context);
      }
    };
    
    updateContext().catch(console.error);
  }, [currentConversationId, segments]);

  const handleNewConversation = useCallback(() => {
    setSegments([]);
    setChoices([]);
    setHasStarted(false);
    setCurrentConversationId(null);
    setContextSegments([]);
    setPrompt('');
    setState(prev => ({
      ...prev,
      currentStoryIndex: 0,
      showChoices: false,
      storyHistory: [],
    }));
    setShowSidebar(false);
  }, []);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    const manager = conversationManagerRef.current;
    const conversation = await manager.getConversation(conversationId);
    if (conversation) {
      manager.setCurrentConversation(conversationId);
      setCurrentConversationId(conversationId);
      setSegments(conversation.segments);
      setChoices(conversation.choices);
      const context = await manager.getConversationContext(conversationId, 5);
      setContextSegments(context);
      setPrompt(conversation.initialPrompt);
      setHasStarted(conversation.segments.length > 0);
      
      // Start from the beginning of the story, not the end
      setState(prev => ({
        ...prev,
        currentStoryIndex: 0, // Start from the beginning
        displayedText: '',
        isTyping: false,
        showChoices: false, // Don't show choices immediately
        storyHistory: [conversation.initialPrompt],
        waitingForContinue: conversation.segments.length > 0, // Show continue button if there are segments
        storyCompleted: false,
        storySummary: '',
      }));
      
      // Reset other states
      setCompletedThreads([]);
      setEncounteredCharacters([]);
      setCharacterInformation({});
      setShowBook(false);
      setShowSidebar(false);
      
      console.log('📖 Loaded conversation:', conversationId, 'with', conversation.segments.length, 'segments');
      console.log('📖 First segment:', conversation.segments[0]);
      console.log('📖 Last segment:', conversation.segments[conversation.segments.length - 1]);
      console.log('📖 Choices:', conversation.choices.length);
    }
  }, []);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    try {
      // Optimistic UI update - remove from list immediately for smooth animation
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      const manager = conversationManagerRef.current;
      const success = await manager.deleteConversation(conversationId);
      
      if (!success) {
        // If deletion failed, restore the conversation to the list
        const allConversations = await manager.getAllConversations();
        setConversations(allConversations);
        return;
      }
      
      // If we deleted the current conversation, reset
      if (conversationId === currentConversationId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      // Restore conversations list on error
      const manager = conversationManagerRef.current;
      const allConversations = await manager.getAllConversations();
      setConversations(allConversations);
    }
  }, [currentConversationId, handleNewConversation]);

  const startStory = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    // Show loading immediately
    setIsLoading(true);
    setError(null);
    setSegments([]);
    setChoices([]);
    setContextSegments([]);
    
    // Start background music (user interaction allows autoplay)
    musicManager.handleUserInteraction();

    // Create new conversation
    const manager = conversationManagerRef.current;
    const conversationId = await manager.createNewConversation(userPrompt);
    setCurrentConversationId(conversationId);
    const conversations = await manager.getAllConversations();
    setConversations(conversations);
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
      // For starting the story, use GET to get the initial content (now cached on server)
      const response = await fetch('/api/story', {
        method: 'GET',
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
            
            // Extract information from character segments for the book AND add to encountered characters
            newSegments.forEach(segment => {
              if (segment.speaker !== 'NARRATOR') {
                const character = segment.speaker.toLowerCase();
                console.log('📖 [INITIAL] Processing segment for', character, ':', segment.text);
                
                // Add character to encountered list when we first see them in the story
                setEncounteredCharacters(prev => {
                  if (!prev.includes(character)) {
                    console.log('👥 [INITIAL] Character met in story:', character);
                    return [...prev, character];
                  }
                  return prev;
                });
                
                const info = extractCharacterInformation(segment.text);
                if (info) {
                  console.log('📖 [INITIAL] Adding info for', character, ':', info);
                  setCharacterInformation(prev => {
                    const existingInfo = prev[character] || [];
                    // Only add if not already present (deduplication)
                    if (!existingInfo.includes(info)) {
                      console.log('📖 [INITIAL] New info added for', character, '. Total info:', [...existingInfo, info].length);
                      return {
                        ...prev,
                        [character]: [...existingInfo, info]
                      };
                    }
                    console.log('📖 [INITIAL] Info already exists for', character, '. Total info:', existingInfo.length);
                    return prev;
                  });
                } else {
                  console.log('📖 [INITIAL] No info extracted for', character, '- reason:', segment.text.startsWith('(') ? 'action' : 'filtered');
                }
              }
            });
            
            // Update conversation manager
            if (currentConversationId) {
              const manager = conversationManagerRef.current;
              manager.updateCurrentConversation(updated, choices).catch(console.error);
              // Update context segments immediately after updating segments
              manager.getConversationContext(currentConversationId, 5)
                .then(context => setContextSegments(context))
                .catch(console.error);
            }
            
            return updated;
          });
        }

        // Check for new choices after processing each chunk
        const currentChoices = parserRef.current.getChoices();
        if (currentChoices.length > 0) {
          setChoices(currentChoices);
        }

        // Check if we have choices and parsing is complete
        if (parserRef.current.isComplete()) {
          const parsedChoices = parserRef.current.getChoices();
          if (parsedChoices.length > 0) {
            setChoices(parsedChoices);
            
            // Update conversation manager with choices
            if (currentConversationId) {
              const manager = conversationManagerRef.current;
              manager.updateCurrentConversation(segments, parsedChoices).catch(console.error);
              // Update context segments when choices appear
              manager.getConversationContext(currentConversationId, 5)
                .then(context => setContextSegments(context))
                .catch(console.error);
            }
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

  // Extract key information from character dialogue for the illustrated book
  const extractCharacterInformation = useCallback((text: string): string | null => {
    // Skip actions (text wrapped in parentheses) - we only want dialogue in the info book
    if (text.startsWith('(') && text.endsWith(')')) {
      console.log('📖 Skipping action:', text);
      return null;
    }
    
    // Skip very short text (likely not meaningful)
    if (text.length < 10) {
      console.log('📖 Skipping short text:', text);
      return null;
    }
    
    // Skip only extremely basic phrases that add no information
    const skipPhrases = [
      'Indeed.',
      'Ha!'
    ];
    
    for (const phrase of skipPhrases) {
      if (text.trim() === phrase) {
        console.log('📖 Skipping basic phrase:', text);
        return null;
      }
    }
    
    // Capture meaningful character dialogue only
    console.log('📖 Capturing dialogue:', text);
    return text.trim();
  }, []);

  const handleChoiceSelected = useCallback(async (choice: Choice) => {
    console.log('🟡 CHOICE SELECTED:', choice.text);
    
    // Start background music (user interaction allows autoplay)
    musicManager.handleUserInteraction();
    
    // Calculate updated states BEFORE making API call
    let updatedCompletedThreads = [...completedThreadsRef.current]; // Use ref for immediate access
    const updatedCharacterProgress = { ...characterProgressRef.current }; // Use ref for immediate access
    
    console.log('🔧 Starting with existing character progress (ref):', JSON.stringify(characterProgressRef.current, null, 2));
    console.log('🔧 Starting with existing character progress (state):', JSON.stringify(characterProgress, null, 2));
    console.log('🔧 Starting with completedThreads:', completedThreads);
    
    // Track character progress when they start L2 (actual conversation depth)
    console.log('🔧 Checking choice ID for progress tracking:', choice.id);
    if (choice.id.includes('_l1_')) {
      const character = choice.id.split('_')[0]; // Extract character from lumine_l1_honest, zhongli_l1_etiquette, etc.
      console.log('✅ L1 choice detected for character:', character);
      // Character should already be in encounteredCharacters from initial story
      // Track that this character has progressed to L2
      updatedCharacterProgress[character] = 'L2';
      characterProgressRef.current[character] = 'L2'; // Update ref immediately
      setCharacterProgress(prev => ({ ...prev, [character]: 'L2' })); // Update state
      console.log('📈 Character progress updated:', character, '-> L2');
    } else {
      console.log('❌ No L1 match for choice ID:', choice.id);
    }
    
    // Track character progress for L2 choices
    if (choice.id.includes('_l2_')) {
      const character = choice.id.split('_')[0];
      updatedCharacterProgress[character] = 'CLOSE';
      characterProgressRef.current[character] = 'CLOSE'; // Update ref immediately
      setCharacterProgress(prev => ({ ...prev, [character]: 'CLOSE' })); // Update state
      console.log('📈 Character progress updated:', character, '-> CLOSE');
      console.log('📈 Full updatedCharacterProgress:', updatedCharacterProgress);
    }
    
    // Check if this choice completes a character thread
    if (choice.id.startsWith('hub_return_after_')) {
      const character = choice.id.replace('hub_return_after_', '');
      console.log('🔍 Detected hub_return_after choice for character:', character);
      console.log('🔍 Current completedThreads:', completedThreads);
      console.log('🔍 Current completedThreadsRef:', completedThreadsRef.current);
      if (!completedThreadsRef.current.includes(character)) {
        updatedCompletedThreads = [...completedThreadsRef.current, character];
        completedThreadsRef.current = updatedCompletedThreads; // Update ref immediately
        setCompletedThreads(updatedCompletedThreads); // Update state
        console.log('✅ Thread completed for:', character, 'Updated list:', updatedCompletedThreads);
      } else {
        console.log('⚠️ Thread already marked as completed for:', character);
      }
    }
    
    // Update conversation manager with selected choice
    if (currentConversationId) {
      const manager = conversationManagerRef.current;
      manager.updateCurrentConversation(segments, choices, choice.id).catch(console.error);
    }

    setChoices([]);
    setState(prev => {
      const newHistory = [...prev.storyHistory, choice.text];
      console.log('🎯 Adding choice to history:', choice.text);
      console.log('🎯 Previous history:', prev.storyHistory);
      console.log('🎯 New history:', newHistory);
      return {
        ...prev,
        showChoices: false,
        storyHistory: newHistory,
      };
    });

    // Continue the story based on the choice made
    console.log('🟡 Continuing story based on choice:', choice.text);
    console.log('🟡 Current segments before reset:', segments.length);
    
    // Reset story state for choice continuation
    setSegments([]);
    setChoices([]);
    setIsLoading(true);
    setError(null);
    
    // CRITICAL: Reset currentStoryIndex to 0 for new choice content
    setState(prev => ({
      ...prev,
      currentStoryIndex: 0,
      showChoices: false,
      waitingForContinue: false
    }));
    
    console.log('🟡 Segments cleared, story index reset to 0, making API request...');
    
    // Clear parser state
    if (parserRef.current) {
      console.log('🔄 Resetting parser state before new choice');
      parserRef.current.reset();
    }
    
    // Start story continuation with choice
    try {
      console.log('🚀 Making API request for choice ID:', choice.id);
      console.log('🚀 Sending updatedCompletedThreads:', updatedCompletedThreads);
      console.log('🚀 Sending updatedCharacterProgress:', JSON.stringify(updatedCharacterProgress, null, 2));
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          choice: choice.id, // Send choice ID for routing
          completedThreads: updatedCompletedThreads, // Send updated completed threads for choice filtering
          characterProgress: updatedCharacterProgress // Send updated character progress to resume conversations
        }),
      });

      if (!response.ok) throw new Error('Failed to continue story');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let buffer = '';
      let accumulatedSegments: StorySegment[] = [];
      let accumulatedChoices: Choice[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        
        if (parserRef.current) {
          const newSegments = parserRef.current.processChunk(buffer);
          const newChoices = parserRef.current.getChoices();
          
          // Debug what content is being parsed
          if (newSegments.length > 0) {
            console.log('🟡 NEW SEGMENTS PARSED:', newSegments.length, 'segments');
          }
          
          // Accumulate new segments and choices
          if (newSegments.length > 0) {
            accumulatedSegments = [...accumulatedSegments, ...newSegments];
            setSegments(accumulatedSegments);
            console.log('🟢 Accumulated segments:', accumulatedSegments.length, 'First segment:', accumulatedSegments[0]?.text?.substring(0, 30) + '...');
            
            // Extract information from character segments for the book AND add to encountered characters
            newSegments.forEach(segment => {
              if (segment.speaker !== 'NARRATOR') {
                const character = segment.speaker.toLowerCase();
                console.log('📖 [CHOICE PATH] Processing segment for', character, ':', segment.text);
                
                // Add character to encountered list when we see them in choice responses
                setEncounteredCharacters(prev => {
                  if (!prev.includes(character)) {
                    console.log('👥 [CHOICE PATH] Character met in choice response:', character);
                    return [...prev, character];
                  }
                  return prev;
                });
                
                const info = extractCharacterInformation(segment.text);
                if (info) {
                  console.log('📖 [CHOICE PATH] Adding info for', character, ':', info);
                  setCharacterInformation(prev => {
                    const existingInfo = prev[character] || [];
                    // Only add if not already present (deduplication)
                    if (!existingInfo.includes(info)) {
                      console.log('📖 [CHOICE PATH] New info added for', character, '. Total info:', [...existingInfo, info].length);
                      return {
                        ...prev,
                        [character]: [...existingInfo, info]
                      };
                    }
                    console.log('📖 [CHOICE PATH] Info already exists for', character, '. Total info:', existingInfo.length);
                    return prev;
                  });
                } else {
                  console.log('📖 [CHOICE PATH] No info extracted for', character, '- reason:', segment.text.startsWith('(') ? 'action' : 'filtered');
                }
              }
            });
          }
          if (newChoices.length > 0) {
            accumulatedChoices = [...accumulatedChoices, ...newChoices];
            setChoices(accumulatedChoices);
            console.log('🟢 Accumulated choices:', accumulatedChoices.length);
          }
        }
      }
    } catch (error) {
      console.error('Error continuing story:', error);
      setError(error instanceof Error ? error.message : 'Failed to continue story');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTypingComplete = useCallback(() => {
    console.log('🟢🟢🟢 HANDLE TYPING COMPLETE CALLED 🟢🟢🟢');
    console.log('🟢 Current state:', { 
      currentStoryIndex: state.currentStoryIndex, 
      segmentsLength: segments.length, 
      choicesLength: choices.length,
      waitingForContinue 
    });
    setState(prev => {
      const newIndex = prev.currentStoryIndex + 1;
      console.log('🟢 NORMAL: Current index:', prev.currentStoryIndex, 'New index:', newIndex, 'Segments length:', segments.length, 'Choices:', choices.length);
      
      // If we've displayed all segments
      if (newIndex >= segments.length) {
        console.log('🟢 NORMAL: All segments complete, checking for choices...');
        if (choices.length > 0) {
          console.log('🟢 NORMAL: Setting showChoices to true');
          return {
            ...prev,
            currentStoryIndex: newIndex,
            showChoices: true,
            isTyping: false,
          };
        } else {
          console.log('🟢 NORMAL: No choices, completing story');
          // No more choices - story is complete
          setStoryCompleted(true);
          
          // Generate story summary for stories without explicit choices
          if (segments.length > 0) {
            const choicesMade = state.storyHistory.slice(1);
            // const characters = encounteredCharacters.map(char => char.charAt(0).toUpperCase() + char.slice(1));
            
            const summary = `🎭 Story Complete! 🎭

Your journey began with: "${state.storyHistory[0] || 'An adventure in unknown lands'}"

📝 Choices Made: ${choicesMade.length}
${choicesMade.map((choiceText, i) => `   ${i + 1}. ${choiceText}`).join('\n')}

Your unique path through this tale has been shaped by every decision you made. Each choice led to different encounters, conversations, and outcomes.

Thank you for experiencing this interactive story!`;
            
            setStorySummary(summary);
          }
          
          return {
            ...prev,
            currentStoryIndex: newIndex,
            isTyping: false,
          };
        }
      }
      
      // Check if we need to pause or continue
      if (newIndex < segments.length) {
        const currentSegment = segments[prev.currentStoryIndex];
        const nextSegment = segments[newIndex];
        
        console.log('🟡 Current segment:', currentSegment?.speaker, currentSegment?.text?.substring(0, 30));
        console.log('🟡 Next segment:', nextSegment?.speaker, nextSegment?.text?.substring(0, 30));
        
        // Always pause after each segment to give user control
        console.log('🟡 Pausing after segment for user control');
        console.log('🟡 NOT incrementing index yet - waiting for continue button');
        setWaitingForContinue(true);
        return {
          ...prev,
          // DON'T increment currentStoryIndex here - let continue button do it
          isTyping: false,
        };
      }
      
      // We've reached the end - don't set waitingForContinue, let choices show
      return {
        ...prev,
        currentStoryIndex: newIndex,
        isTyping: false,
      };
    });
  }, [segments, choices.length]);

  const handleContinue = useCallback(() => {
    console.log('🔵🔵🔵 CONTINUE BUTTON CLICKED 🔵🔵🔵');
    console.log('🔵 Current state before continue:', {
      currentStoryIndex: state.currentStoryIndex,
      segmentsLength: segments.length,
      waitingForContinue
    });
    
    setWaitingForContinue(false);
    
    // NOW increment the currentStoryIndex and start typing the next segment
    setState(prev => {
      const nextIndex = prev.currentStoryIndex + 1;
      console.log('🔵 Continue: Advancing from index', prev.currentStoryIndex, 'to', nextIndex);
      console.log('🔵 Continue: Next segment text:', segments[nextIndex]?.text?.substring(0, 50));
      
      if (nextIndex < segments.length) {
        return {
          ...prev,
          currentStoryIndex: nextIndex,
          isTyping: true,
        };
      } else {
        // We've reached the end
        console.log('🔵 Continue: Reached end of segments, showing choices or completing story');
        if (choices.length > 0) {
          return {
            ...prev,
            showChoices: true,
            isTyping: false,
          };
        } else {
          // We've reached the end with no choices
          setStoryCompleted(true);
          // Generate summary after state update
          setTimeout(() => {
            if (segments.length > 0) {
              const choicesMade = state.storyHistory.slice(1);
              // const characters = encounteredCharacters.map(char => char.charAt(0).toUpperCase() + char.slice(1));
              
              const summary = `🎭 Story Complete! 🎭

Your journey began with: "${state.storyHistory[0] || 'An adventure in unknown lands'}"

📝 Choices Made: ${choicesMade.length}
${choicesMade.map((choiceText, i) => `   ${i + 1}. ${choiceText}`).join('\n')}

Your unique path through this tale has been shaped by every decision you made. Each choice led to different encounters, conversations, and outcomes.

Thank you for experiencing this interactive story!`;
              
              setStorySummary(summary);
            }
          }, 100);
          
          return {
            ...prev,
            isTyping: false,
          };
        }
      }
    });
  }, [segments, choices.length, state.currentStoryIndex, waitingForContinue]);

  const generateStorySummary = useCallback(() => {
    if (segments.length === 0) return;
    
    const choicesMade = state.storyHistory.slice(1); // Exclude initial prompt
    const characters = [...new Set(segments.filter(s => s.speaker !== 'NARRATOR').map(s => s.speaker))];
    
    const summary = `🎭 Story Complete! 🎭

Your journey began with: "${state.storyHistory[0] || 'An adventure in unknown lands'}"

📝 Choices Made: ${choicesMade.length}
${choicesMade.map((choice, i) => `   ${i + 1}. ${choice}`).join('\n')}

Your unique path through this tale has been shaped by every decision you made. Each choice led to different encounters, conversations, and outcomes.

Thank you for experiencing this interactive story!`;
    
    setStorySummary(summary);
  }, [segments, state.storyHistory]);

  const handleSkipTyping = useCallback(() => {
    console.log('🔴 SKIP BUTTON PRESSED - handleSkipTyping called');
    console.log('🔴 SKIP DEBUG:', {
      currentIndex: state.currentStoryIndex,
      segmentsLength: segments.length,
      choicesLength: choices.length,
      waitingForContinue,
      storyCompleted,
      showChoices: state.showChoices
    });
    
    const currentSegment = segments[state.currentStoryIndex];
    const nextIndex = state.currentStoryIndex + 1;
    
    console.log('🔴 SKIP: Current segment:', currentSegment?.speaker, currentSegment?.text?.substring(0, 50) + '...');
    console.log('🔴 SKIP: Next index:', nextIndex, 'vs segments length:', segments.length);
    
    // If we're at the last segment and have choices, show them immediately
    if (nextIndex >= segments.length && choices.length > 0) {
      console.log('🔴 SKIP: At last segment with choices - setting showChoices to true');
      setState(prev => ({
        ...prev,
        showChoices: true,
        isTyping: false
      }));
      return;
    }
    
    // If we're at the last segment but no choices, complete the story
    if (nextIndex >= segments.length && choices.length === 0) {
      console.log('🔴 SKIP: At last segment with no choices - completing story');
      setStoryCompleted(true);
      generateStorySummary();
      return;
    }
    
    // Always pause after skipping (unless we're at the very last segment)
    if (nextIndex < segments.length) {
      console.log('🔴 SKIP: Setting waitingForContinue to true for user control');
      setWaitingForContinue(true);
    }
  }, [segments, state.currentStoryIndex, choices.length, waitingForContinue, storyCompleted, generateStorySummary]);

  const currentSegment = segments[state.currentStoryIndex];
  const shouldShowChoices = (choices.length > 0 && state.currentStoryIndex >= segments.length && !waitingForContinue && !storyCompleted) || state.showChoices;
  
  // Debug current segment
  console.log('🟠 CURRENT SEGMENT DEBUG:', {
    currentStoryIndex: state.currentStoryIndex,
    totalSegments: segments.length,
    currentSegment: currentSegment ? {
      speaker: currentSegment.speaker,
      text: currentSegment.text.substring(0, 50) + '...'
    } : null,
    waitingForContinue,
    shouldShowChoices
  });

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
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-700"
              rows={4}
              disabled={isLoading}
            />
            
            <button
              onClick={() => startStory(prompt)}
              disabled={isLoading || !prompt.trim()}
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
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

        {/* Conversation Sidebar */}
        <ConversationSidebar
          isOpen={showSidebar}
          onToggle={() => setShowSidebar(!showSidebar)}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
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
          <div className="w-32 h-1 bg-gradient-to-r from-pink-400 to-rose-400 mx-auto rounded shadow-lg"></div>
          
          {/* Character Book Button */}
          <button
            onClick={() => {
              console.log('📖 Opening book. Current character info:', characterInformation);
              console.log('📖 Encountered characters:', encounteredCharacters);
              setShowBook(true);
            }}
            className="absolute top-0 right-16 p-2 text-white/80 hover:text-white transition-colors drop-shadow-md"
            title="Character Information Book"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>

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

        {/* Initial Prompt Display */}
        {currentConversationId && (
          <div className="mb-6 mx-auto max-w-4xl">
            <div className="bg-pink-500/10 backdrop-blur-sm border border-pink-300/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-pink-200 mb-1 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Story Context
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {prompt}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-xs text-pink-300/70">
                    {(() => {
                      // Find current conversation from the conversations state
                      const current = conversations.find(conv => conv.id === currentConversationId);
                      if (current) {
                        const date = new Date(current.date);
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        
                        if (date.toDateString() === today.toDateString()) {
                          return 'Today';
                        } else if (date.toDateString() === yesterday.toDateString()) {
                          return 'Yesterday';
                        } else {
                          return date.toLocaleDateString();
                        }
                      }
                      return 'New';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Story Content */}
        <div className="max-w-6xl mx-auto">
          {currentSegment ? (
            <StoryDisplay
              segment={currentSegment}
              onTypingComplete={handleTypingComplete}
              onSkipTyping={handleSkipTyping}
              showSkipButton={true}
            />
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white drop-shadow-md">Loading your story...</p>
            </div>
          ) : null}

          {/* Choices */}
          <ChoiceSystem
            choices={choices}
            onChoiceSelected={handleChoiceSelected}
            isVisible={shouldShowChoices}
            contextSegments={contextSegments}
            allSegments={segments}
            previousChoices={(() => {
              const choices = state.storyHistory.slice(1);
              console.log('🎯 Previous choices being passed to ChoiceSystem:', choices);
              console.log('🎯 Full storyHistory:', state.storyHistory);
              return choices;
            })()}
            hubText={currentSegment?.speaker === 'NARRATOR' && currentSegment?.text === 'Who do you sit with?' ? 'Who do you sit with?' : undefined}
          />

          {/* Continue Button for character transitions */}
          {waitingForContinue && !isLoading && (
            <div className="text-center mt-8">
              <button
                onClick={handleContinue}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 backdrop-blur-sm text-white font-semibold py-4 px-10 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Continue
              </button>
              <p className="text-pink-200 text-sm mt-2 opacity-75">
                {currentConversationId ? 'Click to continue the loaded conversation' : 'Click to continue the conversation'}
              </p>
            </div>
          )}

          {/* Story Completion */}
          {storyCompleted && (
            <div className="max-w-2xl mx-auto mt-8 p-6 bg-gradient-to-br from-purple-900/80 to-pink-900/80 backdrop-blur-sm rounded-xl border border-pink-300/20 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300 mb-2">
                  🎭 Story Complete! 🎭
                </h2>
                <p className="text-pink-200">Your adventure has reached its conclusion</p>
              </div>
              
              <div className="bg-black/20 rounded-lg p-4 mb-6">
                <pre className="text-sm text-white whitespace-pre-wrap font-mono leading-relaxed">
                  {storySummary}
                </pre>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    // Complete reset of all state
                    setStoryCompleted(false);
                    setStorySummary('');
                    setSegments([]);
                    setChoices([]);
                    setWaitingForContinue(false);
                    setIsLoading(false);
                    setError(null);
                    setPrompt('');
                    setContextSegments([]);
                    setState({
                      currentStoryIndex: 0,
                      displayedText: '',
                      isTyping: false,
                      showChoices: false,
                      storyHistory: [],
                    });
                    // Reset parser
                    parserRef.current.reset();
                    // Abort any ongoing requests
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                    }
                    setHasStarted(false);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Start New Story
                </button>
                <button
                  onClick={() => setStoryCompleted(false)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Close Summary
                </button>
              </div>
            </div>
          )}

          {/* Auto-Continue Button for same character */}
          {!shouldShowChoices && 
           !isLoading && 
           !waitingForContinue &&
           !storyCompleted &&
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
                className="bg-pink-500/70 hover:bg-pink-600/80 backdrop-blur-sm text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-md text-sm"
              >
                Next Segment
              </button>
              <p className="text-pink-200 text-xs mt-1 opacity-60">
                Continue
              </p>
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

        {/* Illustrated Book */}
        <IllustratedBook
          isVisible={showBook}
          onClose={() => {
            console.log('📖 Closing book. Current character info:', characterInformation);
            setShowBook(false);
          }}
          characterInformation={characterInformation}
          encounteredCharacters={encounteredCharacters}
        />

        {/* Conversation Sidebar */}
        <ConversationSidebar
          isOpen={showSidebar}
          onToggle={() => setShowSidebar(!showSidebar)}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>
    </div>
  );
}
