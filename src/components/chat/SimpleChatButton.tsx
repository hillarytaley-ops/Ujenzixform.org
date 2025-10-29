import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const SimpleChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

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
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
          AI
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
              <div className="font-semibold">AI Assistant</div>
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
          <div className="bg-white rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 mt-1" />
              <div className="text-sm">
                <strong>AI:</strong> Karibu! I can help you with construction materials, prices, suppliers, and deliveries. What would you like to know?
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 py-4">
            Ask me anything about construction in Kenya!
          </div>
        </div>

        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about materials, prices..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // Handle send
                  setMessage('');
                }
              }}
            />
            <Button className="bg-blue-600">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

