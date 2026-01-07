import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Headphones, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'bot' | 'staff';
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

interface LiveChatWidgetProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({ 
  userId, 
  userName = 'Guest',
  userEmail 
}) => {
  const location = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<'ai' | 'human'>('ai');
  const [conversationId, setConversationId] = useState<string>('');
  const [waitingForStaff, setWaitingForStaff] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate or retrieve conversation ID
  useEffect(() => {
    const storedConversationId = localStorage.getItem('mradipro_chat_conversation');
    if (storedConversationId) {
      setConversationId(storedConversationId);
    } else {
      const newConversationId = crypto.randomUUID();
      localStorage.setItem('mradipro_chat_conversation', newConversationId);
      setConversationId(newConversationId);
    }
  }, []);

  // Load previous messages and set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          const loadedMessages: Message[] = data.map((msg: any) => ({
            id: msg.id,
            role: msg.sender_type as 'user' | 'bot' | 'staff',
            content: msg.content,
            timestamp: new Date(msg.created_at)
          }));
          setMessages(loadedMessages);
          
          // Check if there are staff messages (switch to human mode)
          if (data.some((msg: any) => msg.sender_type === 'staff')) {
            setMode('human');
            setWaitingForStaff(false);
          }
        }
      } catch (err) {
        console.error('Error loading chat messages:', err);
      }
    };

    loadMessages();

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add if it's a staff message (user messages are added locally)
          if (newMsg.sender_type === 'staff') {
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                role: 'staff',
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at)
              }];
            });
            setWaitingForStaff(false);
            setMode('human');
            
            // Show notification if chat is closed
            if (!isOpen) {
              setUnreadCount(prev => prev + 1);
              toast({
                title: "New message from MradiPro Staff",
                description: newMsg.content.substring(0, 50) + '...',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Hide on auth pages
  const authPages = [
    '/',
    '/auth',
    '/admin-auth',
    '/admin-login',
    '/builder-signin',
    '/supplier-signin',
    '/delivery-signin',
    '/reset-password',
  ];
  if (authPages.includes(location.pathname)) {
    return null;
  }

  // Save message to database - using existing table structure
  const saveMessage = async (content: string, senderType: 'user' | 'bot' | 'staff') => {
    console.log('💬 Saving chat message:', { conversationId, senderType, content: content.substring(0, 50) });
    
    if (!conversationId) {
      console.error('❌ No conversation ID available');
      return null;
    }

    const messageData = {
      conversation_id: conversationId,
      sender_id: userId || 'guest',
      sender_type: senderType,
      sender_name: userName,
      content: content,
      message_type: 'text',
      read: false
    };
    
    console.log('📤 Insert data:', messageData);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();

    console.log('📥 Insert result:', { data, error });

    if (error) {
      console.error('❌ Supabase error:', error.message, error.details, error.hint);
      toast({
        title: "Message not saved",
        description: error.message || "Failed to save message to server",
        variant: "destructive"
      });
      return null;
    }
    
    console.log('✅ Message saved with ID:', data?.id);
    return data?.id;
  };

  // AI Response Engine
  const getAIResponse = async (userQuery: string): Promise<{ response: string; suggestions?: string[] }> => {
    const query = userQuery.toLowerCase();

    // Check for human support request
    if (query.includes('human') || query.includes('staff') || query.includes('person') || query.includes('agent') || query.includes('talk to someone') || query.includes('real person')) {
      return {
        response: `👤 **Connecting you to MradiPro Staff...**\n\nI'm switching you to our human support team. A staff member will respond shortly.\n\n**While you wait:**\n• Our team typically responds within 5-10 minutes\n• Office hours: Mon-Fri 8AM-6PM, Sat 9AM-4PM\n• For urgent matters, call: +254-700-MRADIPRO\n\n**What would you like help with?**`,
        suggestions: ['I have a billing question', 'Technical issue', 'Order problem', 'General inquiry']
      };
    }

    // Material Prices
    if (query.includes('price') || query.includes('cost') || query.includes('how much')) {
      if (query.includes('cement')) {
        return {
          response: `💰 **Cement Prices in Kenya:**\n\n**Bamburi Cement 42.5N (50kg):** KES 850 - 900\n**Savannah Cement (50kg):** KES 780 - 820\n**Mombasa Cement (50kg):** KES 800 - 850\n\n**Bulk Discounts:**\n- 50-100 bags: 5% off\n- 100-500 bags: 10% off\n- 500+ bags: 15% off`,
          suggestions: ['Compare steel prices', 'Find cement suppliers', 'Talk to staff']
        };
      }
      if (query.includes('steel') || query.includes('rebar')) {
        return {
          response: `🔩 **Steel Prices (per 6m bar):**\n\n**Y8 (8mm):** KES 380 - 420\n**Y10 (10mm):** KES 580 - 620\n**Y12 (12mm):** KES 850 - 950\n**Y16 (16mm):** KES 1,450 - 1,550\n**Y20 (20mm):** KES 2,200 - 2,400`,
          suggestions: ['Calculate steel needed', 'Find steel suppliers', 'Talk to staff']
        };
      }
    }

    // Suppliers
    if (query.includes('supplier') || query.includes('find') || query.includes('where')) {
      return {
        response: `🏪 **Finding Suppliers:**\n\n1. Go to "Browse Materials"\n2. Use filters (Category, Location, Price)\n3. View supplier profiles & ratings\n4. Request quotes directly\n\nAll suppliers are verified! Need help finding specific materials?`,
        suggestions: ['Cement in Nairobi', 'Steel in Mombasa', 'Talk to staff']
      };
    }

    // Delivery
    if (query.includes('delivery') || query.includes('deliver')) {
      return {
        response: `🚚 **Delivery Services:**\n\n**Cost Estimates:**\n- Within Nairobi: KES 3,000 - 8,000\n- Suburbs (20-30km): KES 8,000 - 15,000\n- Inter-county: KES 15,000 - 50,000\n\n**Features:**\n✅ Real-time GPS tracking\n✅ QR verification\n✅ Secure payment`,
        suggestions: ['Request delivery', 'Track order', 'Talk to staff']
      };
    }

    // Default response
    return {
      response: `Hi! I'm MradiPro AI 🤖🇰🇪\n\nI can help with:\n• **Prices** - Material costs\n• **Calculate** - Quantities needed\n• **Find** - Suppliers near you\n• **Delivery** - Costs & tracking\n• **Human Support** - Talk to our staff\n\nWhat would you like to know?`,
      suggestions: ['Cement prices', 'Find suppliers', 'Delivery costs', 'Talk to human staff']
    };
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    const userMessage = message.trim();
    setMessage('');

    // Add user message locally
    const userMsgId = `local_${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Save to database
    await saveMessage(userMessage, 'user');

    // Check if requesting human support
    const query = userMessage.toLowerCase();
    if (query.includes('human') || query.includes('staff') || query.includes('person') || query.includes('agent') || query.includes('talk to someone')) {
      setMode('human');
      setWaitingForStaff(true);
      
      // Get AI transition response
      setIsTyping(true);
      setTimeout(async () => {
        const { response, suggestions } = await getAIResponse(userMessage);
        const botMsgId = `bot_${Date.now()}`;
        setMessages(prev => [...prev, {
          id: botMsgId,
          role: 'bot',
          content: response,
          suggestions,
          timestamp: new Date()
        }]);
        await saveMessage(response, 'bot');
        setIsTyping(false);
      }, 800);
      return;
    }

    // In human mode, just wait for staff
    if (mode === 'human') {
      setWaitingForStaff(true);
      return;
    }

    // AI mode - get response
    setIsTyping(true);
    setTimeout(async () => {
      const { response, suggestions } = await getAIResponse(userMessage);
      const botMsgId = `bot_${Date.now()}`;
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'bot',
        content: response,
        suggestions,
        timestamp: new Date()
      }]);
      await saveMessage(response, 'bot');
      setIsTyping(false);
    }, 800);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  const switchToAI = () => {
    setMode('ai');
    setWaitingForStaff(false);
  };

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-[9999]"
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl animate-pulse"
          style={{ borderRadius: '50%', width: '64px', height: '64px' }}
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </Button>
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold min-w-[24px] text-center">
            {unreadCount}
          </div>
        )}
        <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
          Live
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-[9999] max-w-[calc(100vw-48px)]"
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
    >
      <Card className="w-96 max-w-[calc(100vw-48px)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`${mode === 'human' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gradient-to-r from-blue-600 to-cyan-600'} text-white p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'human' ? (
                <Headphones className="h-6 w-6" />
              ) : (
                <Bot className="h-6 w-6" />
              )}
              <div>
                <div className="font-semibold flex items-center gap-2">
                  MradiPro
                  <Badge variant="secondary" className="text-xs bg-white/20">
                    {mode === 'human' ? 'Live Support' : 'AI Assistant'}
                  </Badge>
                </div>
                <div className="text-xs opacity-90">
                  {mode === 'human' 
                    ? waitingForStaff ? '⏳ Waiting for staff...' : '🟢 Staff connected'
                    : '🤖 Kenya Construction Expert'
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'human' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 text-xs"
                  onClick={switchToAI}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  AI
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-96 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <>
              <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
                <div className="flex items-start gap-2">
                  <Bot className="h-5 w-5 mt-1 text-blue-600 flex-shrink-0" />
                  <div className="text-sm">
                    <strong className="text-blue-600">MradiPro:</strong> Karibu! 🇰🇪 I can help you with construction materials, prices, suppliers, and deliveries. 
                    <br /><br />
                    <strong>Need human support?</strong> Just type "talk to staff" anytime!
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs bg-white"
                  onClick={() => handleSuggestionClick('Cement prices')}
                >
                  💰 Cement Prices
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs bg-white"
                  onClick={() => handleSuggestionClick('Find suppliers')}
                >
                  🏪 Find Suppliers
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs bg-white"
                  onClick={() => handleSuggestionClick('Delivery costs')}
                >
                  🚚 Delivery Info
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs bg-white border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => handleSuggestionClick('Talk to human staff')}
                >
                  👤 Human Support
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role !== 'user' && (
                      msg.role === 'staff' 
                        ? <Headphones className="h-4 w-4 mt-1 text-purple-600 flex-shrink-0" />
                        : <Bot className="h-4 w-4 mt-1 text-blue-600 flex-shrink-0" />
                    )}
                    <div className={`rounded-lg p-3 max-w-[80%] shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white ml-auto' 
                        : msg.role === 'staff'
                        ? 'bg-purple-100 border border-purple-200'
                        : 'bg-white'
                    }`}>
                      <div className="text-sm whitespace-pre-line">
                        {msg.role === 'bot' && <strong className="text-blue-600">MradiPro: </strong>}
                        {msg.role === 'staff' && <strong className="text-purple-600">Staff: </strong>}
                        {msg.content}
                      </div>
                      <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {msg.role === 'user' && <User className="h-4 w-4 mt-1 flex-shrink-0 text-gray-400" />}
                  </div>
                  
                  {/* Suggestion Buttons */}
                  {msg.role === 'bot' && msg.suggestions && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <Badge
                          key={sIdx}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing/Waiting Indicator */}
              {(isTyping || waitingForStaff) && (
                <div className="flex items-start gap-2">
                  {waitingForStaff ? (
                    <Headphones className="h-4 w-4 mt-1 text-purple-600" />
                  ) : (
                    <Bot className="h-4 w-4 mt-1 text-blue-600" />
                  )}
                  <div className={`rounded-lg p-3 ${waitingForStaff ? 'bg-purple-100' : 'bg-white'}`}>
                    <div className="flex gap-1">
                      <div className={`w-2 h-2 ${waitingForStaff ? 'bg-purple-600' : 'bg-blue-600'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 ${waitingForStaff ? 'bg-purple-600' : 'bg-blue-600'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 ${waitingForStaff ? 'bg-purple-600' : 'bg-blue-600'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                    </div>
                    {waitingForStaff && (
                      <div className="text-xs text-purple-600 mt-1">Staff will respond soon...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder={mode === 'human' ? "Message staff..." : "Ask MradiPro..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              className={mode === 'human' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              MradiPro 🇰🇪 • {mode === 'human' ? 'Live Support' : 'AI + Human Support'}
            </div>
            {mode === 'ai' && (
              <button 
                onClick={() => handleSuggestionClick('Talk to human staff')}
                className="text-purple-600 hover:underline"
              >
                Need human help?
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LiveChatWidget;
