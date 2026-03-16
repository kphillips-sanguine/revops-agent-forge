import { create } from 'zustand';
import { mockBuilderGenerate } from '../mocks/builder';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface BuilderState {
  messages: ChatMessage[];
  currentDefinition: string | null;
  isGenerating: boolean;
  conversationId: string;
  sendMessage: (content: string) => Promise<void>;
  updateDefinition: (definition: string) => void;
  reset: () => void;
}

let msgCounter = 0;
function nextMsgId(): string {
  return `msg_${Date.now()}_${++msgCounter}`;
}

function newConversationId(): string {
  return `conv_${Date.now()}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'msg_welcome',
  role: 'system',
  content:
    "Welcome to AgentForge Builder! Describe what you want your agent to do, and I'll create the definition for you.",
  timestamp: new Date().toISOString(),
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  messages: [WELCOME_MESSAGE],
  currentDefinition: null,
  isGenerating: false,
  conversationId: newConversationId(),

  sendMessage: async (content: string) => {
    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isGenerating: true,
    }));

    try {
      const { currentDefinition } = get();
      const response = await mockBuilderGenerate(content, currentDefinition);

      const assistantMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: response.explanation,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        currentDefinition: response.definition,
        isGenerating: false,
      }));
    } catch {
      const errorMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: 'Sorry, something went wrong while generating the agent definition. Please try again.',
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
        isGenerating: false,
      }));
    }
  },

  updateDefinition: (definition: string) => {
    set({ currentDefinition: definition });
  },

  reset: () => {
    set({
      messages: [{ ...WELCOME_MESSAGE, id: nextMsgId(), timestamp: new Date().toISOString() }],
      currentDefinition: null,
      isGenerating: false,
      conversationId: newConversationId(),
    });
  },
}));
