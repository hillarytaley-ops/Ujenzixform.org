import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Phone, Video, Paperclip, Smile } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'builder';
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
}

interface ChatWidgetProps {
  builder: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onCall?: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  builder, 
  isOpen, 
  onClose, 
  onCall 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'builder',
      content: `Hello! I'm ${builder.name}. How can I help you with your construction project?`,
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      type: 'text'
    },
    {
      id: '2',
      sender: 'user',
      content: 'Hi! I\'m interested in building a 3-bedroom house in Kiambu. Can you provide a quote?',
      timestamp: new Date(Date.now() - 240000), // 4 minutes ago
      type: 'text'
    },
    {
      id: '3',
      sender: 'builder',
      content: 'Absolutely! I\'d be happy to help. Can you share more details about the plot size and your budget range?',
      timestamp: new Date(Date.now() - 180000), // 3 minutes ago
      type: 'text'
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate builder typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const builderResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'builder',
        content: 'Thanks for the details! I\'ll prepare a detailed quote and send it to you within 24 hours.',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, builderResponse]);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] z-50 shadow-2xl">
      <Card className="h-full flex flex-col">
        {/* Chat Header */}
        <CardHeader className="pb-3 bg-primary text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-white/20">
                  <AvatarImage src={builder.avatar} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {builder.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {builder.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <div className="font-semibold text-sm">{builder.name}</div>
                <div className="text-xs opacity-90">
                  {builder.isOnline ? 'Online now' : `Last seen ${builder.lastSeen || '2h ago'}`}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCall} className="text-white hover:bg-white/20">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="p-2">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Smile className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatWidget;


















