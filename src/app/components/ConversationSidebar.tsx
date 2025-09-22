'use client';

import { ConversationSection } from '../lib/types';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: ConversationSection[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ConversationSidebar({
  isOpen,
  onToggle,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const generateTitle = (prompt: string, date: Date | string): string => {
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = dateObj.toDateString() === today.toDateString();
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();
    
    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isYesterday) {
      dateStr = 'Yesterday';
    } else {
      dateStr = dateObj.toLocaleDateString();
    }
    
    // If no prompt provided, just return the date
    if (!prompt || prompt.trim() === '') {
      return dateStr;
    }
    
    // Create a short title from the prompt (first 30 characters)
    const shortPrompt = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    return `${dateStr}: ${shortPrompt}`;
  };

  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-6 left-6 z-50 p-3 rounded-lg transition-all duration-300 bg-white/90 text-gray-700 hover:bg-pink-50 shadow-md backdrop-blur-sm"
          aria-label="Open conversation history"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white/95 backdrop-blur-sm border-r border-pink-200 shadow-xl transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 pl-6 border-b border-pink-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800 pr-2">Conversation History</h2>
              <button
                onClick={onToggle}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              onClick={onNewConversation}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Conversation</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sortedConversations.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No conversations yet</p>
                <p className="text-sm">Start a new story to begin!</p>
              </div>
            ) : (
              sortedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    conversation.id === currentConversationId
                      ? 'bg-pink-100 border-2 border-pink-300'
                      : 'bg-gray-50 hover:bg-pink-50 border-2 border-transparent hover:border-pink-200'
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 text-sm leading-tight mb-1">
                        {conversation.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {generateTitle('', conversation.date)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {conversation.segments.length} segments • {conversation.choices?.length || 0} choices
                      </p>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                      aria-label="Delete conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-pink-200">
            <div className="text-xs text-gray-500 text-center">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} saved
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}
