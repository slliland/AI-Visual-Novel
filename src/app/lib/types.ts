export type Speaker = 'NARRATOR' | 'LUMINE' | 'TARTAGLIA' | 'VENTI' | 'ZHONGLI';

export type Emotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' | 'confident' | 'concern' | 'annoyed'
  | 'blushing' | 'crying' | 'disgusted' | 'fear' | 'very happy' | 'deeply in love';

export interface Choice {
  id: string;
  text: string;
  isSpecial?: boolean;
  currentCharacter?: string;
  disabled?: boolean;
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

export interface ConversationSection {
  id: string;
  title: string;
  date: Date;
  initialPrompt: string;
  segments: StorySegment[];
  choices: Choice[];
  selectedChoices: string[];
}

export interface ConversationHistory {
  conversations: ConversationSection[];
  currentConversationId: string | null;
}