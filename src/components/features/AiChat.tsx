import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
  }>>([]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user' as const,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // TODO: Implement AI response logic
    const aiResponse = {
      id: (Date.now() + 1).toString(),
      text: 'Thank you for your message. I am currently in development.',
      sender: 'ai' as const,
      timestamp: new Date(),
    };

    setTimeout(() => {
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-500 transition-all duration-300 z-50"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-[#0B0B1E] border border-purple-500/20 rounded-lg shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
        <h3 className="text-lg font-semibold text-purple-100">AI Assistant</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-purple-400 hover:text-purple-300"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/50 text-purple-100'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-purple-500/20">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-purple-900/20 border border-purple-500/20 rounded-lg px-4 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSend}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
