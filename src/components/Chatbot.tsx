'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageSquare, Settings, Minimize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ChatMessage, SpreadsheetCommand } from '@/types';
import { parseCommand } from '@/utils/commandParser';

interface ChatbotProps {
  onCommand: (command: SpreadsheetCommand) => void;
}

export default function Chatbot({ onCommand }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: "👋 Hello! I'm your Excel AI Assistant. I can help you with:\n\n📊 Data Analysis\n• Set A1 to 100\n• Calculate sum of A1:A10\n• Sort by column A\n\n📋 Sheet Operations\n• Add row/column\n• Delete cells\n• Format data\n\nJust type your command naturally!",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const command = parseCommand(input);
      
      if (command) {
        onCommand(command);
        
        const successResponses = [
          `✅ Done! Executed: ${command.type.replace('_', ' ')}`,
          `🎯 Perfect! Applied: ${command.type.replace('_', ' ')}`,
          `✨ Success! Completed: ${command.type.replace('_', ' ')}`
        ];
        
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: successResponses[Math.floor(Math.random() * successResponses.length)],
          sender: 'bot',
          timestamp: new Date(),
          command,
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        const helpMessage = `🤔 I didn't understand that command. Here are some examples:

📝 **Data Entry:**
• "Set A1 to 100"
• "Put 'Hello' in B2"

📊 **Calculations:**
• "Sum A1 to A10"
• "Calculate average of B1:B5"

🔧 **Structure:**
• "Add new row"
• "Insert column"
• "Delete cell C3"

Try rephrasing your request!`;
        
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: helpMessage,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: "❌ Sorry, there was an error processing your command. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }

    setInput('');
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ${isMinimized ? 'w-12' : 'w-80'}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Excel AI Assistant</h3>
                <p className="text-xs text-gray-500">Ready to help</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <MessageSquare className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </div>
                <div className={`max-w-[85%] p-2 rounded-lg shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-100'
                }`}>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.message}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="bg-white text-gray-800 p-2 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your data..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter to send</p>
          </div>
        </>
      )}
    </div>
  );
}
