import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from './types';
import { sendMessageToGemini, resetSession, checkConnection } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import { INITIAL_GREETING } from './constants';

const STORAGE_KEY = 'grammar_galaxy_history';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(true); // Assume true initially to prevent flicker

  // Check connection on mount
  useEffect(() => {
    const connected = checkConnection();
    setHasKey(connected);
  }, []);

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

  // 🚨 CRITICAL ALERT SCREEN IF KEY IS MISSING
  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-100 p-6">
         <div className="max-w-lg w-full bg-red-950/30 border border-red-500/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center">
            <div className="text-5xl mb-6">⚠️</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">통신 시스템 오프라인</h1>
            <p className="text-slate-300 mb-6 leading-relaxed">
              API 키가 감지되지 않아 Grammar Galaxy에 접속할 수 없습니다.<br/>
              Vercel 배포 환경 변수가 올바르게 설정되지 않았습니다.
            </p>
            
            <div className="bg-black/40 rounded-lg p-4 text-left text-sm font-mono text-indigo-300 mb-6 border border-white/10 overflow-x-auto">
              <p className="mb-2 text-slate-400">// Vercel 설정에서 Key 이름을 아래 중 하나로 변경하세요:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>VITE_VAIT_API_KEY <span className="text-green-400">(추천)</span></li>
                <li>NEXT_PUBLIC_VAIT_API_KEY</li>
                <li>REACT_APP_VAIT_API_KEY</li>
              </ul>
            </div>

            <div className="bg-indigo-900/40 p-3 rounded-lg text-sm text-indigo-200 mb-6">
              💡 <strong>Tip:</strong> 변수 추가/변경 후에는 반드시 
              <span className="font-bold underline ml-1">Redeploy (재배포)</span>를 해야 적용됩니다.
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              설정 완료 후 새로고침
            </button>
         </div>
      </div>
    );
  }

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