import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from './types';
import { sendMessageToGemini, resetSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import { INITIAL_GREETING } from './constants';

const STORAGE_KEY = 'grammar_galaxy_history';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRestored, setIsRestored] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setIsRestored(true);
          return;
        }
      } catch (e) {
        console.error("Failed to restore history", e);
      }
    }
    
    // Default initialization if no history
    setMessages([{
      id: 'init-1',
      text: INITIAL_GREETING,
      sender: Sender.Bot,
      timestamp: Date.now(),
    }]);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isRestored]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: text,
      sender: Sender.User,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(text);
      
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: responseText,
        sender: Sender.Bot,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        sender: Sender.Bot,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("새로운 임무를 시작하시겠습니까?\n이전 탐험 기록은 삭제됩니다.")) {
        resetSession();
        localStorage.removeItem(STORAGE_KEY);
        setMessages([
            {
              id: `init-${Date.now()}`,
              text: INITIAL_GREETING,
              sender: Sender.Bot,
              timestamp: Date.now(),
            },
        ]);
        setIsRestored(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Stars Effect */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-indigo-900/50 shadow-lg shadow-indigo-500/10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-indigo-500/50 shadow-lg border border-white/20">
                <span className="text-xl">🚀</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Grammar Galaxy
              <span className="hidden sm:inline-block ml-2 text-xs font-normal text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-700">
                8품사 탐험대
              </span>
            </h1>
          </div>
          <button 
            onClick={handleReset}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all duration-200 text-sm font-medium text-slate-300"
            title="Start New Mission"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-300"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span className="hidden sm:inline">New Mission</span>
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto pt-20 pb-32 px-4 sm:px-6 relative z-1">
        <div className="max-w-3xl mx-auto space-y-6">
          {isRestored && (
            <div className="text-center py-2 animate-fade-in-down">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-900 shadow-sm">
                ✨ 이전 탐험 기록을 복구했습니다
              </span>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {isLoading && (
             <div className="flex justify-start w-full animate-fade-in">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-5 py-4 shadow-lg flex gap-2 items-center">
                    <span className="text-xs text-indigo-400 font-medium mr-2 tracking-wider">ANALYZING</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
