import { create } from 'zustand';
import { generateAgent } from '../api/builder';
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
      const { currentDefinition, messages } = get();

      // Build conversation history from prior messages (excluding system messages)
      const conversationHistory = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      let definition: string;
      let explanation: string;

      try {
        // Try real API first
        const response = await generateAgent({
          prompt: content,
          conversation_history: conversationHistory,
          current_definition: currentDefinition,
        });
        definition = response.definition_md;
        explanation = response.explanation;

        // Append warnings/suggestions to explanation if present
        if (response.warnings.length > 0) {
          explanation += '\n\n**Warnings:**\n' + response.warnings.map((w) => `- ${w}`).join('\n');
        }
        if (response.suggestions.length > 0) {
          explanation +=
            '\n\n**Suggestions:**\n' + response.suggestions.map((s) => `- ${s}`).join('\n');
        }
      } catch {
        // Fall back to mock if API is unavailable
        const mockResponse = await mockBuilderGenerate(content, currentDefinition);
        definition = mockResponse.definition;
        explanation = mockResponse.explanation;
      }

      const assistantMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: explanation,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        currentDefinition: definition,
        isGenerating: false,
      }));
    } catch {
      const errorMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content:
          'Sorry, something went wrong while generating the agent definition. Please try again.',
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
