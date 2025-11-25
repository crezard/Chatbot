import React from 'react';
import { Message, Sender } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.User;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-md'
        }`}
      >
        {/* Simple markdown-like rendering for bold text if needed, 
            otherwise just display text. Using whitespace-pre-wrap handles newlines. */}
        {message.text.split(/(\*\*.*?\*\*)/).map((part, index) => {
             if (part.startsWith('**') && part.endsWith('**')) {
                 return <strong key={index} className={isUser ? "text-indigo-100" : "text-indigo-600"}>{part.slice(2, -2)}</strong>;
             }
             return part;
        })}
      </div>
    </div>
  );
};

export default ChatMessage;
