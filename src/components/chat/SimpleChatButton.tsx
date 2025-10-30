import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const SimpleChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'bot', content: string}>>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    // Add user message
    const userMessage = { role: 'user' as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setMessage('');
    
    // Simulate UJbot response
    setTimeout(() => {
      const botResponse = { 
        role: 'bot' as const, 
        content: `Thank you for your message! UJbot is here to help. For real-time assistance with "${message}", please contact our support team or browse our materials and suppliers directory.` 
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-[9999]"
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-16 w-16 bg-blue-600 hover:bg-blue-700 shadow-2xl animate-pulse"
          style={{ borderRadius: '50%', width: '64px', height: '64px' }}
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </Button>
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
          UJ
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-[9999]"
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
    >
      <Card className="w-96 shadow-2xl">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <div>
              <div className="font-semibold">UJbot</div>
              <div className="text-xs">Kenya Construction Expert</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-96 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <>
              <div className="bg-white rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 mt-1 text-blue-600" />
                  <div className="text-sm">
                    <strong className="text-blue-600">UJbot:</strong> Karibu! I can help you with construction materials, prices, suppliers, and deliveries. What would you like to know?
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 py-4">
                Ask me anything about construction in Kenya!
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'bot' && <Bot className="h-4 w-4 mt-1 text-blue-600" />}
                  <div className={`rounded-lg p-3 max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : 'bg-white'
                  }`}>
                    <div className="text-sm">
                      {msg.role === 'bot' && <strong className="text-blue-600">UJbot: </strong>}
                      {msg.content}
                    </div>
                  </div>
                  {msg.role === 'user' && <User className="h-4 w-4 mt-1" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder="Ask UJbot about materials, prices..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  handleSend();
                }
              }}
            />
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Powered by UJbot 🇰🇪
          </div>
        </div>
      </Card>
    </div>
  );
};

