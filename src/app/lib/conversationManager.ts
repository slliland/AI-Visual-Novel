import { ConversationSection, ConversationHistory, StorySegment, Choice } from './types';

const STORAGE_KEY = 'visual-novel-conversations';

export class ConversationManager {
  private static instance: ConversationManager;
  private history: ConversationHistory;

  private constructor() {
    this.history = this.loadFromStorage();
  }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  private loadFromStorage(): ConversationHistory {
    if (typeof window === 'undefined') {
      return { conversations: [], currentConversationId: null };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        parsed.conversations = parsed.conversations.map((conv: ConversationSection) => ({
          ...conv,
          date: new Date(conv.date),
        }));
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }

    return { conversations: [], currentConversationId: null };
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  public createNewConversation(initialPrompt: string): string {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation: ConversationSection = {
      id,
      title: this.generateTitle(initialPrompt),
      date: new Date(),
      initialPrompt,
      segments: [],
      choices: [],
      selectedChoices: [],
    };

    this.history.conversations.unshift(newConversation);
    this.history.currentConversationId = id;
    this.saveToStorage();

    return id;
  }

  public getCurrentConversation(): ConversationSection | null {
    if (!this.history.currentConversationId) return null;
    return this.history.conversations.find(
      conv => conv.id === this.history.currentConversationId
    ) || null;
  }

  public getConversation(id: string): ConversationSection | null {
    return this.history.conversations.find(conv => conv.id === id) || null;
  }

  public getAllConversations(): ConversationSection[] {
    return [...this.history.conversations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public setCurrentConversation(id: string): boolean {
    const conversation = this.history.conversations.find(conv => conv.id === id);
    if (conversation) {
      this.history.currentConversationId = id;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public updateCurrentConversation(
    segments: StorySegment[],
    choices: Choice[],
    selectedChoice?: string
  ): void {
    const current = this.getCurrentConversation();
    if (!current) return;

    current.segments = [...segments];
    current.choices = [...choices];
    
    if (selectedChoice && !current.selectedChoices.includes(selectedChoice)) {
      current.selectedChoices.push(selectedChoice);
    }

    this.saveToStorage();
  }

  public deleteConversation(id: string): boolean {
    const index = this.history.conversations.findIndex(conv => conv.id === id);
    if (index === -1) return false;

    this.history.conversations.splice(index, 1);

    // If we deleted the current conversation, switch to the most recent one
    if (this.history.currentConversationId === id) {
      this.history.currentConversationId = 
        this.history.conversations.length > 0 ? this.history.conversations[0].id : null;
    }

    this.saveToStorage();
    return true;
  }

  public clearAllConversations(): void {
    this.history = { conversations: [], currentConversationId: null };
    this.saveToStorage();
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

  public getConversationContext(conversationId: string, maxSegments: number = 5): StorySegment[] {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return [];

    // Return the last few segments for context
    return conversation.segments.slice(-maxSegments);
  }

  public exportConversations(): string {
    return JSON.stringify(this.history, null, 2);
  }

  public importConversations(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      // Validate the structure
      if (parsed.conversations && Array.isArray(parsed.conversations)) {
        parsed.conversations = parsed.conversations.map((conv: ConversationSection) => ({
          ...conv,
          date: new Date(conv.date),
        }));
        this.history = parsed;
        this.saveToStorage();
        return true;
      }
    } catch (error) {
      console.error('Failed to import conversations:', error);
    }
    return false;
  }
}
