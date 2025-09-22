import { StorySegment, Choice, StreamingParserState, Speaker, Emotion } from './types';

export class StreamingXMLParser {
  private state: StreamingParserState = {
    buffer: '',
    currentSegment: null,
    segments: [],
    choices: [],
    isComplete: false,
  };

  /**
   * Process a chunk of streaming XML data
   */
  processChunk(chunk: string): StorySegment[] {
    this.state.buffer += chunk;
    const newSegments: StorySegment[] = [];

    // Track what we've already processed to avoid duplicates
    const previousSegmentCount = this.state.segments.length;
    console.log('🔍 XML Parser: Processing chunk, current segments:', previousSegmentCount, 'buffer length:', this.state.buffer.length);
    
    // Process complete tags in the buffer
    let lastProcessedIndex = 0;

    // Handle required XML format with <character name="SPEAKER" emotion="EMOTION"> tags
    const characterRegex = /<character name="([^"]+)" emotion="([^"]+)">(.*?)<\/character>/gs;
    let characterMatch;
    while ((characterMatch = characterRegex.exec(this.state.buffer)) !== null) {
      const speaker = characterMatch[1].trim().toUpperCase() as Speaker;
      const emotion = this.normalizeEmotion(characterMatch[2].trim());
      const text = characterMatch[3].trim();
      
      if (text) {
        const segment: StorySegment = {
          speaker: speaker === 'NARRATOR' ? 'NARRATOR' : speaker,
          emotion: emotion,
          text: text,
        };
        this.state.segments.push(segment);
        newSegments.push(segment);
      }
      lastProcessedIndex = characterMatch.index + characterMatch[0].length;
    }

    // Handle new XML format with <segment> tags (legacy support)
    const segmentRegex = /<segment>(.*?)<\/segment>/gs;
    let segmentMatch;
    while ((segmentMatch = segmentRegex.exec(this.state.buffer)) !== null) {
      const segmentContent = segmentMatch[1];
      
      // Extract speaker, emotion, and text
      const speakerMatch = /<speaker>(.*?)<\/speaker>/s.exec(segmentContent);
      const emotionMatch = /<emotion>(.*?)<\/emotion>/s.exec(segmentContent);
      const textMatch = /<text>(.*?)<\/text>/s.exec(segmentContent);
      
      if (speakerMatch && textMatch) {
        const speaker = speakerMatch[1].trim().toUpperCase() as Speaker;
        const emotion = this.normalizeEmotion(emotionMatch?.[1]?.trim() || 'neutral');
        const text = textMatch[1].trim();
        
        if (text) {
          const segment: StorySegment = {
            speaker: speaker === 'NARRATOR' ? 'NARRATOR' : speaker,
            emotion: emotion,
            text: text,
          };
          this.state.segments.push(segment);
          newSegments.push(segment);
        }
      }
      lastProcessedIndex = Math.max(lastProcessedIndex, segmentMatch.index + segmentMatch[0].length);
    }

    // Handle Narrator segments (legacy format)
    const narratorRegex = /<Narrator>(.*?)<\/Narrator>/g;
    let narratorMatch;
    while ((narratorMatch = narratorRegex.exec(this.state.buffer)) !== null) {
      const text = narratorMatch[1].trim();
      if (text) {
        const segment: StorySegment = {
          speaker: 'NARRATOR',
          emotion: 'neutral',
          text: text,
        };
        this.state.segments.push(segment);
        newSegments.push(segment);
      }
      lastProcessedIndex = Math.max(lastProcessedIndex, narratorMatch.index + narratorMatch[0].length);
    }

    // Handle character segments with more complex parsing (multiline format - legacy)
    const legacyCharacterRegex = /<character name="([^"]+)">(.*?)<\/character>/gs;
    let legacyCharacterMatch;
    while ((legacyCharacterMatch = legacyCharacterRegex.exec(this.state.buffer)) !== null) {
      const characterName = legacyCharacterMatch[1].toUpperCase() as Speaker;
      const characterContent = legacyCharacterMatch[2];

      // Extract actions and dialogue
      const actionRegex = /<action expression="([^"]+)">(.*?)<\/action>/g;
      const sayRegex = /<say>(.*?)<\/say>/g;

      let emotion: Emotion = 'neutral';

      // Parse actions and dialogue in order they appear
      const actionAndDialogueRegex = /<(action expression="([^"]+)"|say)>(.*?)<\/(action|say)>/g;
      let match;
      
      while ((match = actionAndDialogueRegex.exec(characterContent)) !== null) {
        const tagType = match[1].startsWith('action') ? 'action' : 'say';
        const expressionMatch = match[2]; // emotion from action tag
        const content = match[3].trim();
        
        if (tagType === 'action') {
          // Update emotion for subsequent segments
          emotion = this.normalizeEmotion(expressionMatch);
          
          // Create action segment
          const actionSegment: StorySegment = {
            speaker: characterName,
            emotion: emotion,
            text: `(${content})`,
          };
          this.state.segments.push(actionSegment);
          newSegments.push(actionSegment);
        } else if (tagType === 'say') {
          // Create dialogue segment with current emotion
          const dialogueSegment: StorySegment = {
            speaker: characterName,
            emotion: emotion,
            text: content,
          };
          this.state.segments.push(dialogueSegment);
          newSegments.push(dialogueSegment);
        }
      }

      lastProcessedIndex = legacyCharacterMatch.index + legacyCharacterMatch[0].length;
    }

    // Handle inline character segments (single line format from original sample)
    const inlineCharacterRegex = /<character name="([^"]+)">\s*<action expression="([^"]+)">[^<]*<\/action>\s*<say>([^<]+)<\/say>[^<]*<\/character>/g;
    let inlineMatch;
    while ((inlineMatch = inlineCharacterRegex.exec(this.state.buffer)) !== null) {
      const characterName = inlineMatch[1].toUpperCase() as Speaker;
      const emotion = this.normalizeEmotion(inlineMatch[2]);
      const dialogue = inlineMatch[3].trim();

      if (dialogue) {
        const segment: StorySegment = {
          speaker: characterName,
          emotion: emotion,
          text: dialogue,
        };
        
        // Check if we already processed this segment
        const alreadyExists = this.state.segments.some(s => 
          s.speaker === segment.speaker && 
          s.text === segment.text && 
          s.emotion === segment.emotion
        );

        if (!alreadyExists) {
          this.state.segments.push(segment);
          newSegments.push(segment);
        }
      }

      lastProcessedIndex = Math.max(lastProcessedIndex, inlineMatch.index + inlineMatch[0].length);
    }

    // Parse choices (typically at the end)
    const choicesRegex = /<choices>(.*?)<\/choices>/gs;
    const choiceMatch = choicesRegex.exec(this.state.buffer);
    if (choiceMatch) {
      const choicesContent = choiceMatch[1];
      const choiceRegex = /<choice id="([^"]+)"(?:\s+disabled="([^"]+)")?>(.*?)<\/choice>/g;
      
      let singleChoiceMatch;
      while ((singleChoiceMatch = choiceRegex.exec(choicesContent)) !== null) {
        const choice: Choice = {
          id: singleChoiceMatch[1],
          text: singleChoiceMatch[3].trim(),
          disabled: singleChoiceMatch[2] === 'true',
        };
        
        // Only add if not already present
        if (!this.state.choices.find(c => c.id === choice.id)) {
          this.state.choices.push(choice);
        }
      }
      
      if (this.state.choices.length > 0) {
        this.state.isComplete = true;
      }
    }


    // If no choices are found but we have content, check if we should add default choices
    // This handles the original sample.xml format which doesn't have explicit choices
    if (this.state.choices.length === 0 && this.state.segments.length > 0) {
      // Check if the buffer seems complete (no unclosed tags)
      const hasUnclosedTags = this.state.buffer.includes('<') && 
        !this.state.buffer.includes('>') ||
        (this.state.buffer.match(/</g) || []).length > (this.state.buffer.match(/>/g) || []).length;
      
      if (!hasUnclosedTags && this.state.buffer.trim().length < 50) {
        // Likely at the end of content, add some default choices
        this.state.choices = [
          { id: 'approach_lumine', text: 'Approach Lumine and ask about her travels between worlds' },
          { id: 'talk_zhongli', text: 'Sit with Zhongli and inquire about the contracts he mentioned' },
          { id: 'challenge_tartaglia', text: 'Accept Tartaglia\'s challenge and show your fighting prowess' },
          { id: 'listen_venti', text: 'Listen to Venti\'s music and share a story of your own' }
        ];
        this.state.isComplete = true;
      }
    }

    // Keep only unprocessed part of buffer
    if (lastProcessedIndex > 0) {
      this.state.buffer = this.state.buffer.slice(lastProcessedIndex);
    }

    // Only return segments that are actually new since the last processChunk call
    const actuallyNewSegments = this.state.segments.slice(previousSegmentCount);
    console.log('🔍 XML Parser: Returning', actuallyNewSegments.length, 'new segments, total segments now:', this.state.segments.length);
    return actuallyNewSegments;
  }

  /**
   * Normalize emotion strings to match our avatar file names
   */
  private normalizeEmotion(emotion: string): Emotion {
    const normalized = emotion.toLowerCase();
    
    // Map variations to our standard emotions
    const emotionMap: { [key: string]: Emotion } = {
      'very happy': 'very happy',
      'deeply in love': 'deeply in love',
      'surprised': 'surprised',
      'thinking': 'thinking',
      'confident': 'confident',
      'concern': 'concern',
      'annoyed': 'annoyed',
      'blushing': 'blushing',
      'crying': 'crying',
      'disgusted': 'disgusted',
      'fear': 'fear',
      'neutral': 'neutral',
      'happy': 'happy',
      'sad': 'sad',
      'angry': 'angry',
    };

    return emotionMap[normalized] || 'neutral';
  }

  /**
   * Get all processed segments
   */
  getSegments(): StorySegment[] {
    return [...this.state.segments];
  }

  /**
   * Get all parsed choices
   */
  getChoices(): Choice[] {
    return [...this.state.choices];
  }

  /**
   * Check if parsing is complete
   */
  isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * Reset parser state for new story
   */
  reset(): void {
    this.state = {
      buffer: '',
      currentSegment: null,
      segments: [],
      choices: [],
      isComplete: false,
    };
  }
}
