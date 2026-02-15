import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  role: 'user' | 'staff' | 'system';
  content: string;
  timestamp: Date;
  staffName?: string;
}

interface LiveChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
}

export function LiveChatWidget({ position = 'bottom-right' }: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserName(session.user.email?.split('@')[0] || '');
        setUserEmail(session.user.email || '');
      }
    };
    getUser();
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (connectionError) {
        toast({
          title: '🌐 Back Online',
          description: 'Your connection has been restored.'
        });
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: 'destructive',
        title: '📶 Connection Lost',
        description: 'You appear to be offline. Messages will send when you reconnect.'
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionError, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Subscribe to messages when connected - INSTANT DELIVERY like WhatsApp
  useEffect(() => {
    if (!conversationId) return;

    console.log('💬 LiveChat: Setting up realtime subscription for conversation:', conversationId);

    const channel = supabase
      .channel(`livechat_client_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const msg = payload.new as any;
          console.log('💬 LiveChat: REALTIME message received!', msg.sender_type, msg.content?.substring(0, 20));
          
          // Only add staff messages (user messages are added locally via optimistic update)
          if (msg.sender_type === 'staff') {
            // Check if message already exists to avoid duplicates
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, {
                id: msg.id,
                role: 'staff',
                content: msg.content,
                timestamp: new Date(msg.created_at),
                staffName: msg.sender_name
              }];
            });
            
            // Play notification sound
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAHIreli4AAAB4nJ8sAAAA');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {}
          }
        }
      )
      .subscribe((status, err) => {
        console.log('💬 LiveChat: Subscription status:', status, err || '');
        if (status === 'SUBSCRIBED') {
          console.log('✅ LiveChat: Realtime connected - messages will appear instantly!');
        }
      });

    // POLLING FALLBACK: Check for new staff messages every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('sender_type', 'staff')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (data && data.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = data.filter(m => !existingIds.has(m.id));
            if (newMsgs.length > 0) {
              console.log('💬 LiveChat: Polling found new staff messages:', newMsgs.length);
              return [...prev, ...newMsgs.map(m => ({
                id: m.id,
                role: 'staff' as const,
                content: m.content,
                timestamp: new Date(m.created_at),
                staffName: m.sender_name
              }))];
            }
            return prev;
          });
        }
      } catch (e) {
        // Silent fail for polling
      }
    }, 3000);

    return () => {
      console.log('💬 LiveChat: Cleaning up subscription');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [conversationId]);

  // Add message to UI
  const addMessage = (role: 'user' | 'staff' | 'system', content: string, staffName?: string) => {
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
      staffName
    }]);
  };

  // Start chat - show name dialog if not logged in
  const handleStartChat = () => {
    if (!userName.trim()) {
      setShowNameDialog(true);
    } else {
      connectToLiveChat();
    }
  };

  // Connect to live chat using direct REST API for reliability
  const connectToLiveChat = async () => {
    if (isConnecting || isConnected) return;
    
    // Check if online first
    if (!navigator.onLine) {
      addMessage('system', '📶 You appear to be offline. Please check your internet connection and try again.');
      toast({
        variant: 'destructive',
        title: 'No Internet Connection',
        description: 'Please connect to the internet to start a chat.'
      });
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    addMessage('system', '🔄 Connecting you to our support team...');
    console.log('💬 LiveChat: Starting connection...');

    try {
      // Get access token if user is logged in
      const accessToken = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let token = SUPABASE_ANON_KEY;
      
      if (accessToken) {
        try {
          const parsed = JSON.parse(accessToken);
          if (parsed?.access_token) {
            token = parsed.access_token;
          }
        } catch (e) {
          console.log('💬 LiveChat: Using anon key (no valid session)');
        }
      }

      // Create conversation using direct REST API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const conversationData = {
        client_id: userId || null,
        client_name: userName || 'Guest',
        client_email: userEmail || 'guest@ujenzixform.org', // Required field - use placeholder for guests
        status: 'open',
        source: 'live_chat',
        priority: 'normal'
      };

      console.log('💬 LiveChat: Creating conversation...', conversationData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(conversationData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💬 LiveChat: Conversation creation failed:', response.status, errorText);
        
        // User-friendly error messages based on error type
        let errorMessage = '❌ Could not connect to support. ';
        if (response.status === 401 || response.status === 403) {
          errorMessage += 'Please refresh the page and try again.';
        } else if (response.status >= 500) {
          errorMessage += 'Our servers are temporarily busy. Please try again in a moment.';
        } else if (!navigator.onLine) {
          errorMessage += 'You appear to be offline. Please check your internet connection.';
        } else {
          errorMessage += 'Please try again or email us at info@ujenzixform.org';
        }
        
        addMessage('system', errorMessage);
        toast({
          variant: 'destructive',
          title: 'Connection Failed',
          description: 'Unable to start chat. Please try again.'
        });
        setIsConnecting(false);
        return;
      }

      const convArray = await response.json();
      const conv = Array.isArray(convArray) ? convArray[0] : convArray;
      
      if (!conv?.id) {
        console.error('💬 LiveChat: No conversation ID returned');
        addMessage('system', '❌ Something went wrong. Please refresh the page and try connecting again.');
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: 'Could not establish chat session. Please refresh and try again.'
        });
        setIsConnecting(false);
        return;
      }

      console.log('💬 LiveChat: Conversation created:', conv.id);
      setConversationId(conv.id);
      
      // Save initial system message (non-blocking - don't fail if this doesn't work)
      const msgController = new AbortController();
      const msgTimeoutId = setTimeout(() => msgController.abort(), 10000);

      try {
        const msgResponse = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversation_id: conv.id,
            sender_id: userId ? String(userId) : `guest-${conv.id.substring(0, 8)}`, // Generate guest ID if no user
            sender_type: 'client',
            sender_name: userName || 'Guest',
            content: `Chat started by ${userName || 'Guest'}`,
            message_type: 'text'
          }),
          signal: msgController.signal
        });
        
        if (!msgResponse.ok) {
          const msgError = await msgResponse.text();
          console.log('💬 LiveChat: Initial message insert failed (non-critical):', msgResponse.status, msgError);
        }
      } catch (msgErr) {
        console.log('💬 LiveChat: Initial message error (non-critical):', msgErr);
      }

      clearTimeout(msgTimeoutId);

      setIsConnected(true);
      setIsConnecting(false);
      addMessage('system', '✅ Connected! A staff member will respond shortly. Please type your message below.');
      
      console.log('💬 LiveChat: Connected successfully!');
      toast({
        title: '✅ Connected',
        description: 'You are now connected to live support.'
      });

    } catch (err: any) {
      console.error('💬 LiveChat Error:', err);
      let errorTitle = 'Connection Failed';
      let errorDescription = 'Unable to connect to support.';
      let systemMessage = '❌ ';
      
      if (err.name === 'AbortError') {
        errorTitle = 'Connection Timeout';
        errorDescription = 'The connection took too long. Please try again.';
        systemMessage += 'Connection timed out. This usually means slow internet - please check your connection and try again.';
      } else if (!navigator.onLine) {
        errorTitle = 'No Internet';
        errorDescription = 'Please check your internet connection.';
        systemMessage += 'You appear to be offline. Please connect to the internet and try again.';
      } else {
        systemMessage += 'We couldn\'t connect you to support. Please try again, or reach us at info@ujenzixform.org';
      }
      
      addMessage('system', systemMessage);
      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorDescription
      });
      setIsConnecting(false);
    }
  };

  // Send message using direct REST API
  const sendMessage = async () => {
    const content = inputValue.trim();
    if (!content || !conversationId) return;

    setInputValue('');
    addMessage('user', content);

    try {
      // Get access token
      const accessToken = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let token = SUPABASE_ANON_KEY;
      
      if (accessToken) {
        try {
          const parsed = JSON.parse(accessToken);
          if (parsed?.access_token) {
            token = parsed.access_token;
          }
        } catch (e) {}
      }

      // Send message
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const messageData = {
        conversation_id: conversationId,
        sender_id: userId ? String(userId) : `guest-${conversationId?.substring(0, 8) || 'anon'}`, // Generate guest ID if no user
        sender_type: 'client',
        sender_name: userName || 'Guest',
        content: content,
        message_type: 'text'
      };
      
      console.log('💬 LiveChat: Sending message...', messageData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💬 LiveChat: Failed to send message:', response.status, errorText);
        
        let description = 'Your message couldn\'t be sent. ';
        if (response.status === 401 || response.status === 403) {
          description += 'Session may have expired - try refreshing the page.';
        } else if (!navigator.onLine) {
          description += 'You appear to be offline.';
        } else {
          description += 'Please try again.';
        }
        
        toast({
          variant: 'destructive',
          title: '❌ Message Not Sent',
          description: description
        });
        return;
      }
      
      console.log('💬 LiveChat: Message sent successfully');

      // Update conversation last message (non-blocking)
      fetch(`${SUPABASE_URL}/rest/v1/conversations?id=eq.${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          last_message: content.substring(0, 100),
          last_message_at: new Date().toISOString(),
          unread_count: 1
        })
      }).catch(err => console.log('💬 Conversation update error (non-critical):', err));

    } catch (err: any) {
      console.error('💬 LiveChat send error:', err);
      
      let title = '❌ Message Failed';
      let description = 'Please try again.';
      
      if (err.name === 'AbortError') {
        title = '⏱️ Message Timeout';
        description = 'Sending took too long. Check your connection and try again.';
      } else if (!navigator.onLine) {
        title = '📶 No Connection';
        description = 'You\'re offline. Message will send when you reconnect.';
      }
      
      toast({
        variant: 'destructive',
        title: title,
        description: description
      });
    }
  };

  // End chat
  const endChat = () => {
    if (isConnected) {
      setShowRatingDialog(true);
    } else {
      setIsOpen(false);
    }
  };

  // Submit rating and close
  const submitRating = async () => {
    if (conversationId) {
      try {
        // Get access token
        const accessToken = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        let token = SUPABASE_ANON_KEY;
        
        if (accessToken) {
          try {
            const parsed = JSON.parse(accessToken);
            if (parsed?.access_token) {
              token = parsed.access_token;
            }
          } catch (e) {}
        }

        await fetch(`${SUPABASE_URL}/rest/v1/conversations?id=eq.${conversationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'closed',
            rating: rating,
            rating_comment: ratingComment,
            closed_at: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error('💬 LiveChat: Error closing conversation:', err);
      }
    }

    setShowRatingDialog(false);
    setIsConnected(false);
    setConversationId(null);
    setMessages([]);
    setRating(0);
    setRatingComment('');
    setIsOpen(false);

    toast({
      title: '👋 Chat ended',
      description: 'Thank you for your feedback!'
    });
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isConnected) {
        sendMessage();
      }
    }
  };

  // Position classes
  const positionClasses = position === 'bottom-left' 
    ? 'left-4 sm:left-6' 
    : 'right-4 sm:right-6';

  return (
    <>
      {/* Chat Button - Round with Radiating Animation */}
      {!isOpen && (
        <div className={cn("fixed bottom-6 z-[9999]", positionClasses)} style={{ bottom: '24px' }}>
          {/* Main button - Blue, matches FloatingSocialSidebar size (56px) */}
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative w-14 h-14 rounded-full",
              "bg-blue-600 hover:bg-blue-700",
              "text-white shadow-lg",
              "hover:shadow-xl hover:scale-110",
              "transition-all duration-300 flex items-center justify-center"
            )}
            title="Live Chat"
          >
            <MessageCircle className="w-6 h-6" />
            
            {/* Online indicator dot */}
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md">
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            </span>
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "fixed bottom-4 sm:bottom-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]",
          "bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden",
          "flex flex-col",
          positionClasses
        )}
        style={{ height: '500px', maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="bg-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Live Support</h3>
                <p className="text-xs text-white/80">
                  {!isOnline ? '🔴 Offline - No internet' : 
                   isConnected ? '🟢 Connected' : 
                   isConnecting ? '🔄 Connecting...' : 
                   'Click to start'}
                </p>
              </div>
            </div>
            <button
              onClick={endChat}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-center">
              <p className="text-red-400 text-sm">
                📶 You're offline. Messages will send when you reconnect.
              </p>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 && !isConnected && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-orange-400" />
                </div>
                <h4 className="text-white font-medium mb-2">Welcome to Live Chat</h4>
                <p className="text-gray-400 text-sm mb-4">
                  {!isOnline 
                    ? 'Please connect to the internet to start chatting.'
                    : 'Connect with our support team for immediate assistance.'
                  }
                </p>
                <Button
                  onClick={handleStartChat}
                  disabled={isConnecting || !isOnline}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : !isOnline ? (
                    '📶 Waiting for connection...'
                  ) : (
                    'Start Chat'
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white rounded-br-md'
                        : msg.role === 'system'
                        ? 'bg-gray-700 text-gray-300 text-sm'
                        : 'bg-gray-700 text-white rounded-bl-md'
                    )}
                  >
                    {msg.role === 'staff' && msg.staffName && (
                      <p className="text-xs text-orange-400 mb-1">{msg.staffName}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      msg.role === 'user' ? 'text-white/70' : 'text-gray-500'
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          {isConnected && (
            <div className="p-3 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Start Live Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400">Your Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Email (optional)</label>
              <Input
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowNameDialog(false);
                connectToLiveChat();
              }}
              disabled={!userName.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Rate Your Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8",
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                    )}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Any feedback? (optional)"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowRatingDialog(false);
              submitRating();
            }}>
              Skip
            </Button>
            <Button
              onClick={submitRating}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LiveChatWidget;
