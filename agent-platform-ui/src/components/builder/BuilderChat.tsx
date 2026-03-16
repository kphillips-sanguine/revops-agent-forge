import { useEffect, useRef } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import { useBuilderStore, type ChatMessage } from '../../stores/builderStore';
import ChatInput from './ChatInput';

const SUGGESTION_CHIPS = [
  'Check overdue invoices and notify Slack',
  'Triage new Salesforce cases',
  'Weekly sales performance report',
  'Alert on expiring contracts',
];

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-card-border flex items-center justify-center">
        <Bot className="w-4 h-4 text-gray-400" />
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg rounded-tl-none px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 px-4 justify-end">
        <div className="bg-amber-accent/15 border border-amber-accent/25 rounded-lg rounded-tr-none px-4 py-2.5 max-w-[85%]">
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-accent/20 flex items-center justify-center">
          <User className="w-4 h-4 text-amber-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-card-border flex items-center justify-center">
        {message.role === 'system' ? (
          <Sparkles className="w-4 h-4 text-amber-accent" />
        ) : (
          <Bot className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg rounded-tl-none px-4 py-2.5 max-w-[85%]">
        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="text-gray-100 font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

export default function BuilderChat() {
  const { messages, isGenerating, sendMessage } = useBuilderStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isWelcome = messages.length === 1 && messages[0].role === 'system';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleChipClick = (chip: string) => {
    sendMessage(chip);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Suggestion chips in welcome state */}
        {isWelcome && (
          <div className="px-4">
            <p className="text-xs text-gray-600 mb-2 ml-10">Try one of these:</p>
            <div className="flex flex-wrap gap-2 ml-10">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 text-xs text-gray-400 bg-white/[0.04] hover:bg-white/[0.08] border border-card-border hover:border-amber-accent/40 rounded-full transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {isGenerating && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isGenerating} />
    </div>
  );
}
