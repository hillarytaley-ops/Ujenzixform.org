import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle, Send, X, Minimize2, Maximize2, 
  Paperclip, Smile, Phone, HelpCircle, Clock,
  CheckCircle, Loader2, Bot, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/types/chat';

interface ClientChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
}

// Auto-responses for common questions (simple chatbot)
const autoResponses: Record<string, string> = {
  'hello': 'Hello! Welcome to UjenziPro support. How can I help you today?',
  'hi': 'Hi there! How can I assist you today?',
  'help': 'I\'m here to help! You can ask me about:\n• Orders and deliveries\n• Account issues\n• Product information\n• Payment questions\n\nOr type your question and a support agent will assist you shortly.',
  'order': 'For order inquiries, please provide your order number and I\'ll connect you with our support team.',
  'delivery': 'For delivery tracking, please visit the Tracking page or provide your tracking number here.',
  'payment': 'For payment issues, our support team will assist you shortly. Please describe your concern.',
  'thanks': 'You\'re welcome! Is there anything else I can help you with?',
  'thank you': 'You\'re welcome! Feel free to reach out if you need any more assistance.',
  'bye': 'Goodbye! Thank you for contacting UjenziPro. Have a great day!'
};

export const ClientChatWidget: React.FC<ClientChatWidgetProps> = ({
  position = 'bottom-right',
  primaryColor = '#0891b2' // cyan-600
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        conversation_id: 'new',
        sender_id: 'bot',
        sender_type: 'system',
        sender_name: 'UjenziPro Support',
        content: 'Hello! 👋 Welcome to UjenziPro support. How can I help you today?\n\nYou can ask about orders, deliveries, payments, or any other questions.',
        message_type: 'text',
        read: true,
        created_at: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user info if logged in
  useEffect(() => {
    if (user) {
      setUserEmail(user.email || '');
      // Try to get name from profile
      supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.full_name) {
            setUserName(data.full_name);
            setHasStartedChat(true);
          }
        });
    }
  }, [user]);

  const getAutoResponse = (message: string): string | null => {
    const lowerMessage = message.toLowerCase().trim();
    
    for (const [keyword, response] of Object.entries(autoResponses)) {
      if (lowerMessage.includes(keyword)) {
        return response;
      }
    }
    
    return null;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Check if user info is needed
    if (!hasStartedChat && !user) {
      if (!userName.trim()) {
        toast({
          variant: "destructive",
          title: "Name Required",
          description: "Please enter your name to start the chat."
        });
        return;
      }
      setHasStartedChat(true);
    }

    setIsSending(true);

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: 'current',
        sender_id: user?.id || 'guest',
        sender_type: 'client',
        sender_name: userName || user?.email?.split('@')[0] || 'Guest',
        content: newMessage.trim(),
        message_type: 'text',
        read: true,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      const sentMessage = newMessage;
      setNewMessage('');

      // Show typing indicator
      setIsTyping(true);

      // Check for auto-response
      const autoResponse = getAutoResponse(sentMessage);

      // Simulate response delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      setIsTyping(false);

      if (autoResponse) {
        // Bot auto-response
        const botMessage: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          conversation_id: 'current',
          sender_id: 'bot',
          sender_type: 'system',
          sender_name: 'UjenziPro Bot',
          content: autoResponse,
          message_type: 'text',
          read: true,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Connect to support message
        const supportMessage: ChatMessage = {
          id: `msg-${Date.now()}-support`,
          conversation_id: 'current',
          sender_id: 'system',
          sender_type: 'system',
          sender_name: 'System',
          content: 'Your message has been received. A support agent will respond shortly. Average response time: 5-10 minutes.',
          message_type: 'system',
          read: true,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, supportMessage]);

        // In production, save to Supabase and notify staff
        // await supabase.from('chat_messages').insert(userMessage);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const positionClasses = position === 'bottom-right' 
    ? 'right-4 sm:right-6' 
    : 'left-4 sm:left-6';

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        </Button>
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg p-3 whitespace-nowrap animate-bounce">
          <p className="text-sm font-medium text-gray-800">Need help? Chat with us!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 ${
        isMinimized ? 'w-72' : 'w-80 sm:w-96'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: isMinimized ? 'auto' : '500px' }}>
        {/* Header */}
        <div 
          className="p-4 text-white flex items-center justify-between"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarImage src="/ujenzixform-logo.png" />
                <AvatarFallback className="bg-white/20 text-white">UP</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-semibold">UjenziPro Support</h3>
              <p className="text-xs text-white/80">
                {isTyping ? 'Typing...' : 'Online • Usually replies instantly'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* User Info Form (if not logged in and hasn't started) */}
            {!hasStartedChat && !user && (
              <div className="p-4 bg-gray-50 border-b">
                <p className="text-sm text-gray-600 mb-3">Please enter your details to start chatting:</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Your name *"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" style={{ height: '300px' }}>
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.sender_type !== 'client' && (
                      <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                        <AvatarFallback className="bg-cyan-100 text-cyan-700">
                          {message.sender_type === 'system' ? <Bot className="h-4 w-4" /> : 'UP'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[75%] ${
                      message.sender_type === 'client'
                        ? 'bg-cyan-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl'
                        : message.message_type === 'system'
                          ? 'bg-gray-100 text-gray-600 rounded-2xl border border-gray-200'
                          : 'bg-gray-100 text-gray-800 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl'
                    } px-4 py-2`}>
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_type === 'client' ? 'text-cyan-200' : 'text-gray-400'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-cyan-100 text-cyan-700">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-2xl px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t bg-gray-50">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['Track Order', 'Payment Help', 'Contact Support'].map(action => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap flex-shrink-0"
                    onClick={() => setNewMessage(action)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-white">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                </Button>
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 min-h-[40px] max-h-[100px] resize-none text-sm"
                  rows={1}
                />
                <Button 
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  style={{ backgroundColor: primaryColor }}
                  className="flex-shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t text-center">
              <p className="text-xs text-gray-400">
                Powered by <span className="font-medium text-cyan-600">UjenziPro</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientChatWidget;




