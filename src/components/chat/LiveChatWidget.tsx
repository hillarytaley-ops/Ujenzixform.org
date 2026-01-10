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
  const conversationIdRef = useRef<string>(''); // Sync ref for immediate access
  const initializingRef = useRef<boolean>(false); // Guard against double-init
  const [waitingForStaff, setWaitingForStaff] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate or retrieve conversation ID and ensure conversation exists
  useEffect(() => {
    // Guard against React Strict Mode double-mounting
    if (initializingRef.current) {
      console.log('🔄 Skipping duplicate init (already in progress)');
      return;
    }
    
    // Check if we already have a conversation ID set
    if (conversationIdRef.current) {
      console.log('✅ Already have conversation ID:', conversationIdRef.current);
      return;
    }
    
    initializingRef.current = true;
    
    const initConversation = async () => {
      const storedConversationId = localStorage.getItem('mradipro_chat_conversation');
      
      if (storedConversationId) {
        console.log('🔑 Using existing conversation ID:', storedConversationId);
        // Verify the conversation still exists in DB
        const { data: existing, error } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', storedConversationId)
          .maybeSingle();
        
        if (!error && existing) {
          conversationIdRef.current = storedConversationId;
          setConversationId(storedConversationId);
          initializingRef.current = false;
          return;
        }
        // Conversation doesn't exist, create a new one
        console.log('⚠️ Stored conversation not found in DB, creating new one');
      }
      
      // Create a new conversation
      const newConversationId = crypto.randomUUID();
      console.log('🔑 Creating new conversation:', newConversationId);
      
      // Set immediately to prevent race conditions
      conversationIdRef.current = newConversationId;
      localStorage.setItem('mradipro_chat_conversation', newConversationId);
      
      // For guest users, use NULL for client_id (foreign key allows NULL)
      const { error } = await supabase
        .from('conversations')
        .insert({
          id: newConversationId,
          client_id: userId || null,
          client_name: userName || 'Guest',
          client_email: userEmail || 'guest@mradipro.co.ke',
          client_role: userId ? 'builder' : 'guest',
          status: 'open',
          priority: 'normal',
          subject: 'Chat Support',
          unread_count: 0
        });
      
      if (error) {
        console.error('❌ Failed to create conversation:', error.message);
      } else {
        console.log('✅ Conversation created successfully');
      }
      
      setConversationId(newConversationId);
      initializingRef.current = false;
    };
    
    initConversation();
    
    // Test Supabase connection
    supabase.from('chat_messages').select('count').limit(1).then(({ data, error }) => {
      console.log('🔌 Supabase connection test:', { connected: !error, error: error?.message });
    });
  }, [userId, userName, userEmail]);

  // Track message IDs we've seen (from DB) to detect truly new messages
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  // Track local message IDs (before they get DB IDs) to prevent duplicates
  const pendingLocalIdsRef = useRef<Map<string, string>>(new Map()); // localId -> content hash
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOpenRef = useRef<boolean>(isOpen);
  const isMountedRef = useRef<boolean>(true);
  
  // Keep isOpenRef in sync
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load previous messages and set up real-time subscription + polling fallback
  useEffect(() => {
    if (!conversationId) return;

    let isSubscribed = true;

    const loadMessages = async (isPolling = false) => {
      if (!isSubscribed || !isMountedRef.current) return;
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading chat messages:', error);
          return;
        }

        if (!isSubscribed || !isMountedRef.current) return;

        if (data && data.length > 0) {
          // Find truly new messages (not in our known set)
          const newDbMessages = data.filter((m: any) => !knownMessageIdsRef.current.has(m.id));
          const hasNewStaffMessage = newDbMessages.some((m: any) => m.sender_type === 'staff');
          
          // Update known IDs
          data.forEach((m: any) => knownMessageIdsRef.current.add(m.id));

          // Map DB messages to UI format
          const loadedMessages: Message[] = data.map((msg: any) => ({
            id: msg.id,
            role: (msg.sender_type === 'client' ? 'user' : msg.sender_type === 'system' ? 'bot' : 'staff') as 'user' | 'bot' | 'staff',
            content: msg.content,
            timestamp: new Date(msg.created_at)
          }));
          
          // Replace messages state with DB truth, but preserve any pending local messages
          setMessages(prev => {
            // Get pending local messages (those with local_ prefix that aren't in DB yet)
            const pendingLocal = prev.filter(m => 
              m.id.startsWith('local_') || m.id.startsWith('bot_')
            );
            
            // Check if any pending local messages now have DB equivalents (by content match)
            const dbContents = new Set(data.map((m: any) => m.content));
            const stillPending = pendingLocal.filter(m => !dbContents.has(m.content));
            
            // Combine: DB messages + still-pending local messages
            const combined = [...loadedMessages];
            stillPending.forEach(pending => {
              // Only add if not already in combined (by content)
              if (!combined.some(c => c.content === pending.content)) {
                combined.push(pending);
              }
            });
            
            // Sort by timestamp
            combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            return combined;
          });
          
          // Check if there are staff messages (switch to human mode)
          if (data.some((msg: any) => msg.sender_type === 'staff')) {
            setMode('human');
            setWaitingForStaff(false);
          }

          // Notify for new staff messages when chat is closed
          if (isPolling && hasNewStaffMessage && !isOpenRef.current) {
            const lastStaffMsg = newDbMessages.filter((m: any) => m.sender_type === 'staff').pop();
            if (lastStaffMsg) {
              setUnreadCount(prev => prev + 1);
              toast({
                title: "💬 New message from MradiPro Staff",
                description: lastStaffMsg.content.substring(0, 50) + '...',
              });
              
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAHIreli4AAAB4nJ8sAAAA');
                audio.play().catch(() => {});
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.error('Error loading chat messages:', err);
      }
    };

    // Initial load
    loadMessages(false);

    // Real-time subscription for instant staff message delivery
    const channel = supabase
      .channel(`chat_realtime_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (!isSubscribed || !isMountedRef.current) return;
          
          const newMsg = payload.new as any;
          console.log('📩 Real-time message received:', newMsg.sender_type, newMsg.content?.substring(0, 30));
          
          // Track this message ID
          knownMessageIdsRef.current.add(newMsg.id);
          
          // Only add staff messages via real-time (user/bot messages are added locally)
          if (newMsg.sender_type === 'staff') {
            setMessages(prev => {
              // Check if already exists (by ID or content)
              if (prev.some(m => m.id === newMsg.id || m.content === newMsg.content)) {
                return prev;
              }
              return [...prev, {
                id: newMsg.id,
                role: 'staff',
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at)
              }];
            });
            setWaitingForStaff(false);
            setMode('human');
            
            if (!isOpenRef.current) {
              setUnreadCount(prev => prev + 1);
              toast({
                title: "💬 New message from MradiPro Staff",
                description: newMsg.content.substring(0, 50) + '...',
              });
              
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAHIreli4AAAB4nJ8sAAAA');
                audio.play().catch(() => {});
              } catch (e) {}
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Chat subscription status:', status);
      });

    // POLLING FALLBACK: Check for new messages every 2 seconds
    // Slightly slower than before to reduce load but still responsive
    pollingIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadMessages(true);
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      console.log('🔌 Unsubscribing from chat channel');
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [conversationId, toast]);

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
  // Map sender types: user -> client, bot -> system (to match DB constraint)
  const saveMessage = async (content: string, senderType: 'user' | 'bot' | 'staff') => {
    // Map to allowed DB values: 'staff' | 'client' | 'system'
    const dbSenderType = senderType === 'user' ? 'client' : senderType === 'bot' ? 'system' : 'staff';
    
    // Use ref for immediate access, fallback to state, then localStorage
    const currentConversationId = conversationIdRef.current || conversationId || localStorage.getItem('mradipro_chat_conversation');
    
    console.log('💬 Saving chat message:', { conversationId: currentConversationId, senderType: dbSenderType, content: content.substring(0, 50) });
    
    if (!currentConversationId) {
      console.error('❌ No conversation ID available');
      return null;
    }

    // sender_id is TEXT in the database, so we can use any string
    // Use a consistent guest ID from localStorage for tracking
    const guestSenderId = localStorage.getItem('mradipro_guest_id') || (() => {
      const id = `guest_${crypto.randomUUID()}`;
      localStorage.setItem('mradipro_guest_id', id);
      return id;
    })();
    
    const messageData = {
      conversation_id: currentConversationId,
      sender_id: userId || guestSenderId, // TEXT field, not UUID FK
      sender_type: dbSenderType,
      sender_name: senderType === 'bot' ? 'MradiPro AI' : userName,
      content: content,
      message_type: 'text',
      read: false
    };
    
    console.log('📤 Insert data:', messageData);

    try {
      // Simple insert without .select() to avoid RLS issues
      // The .select() can fail even if insert succeeds due to RLS SELECT policy
      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData);
      
      if (error) {
        console.error('❌ Supabase insert error:', error.message, error.code, error.details, error.hint);
        
        // Check for specific RLS error
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
          console.error('❌ RLS POLICY BLOCKING INSERT - Run the SQL fix in Supabase!');
          toast({
            variant: "destructive",
            title: "Chat not configured",
            description: "Please contact support. Chat database needs configuration.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Message not saved",
            description: `Error: ${error.message}`,
          });
        }
        return null;
      }
      
      console.log('✅ Message saved successfully');
      return crypto.randomUUID(); // Return a temp ID since we didn't select
    } catch (err: any) {
      console.error('❌ Exception:', err.message || err);
      // Don't show toast for every failed message - it's annoying
      // The message is shown locally anyway
      return null;
    }
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

    // Generate unique local ID with content hash for deduplication
    const userMsgId = `local_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    // Add user message locally (will be replaced by DB version on next poll)
    setMessages(prev => {
      // Prevent duplicate if same content was just added
      if (prev.some(m => m.content === userMessage && Date.now() - m.timestamp.getTime() < 5000)) {
        return prev;
      }
      return [...prev, newUserMessage];
    });

    // Save to database (don't await - let it happen in background)
    saveMessage(userMessage, 'user').catch(err => {
      console.error('Failed to save user message:', err);
    });

    // Check if requesting human support
    const query = userMessage.toLowerCase();
    if (query.includes('human') || query.includes('staff') || query.includes('person') || query.includes('agent') || query.includes('talk to someone')) {
      setMode('human');
      setWaitingForStaff(true);
      
      // Get AI transition response
      setIsTyping(true);
      setTimeout(async () => {
        if (!isMountedRef.current) return;
        
        const { response, suggestions } = await getAIResponse(userMessage);
        const botMsgId = `local_bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        setMessages(prev => {
          // Prevent duplicate bot messages
          if (prev.some(m => m.content === response && Date.now() - m.timestamp.getTime() < 5000)) {
            return prev;
          }
          return [...prev, {
            id: botMsgId,
            role: 'bot',
            content: response,
            suggestions,
            timestamp: new Date()
          }];
        });
        
        saveMessage(response, 'bot').catch(err => {
          console.error('Failed to save bot message:', err);
        });
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
      if (!isMountedRef.current) return;
      
      const { response, suggestions } = await getAIResponse(userMessage);
      const botMsgId = `local_bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setMessages(prev => {
        // Prevent duplicate bot messages
        if (prev.some(m => m.content === response && Date.now() - m.timestamp.getTime() < 5000)) {
          return prev;
        }
        return [...prev, {
          id: botMsgId,
          role: 'bot',
          content: response,
          suggestions,
          timestamp: new Date()
        }];
      });
      
      saveMessage(response, 'bot').catch(err => {
        console.error('Failed to save bot message:', err);
      });
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
