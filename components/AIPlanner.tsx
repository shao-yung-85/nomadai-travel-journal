
import React, { useState, useRef, useEffect } from 'react';
import { Trip, AppSettings } from '../types';
import { SparklesIcon, ChevronLeftIcon, ChatBubbleIcon } from './Icons';
import { translations } from '../utils/translations';

interface AIPlannerProps {
  onStartGeneration: (prompt: string) => Promise<void>;
  onCancel: () => void;
  settings: AppSettings;
  messages: { role: 'user' | 'ai', content: string }[];
  setMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'ai', content: string }[]>>;
}

const AIPlanner: React.FC<AIPlannerProps> = ({ onStartGeneration, onCancel, settings, messages, setMessages }) => {
  const t = translations[settings.language] || translations['zh-TW'];
  // const [messages, setMessages] = useState... (Removed, using props)
  const [input, setInput] = useState('');
  // Determine if we are in "processing" state to disable input, but not blocking the user
  const [isRequestSent, setIsRequestSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Initialize welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'ai', content: t.ai_planner_intro }]);
    }
  }, [settings.language, messages.length, setMessages, t.ai_planner_intro]);

  const handleNewChat = () => {
    if (window.confirm(settings.language === 'zh-TW' ? '確定要開始新對話嗎？目前的紀錄將被清除。' : 'Start a new chat? Current history will be cleared.')) {
      setMessages([{ role: 'ai', content: t.ai_planner_intro }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsRequestSent(true);

    // Immediate feedback to user
    setMessages(prev => [...prev, {
      role: 'ai',
      content: t.ai_planning
    }]);

    // Fire and forget (handled by App.tsx)
    onStartGeneration(userMsg).then(() => {
      // This part runs when App.tsx finishes the promise (if the user is still on this screen)
      setMessages(prev => [...prev, {
        role: 'ai',
        content: t.ai_done
      }]);
      setIsRequestSent(false);
    });
  };

  return (
    <div className="flex flex-col h-full bg-paper pt-safe pt-12">
      <div className="px-4 py-3 border-b border-sand/50 flex items-center justify-between bg-paper sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-white text-gray-500 transition-colors">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-ink ml-2 flex items-center gap-2">
            <ChatBubbleIcon className="w-5 h-5 text-coral" />
            {t.ai_planner_title}
          </h2>
        </div>
        <button onClick={handleNewChat} className="text-xs font-bold text-coral border border-coral/30 px-3 py-1.5 rounded-full hover:bg-coral/10 transition-colors">
          {settings.language === 'zh-TW' ? '新對話' : 'New Chat'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm whitespace-pre-line ${msg.role === 'user'
              ? 'bg-coral text-white rounded-tr-none'
              : 'bg-white text-ink border border-sand rounded-tl-none'
              }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isRequestSent && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-sand flex items-center gap-2">
              <div className="w-2 h-2 bg-coral rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-coral rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-coral rounded-full animate-bounce delay-200"></div>
              <span className="text-xs text-gray-400 font-bold ml-1">{t.planning_process}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white/90 backdrop-blur border-t border-sand pb-32">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.input_placeholder}
            className="flex-1 bg-paper rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-coral/50 transition-all font-medium text-ink placeholder:text-gray-400 border border-sand"
            disabled={isRequestSent}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isRequestSent}
            className="bg-coral text-white p-3.5 rounded-2xl disabled:opacity-50 active:scale-95 transition-transform shadow-lg shadow-coral/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-2">
          {[t.prompt_tokyo, t.prompt_bangkok, t.prompt_paris].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="whitespace-nowrap px-4 py-2 bg-white text-gray-500 text-xs font-bold rounded-xl border border-sand hover:text-coral hover:border-coral transition-colors"
              disabled={isRequestSent}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPlanner;
