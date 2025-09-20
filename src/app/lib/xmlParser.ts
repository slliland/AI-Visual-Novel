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

    // Process complete tags in the buffer
    let lastProcessedIndex = 0;

    // Handle Narrator segments
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
      lastProcessedIndex = narratorMatch.index + narratorMatch[0].length;
    }

    // Handle character segments with more complex parsing (multiline format)
    const characterRegex = /<character name="([^"]+)">(.*?)<\/character>/gs;
    let characterMatch;
    while ((characterMatch = characterRegex.exec(this.state.buffer)) !== null) {
      const characterName = characterMatch[1].toUpperCase() as Speaker;
      const characterContent = characterMatch[2];

      // Extract actions and dialogue
      const actionRegex = /<action expression="([^"]+)">(.*?)<\/action>/g;
      const sayRegex = /<say>(.*?)<\/say>/g;

      let emotion: Emotion = 'neutral';
      const textParts: string[] = [];

      // Get the last emotion from actions
      let actionMatch;
      while ((actionMatch = actionRegex.exec(characterContent)) !== null) {
        emotion = this.normalizeEmotion(actionMatch[1]);
        textParts.push(actionMatch[2].trim());
      }

      // Get dialogue
      let sayMatch;
      while ((sayMatch = sayRegex.exec(characterContent)) !== null) {
        textParts.push(sayMatch[1].trim());
      }

      if (textParts.length > 0) {
        const segment: StorySegment = {
          speaker: characterName,
          emotion: emotion,
          text: textParts.join(' '),
        };
        this.state.segments.push(segment);
        newSegments.push(segment);
      }

      lastProcessedIndex = characterMatch.index + characterMatch[0].length;
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
      const choiceRegex = /<choice id="([^"]+)">(.*?)<\/choice>/g;
      
      let singleChoiceMatch;
      while ((singleChoiceMatch = choiceRegex.exec(choicesContent)) !== null) {
        const choice: Choice = {
          id: singleChoiceMatch[1],
          text: singleChoiceMatch[2].trim(),
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

    return newSegments;
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
