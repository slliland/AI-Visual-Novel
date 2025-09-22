// Database types for Vercel Postgres

export interface DatabaseConversation {
  id: string;
  title: string;
  initial_prompt: string;
  created_at: Date;
  updated_at: Date;
  user_session: string;
}

export interface DatabaseStorySegment {
  id: string;
  conversation_id: string;
  speaker: string;
  emotion: string;
  text: string;
  segment_order: number;
  created_at: Date;
}

export interface DatabaseChoice {
  id: string;
  conversation_id: string;
  choice_id: string;
  choice_text: string;
  choice_order: number;
  created_at: Date;
}

export interface DatabaseSelectedChoice {
  id: string;
  conversation_id: string;
  choice_id: string;
  selected_at: Date;
}

// API Request/Response types
export interface CreateConversationRequest {
  title: string;
  initialPrompt: string;
  userSession: string;
}

export interface UpdateConversationRequest {
  segments?: Array<{
    speaker: string;
    emotion: string;
    text: string;
  }>;
  choices?: Array<{
    id: string;
    text: string;
  }>;
  selectedChoiceId?: string;
}

export interface ConversationResponse {
  conversation: DatabaseConversation;
  segments: DatabaseStorySegment[];
  choices: DatabaseChoice[];
  selectedChoices: DatabaseSelectedChoice[];
}

export interface ConversationsListResponse {
  conversations: Array<{
    id: string;
    title: string;
    initial_prompt: string;
    created_at: Date;
    updated_at: Date;
    segment_count: number;
    choice_count: number;
  }>;
}
