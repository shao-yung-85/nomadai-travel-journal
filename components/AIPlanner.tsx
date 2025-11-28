
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, AIChatSession, AIChatMessage } from '../types';
import { ChevronLeftIcon, ChatBubbleIcon, SquaresPlusIcon } from './Icons';
import { translations } from '../utils/translations';

interface AIPlannerProps {
  onStartGeneration: (prompt: string, tripId?: string) => Promise<{ title: string; tripId: string } | null>;
  onCancel: () => void;
  settings: AppSettings;
  sessions: AIChatSession[];
  currentSessionId: string | null;
  onCreateSession: () => string;
  onUpdateSession: (sessionId: string, messages: AIChatMessage[], title?: string, tripId?: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
}

const AIPlanner: React.FC<AIPlannerProps> = ({
  onStartGeneration,
  onCancel,
  settings,
  sessions,
  currentSessionId,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onSelectSession
}) => {
  const t = translations[settings.language] || translations['zh-TW'];
  const [input, setInput] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current session messages
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Initialize welcome message if new session
  useEffect(() => {
    if (currentSessionId && messages.length === 0) {
      onUpdateSession(currentSessionId, [{ role: 'ai', content: t.ai_planner_intro, timestamp: Date.now() }]);
    } else if (!currentSessionId && sessions.length === 0) {
      // Create initial session if none exists
      onCreateSession();
    } else if (!currentSessionId && sessions.length > 0) {
      // Select most recent session if none selected
      onSelectSession(sessions[0].id);
    }
  }, [currentSessionId, sessions.length]);

  const handleNewChat = () => {
    onCreateSession();
    setShowSidebar(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userMsg: AIChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];

    // Optimistic update
    onUpdateSession(currentSessionId, newMessages);
    setInput('');
    setIsRequestSent(true);

    // Immediate feedback
    const thinkingMsg: AIChatMessage = { role: 'ai', content: t.ai_planning, timestamp: Date.now() };
    onUpdateSession(currentSessionId, [...newMessages, thinkingMsg]);

    // Fire and forget
    // Pass currentSession.tripId to allow updating existing trip
    onStartGeneration(input, currentSession?.tripId).then((result) => {
      const doneMsg: AIChatMessage = { role: 'ai', content: t.ai_done, timestamp: Date.now() };

      if (result) {
        // Update session with new messages, title, and tripId
        onUpdateSession(currentSessionId, [...newMessages, doneMsg], result.title, result.tripId);
      } else {
        onUpdateSession(currentSessionId, [...newMessages, doneMsg]);
      }

      setIsRequestSent(false);
    });
  };


  return (
    <div className="flex h-full bg-paper pt-safe relative overflow-hidden">
      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="absolute inset-0 bg-black/20 z-20 backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`absolute top-0 left-0 bottom-0 w-64 bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-sand flex justify-between items-center pt-12">
          <h3 className="font-bold text-lg text-ink">
            {settings.language === 'zh-TW' ? '對話紀錄' : 'Chat History'}
          </h3>
          <button onClick={handleNewChat} className="p-2 bg-coral/10 rounded-full text-coral hover:bg-coral/20">
            <SquaresPlusIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => {
                onSelectSession(session.id);
                setShowSidebar(false);
              }}
              className={`p-4 border-b border-sand/50 cursor-pointer hover:bg-sand/30 transition-colors ${currentSessionId === session.id ? 'bg-sand/50 border-l-4 border-l-coral' : ''}`}
            >
              <div className="font-medium text-ink truncate">{session.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(session.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              {settings.language === 'zh-TW' ? '尚無對話紀錄' : 'No chat history'}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        <div className="px-4 py-3 border-b border-sand/50 flex items-center justify-between bg-paper sticky top-0 z-10 pt-12">
          <div className="flex items-center">
            <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-white text-gray-500 transition-colors">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setShowSidebar(true)} className="ml-2 p-2 rounded-full hover:bg-white text-gray-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-ink ml-2 flex items-center gap-2 truncate max-w-[150px]">
              <ChatBubbleIcon className="w-5 h-5 text-coral" />
              {currentSession?.title || t.ai_planner_title}
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.input_placeholder}
              className="flex-1 bg-paper rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-coral/50 transition-all font-medium text-ink placeholder:text-gray-400 border border-sand resize-none min-h-[50px] max-h-[120px]"
              disabled={isRequestSent}
              rows={1}
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
    </div>
  );
};

export default AIPlanner;
