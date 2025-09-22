import { ConversationSection, StorySegment, Choice, Speaker, Emotion } from './types';
import { 
  CreateConversationRequest, 
  UpdateConversationRequest, 
  ConversationResponse
} from './database-types';
import { v4 as uuidv4 } from 'uuid';

export class BackendConversationManager {
  private static instance: BackendConversationManager;
  private userSession: string;
  private currentConversationId: string | null = null;

  private constructor() {
    // Generate or retrieve user session ID
    this.userSession = this.getOrCreateUserSession();
  }

  public static getInstance(): BackendConversationManager {
    if (!BackendConversationManager.instance) {
      BackendConversationManager.instance = new BackendConversationManager();
    }
    return BackendConversationManager.instance;
  }

  private getOrCreateUserSession(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let session = localStorage.getItem('vn-user-session');
    if (!session) {
      session = uuidv4();
      localStorage.setItem('vn-user-session', session);
    }
    return session;
  }

  public async createNewConversation(initialPrompt: string): Promise<string> {
    try {
      const title = this.generateTitle(initialPrompt);
      
      const request: CreateConversationRequest = {
        title,
        initialPrompt,
        userSession: this.userSession,
      };

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data: ConversationResponse = await response.json();
      this.currentConversationId = data.conversation.id;
      
      return data.conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  public async getCurrentConversation(): Promise<ConversationSection | null> {
    if (!this.currentConversationId) return null;
    return this.getConversation(this.currentConversationId);
  }

  public async getConversation(id: string): Promise<ConversationSection | null> {
    try {
      const response = await fetch(`/api/conversations/${id}?userSession=${this.userSession}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch conversation');
      }

      const data: ConversationResponse = await response.json();
      
      // Convert database format to ConversationSection format
      return {
        id: data.conversation.id,
        title: data.conversation.title,
        date: new Date(data.conversation.created_at),
        initialPrompt: data.conversation.initial_prompt,
        segments: data.segments.map(seg => ({
          speaker: seg.speaker as Speaker,
          emotion: seg.emotion as Emotion,
          text: seg.text,
        })),
        choices: data.choices.map(choice => ({
          id: choice.choice_id,
          text: choice.choice_text,
        })),
        selectedChoices: data.selectedChoices.map(sc => sc.choice_id),
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  public async getAllConversations(): Promise<ConversationSection[]> {
    try {
      const response = await fetch(`/api/conversations?userSession=${this.userSession}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      
      // The API now returns full conversation data, no need for individual calls
      const conversations: ConversationSection[] = data.conversations.map((conv: { id: string; title: string; initialPrompt: string; date: string; segments: Array<{ speaker: string; emotion: string; text: string }>; choices: Array<{ id: string; text: string }> }) => ({
        id: conv.id,
        title: conv.title,
        initialPrompt: conv.initialPrompt,
        date: new Date(conv.date),
        segments: conv.segments || [],
        choices: conv.choices || [],
      }));
      
      return conversations.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  public setCurrentConversation(id: string): boolean {
    this.currentConversationId = id;
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('vn-current-conversation', id);
    }
    return true;
  }

  public async updateCurrentConversation(
    segments: StorySegment[],
    choices: Choice[],
    selectedChoice?: string
  ): Promise<void> {
    if (!this.currentConversationId) return;

    try {
      // Get current conversation to determine what's new
      const current = await this.getConversation(this.currentConversationId);
      if (!current) return;

      const newSegments = segments.slice(current.segments.length);
      
      const request: UpdateConversationRequest = {
        segments: newSegments.length > 0 ? newSegments : undefined,
        choices: choices.length > 0 ? choices : undefined,
        selectedChoiceId: selectedChoice,
      };

      const response = await fetch(
        `/api/conversations/${this.currentConversationId}?userSession=${this.userSession}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update conversation');
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  }

  public   async deleteConversation(id: string): Promise<boolean> {
    try {
      console.log('🗑️ Attempting to delete conversation:', id);
      console.log('🗑️ User session:', this.userSession);
      console.log('🗑️ Delete URL:', `/api/conversations/${id}?userSession=${this.userSession}`);
      
      const response = await fetch(
        `/api/conversations/${id}?userSession=${this.userSession}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete conversation failed:', response.status, errorText);
        throw new Error(`Failed to delete conversation: ${response.status} - ${errorText}`);
      }

      // If we deleted the current conversation, clear it
      if (this.currentConversationId === id) {
        this.currentConversationId = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vn-current-conversation');
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  public async clearAllConversations(): Promise<void> {
    try {
      const conversations = await this.getAllConversations();
      
      // Delete all conversations
      for (const conv of conversations) {
        await this.deleteConversation(conv.id);
      }
      
      this.currentConversationId = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vn-current-conversation');
      }
    } catch (error) {
      console.error('Error clearing conversations:', error);
    }
  }

  private generateTitle(prompt: string): string {
    // Extract key words from the prompt to create a meaningful title
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
    
    if (words.length === 0) {
      return 'New Story';
    }

    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  public async getConversationContext(conversationId: string, maxSegments: number = 5): Promise<StorySegment[]> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return [];

    // Return the last few segments for context
    return conversation.segments.slice(-maxSegments);
  }

  public async exportConversations(): Promise<string> {
    const conversations = await this.getAllConversations();
    return JSON.stringify({ conversations, currentConversationId: this.currentConversationId }, null, 2);
  }

  public async importConversations(_data: string): Promise<boolean> {
    // Note: Import functionality would need to be implemented on the backend
    // This is a placeholder for now
    console.warn('Import functionality not yet implemented for backend storage');
    return false;
  }

  // Load current conversation from localStorage on initialization
  public async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vn-current-conversation');
      if (stored) {
        const conversation = await this.getConversation(stored);
        if (conversation) {
          this.currentConversationId = stored;
        }
      }
    }
  }
}
