export type Speaker = 'NARRATOR' | 'LUMINE' | 'TARTAGLIA' | 'VENTI' | 'ZHONGLI';

export type Emotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' | 'confident' | 'concern' | 'annoyed'
  | 'blushing' | 'crying' | 'disgusted' | 'fear' | 'very happy' | 'deeply in love';

export interface Choice {
  id: string;
  text: string;
}

export interface StorySegment {
  speaker: Speaker;
  emotion: Emotion;
  text: string;
}

export interface ParsedStoryData {
  segments: StorySegment[];
  choices: Choice[];
}

export interface StreamingParserState {
  buffer: string;
  currentSegment: Partial<StorySegment> | null;
  segments: StorySegment[];
  choices: Choice[];
  isComplete: boolean;
}

export interface VisualNovelState {
  currentStoryIndex: number;
  displayedText: string;
  isTyping: boolean;
  showChoices: boolean;
  storyHistory: string[];
}