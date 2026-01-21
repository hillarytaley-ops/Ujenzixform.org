import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Subscribe to messages when connected
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
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
          // Only add staff messages (user messages are added locally)
          if (msg.sender_type === 'staff') {
            setMessages(prev => [...prev, {
              id: msg.id,
              role: 'staff',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              staffName: msg.sender_name
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  // Connect to live chat
  const connectToLiveChat = async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    addMessage('system', '🔄 Connecting you to our support team...');

    try {
      // Create conversation
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({
          client_id: userId,
          client_name: userName || 'Guest',
          client_email: userEmail || null,
          status: 'open',
          source: 'live_chat',
          priority: 'normal'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        addMessage('system', '❌ Could not connect. Please try again.');
        setIsConnecting(false);
        return;
      }

      setConversationId(conv.id);
      
      // Save initial message
      await supabase.from('chat_messages').insert({
        conversation_id: conv.id,
        sender_id: userId ? String(userId) : null,
        sender_type: 'system',
        sender_name: 'System',
        content: `${userName || 'Guest'} started a live chat`,
        message_type: 'text'
      });

      setIsConnected(true);
      setIsConnecting(false);
      addMessage('system', '✅ Connected! A staff member will respond shortly. Please type your message below.');
      
      toast({
        title: '✅ Connected',
        description: 'You are now connected to live support.'
      });

    } catch (err) {
      console.error('Error:', err);
      addMessage('system', '❌ Connection failed. Please try again.');
      setIsConnecting(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    const content = inputValue.trim();
    if (!content || !conversationId) return;

    setInputValue('');
    addMessage('user', content);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: userId ? String(userId) : null,
        sender_type: 'client',
        sender_name: userName || 'Guest',
        content: content,
        message_type: 'text'
      });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to send',
          description: 'Please try again.'
        });
      }

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message: content.substring(0, 100),
          last_message_at: new Date().toISOString(),
          unread_count: 1
        })
        .eq('id', conversationId);

    } catch (err) {
      console.error('Error:', err);
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
      await supabase
        .from('conversations')
        .update({
          status: 'closed',
          rating: rating,
          rating_comment: ratingComment,
          closed_at: new Date().toISOString()
        })
        .eq('id', conversationId);
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
        <div className={cn("fixed bottom-4 sm:bottom-6 z-50", positionClasses)}>
          {/* Radiating pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-14 h-14 rounded-full bg-orange-500/30 animate-ping" />
            <div className="absolute w-16 h-16 rounded-full bg-orange-500/20 animate-pulse" />
            <div 
              className="absolute w-20 h-20 rounded-full bg-orange-500/10"
              style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            />
          </div>
          
          {/* Main button */}
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative w-14 h-14 rounded-full",
              "bg-gradient-to-br from-orange-500 via-orange-600 to-red-500",
              "text-white shadow-lg shadow-orange-500/40",
              "hover:shadow-xl hover:shadow-orange-500/50 hover:scale-110",
              "transition-all duration-300 flex items-center justify-center",
              "border-2 border-orange-400/50"
            )}
            title="Live Chat"
          >
            <MessageCircle className="w-6 h-6 drop-shadow-md" />
            
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
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Live Support</h3>
                <p className="text-xs text-white/80">
                  {isConnected ? '🟢 Connected' : isConnecting ? '🔄 Connecting...' : 'Click to start'}
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

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 && !isConnected && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-orange-400" />
                </div>
                <h4 className="text-white font-medium mb-2">Welcome to Live Chat</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Connect with our support team for immediate assistance.
                </p>
                <Button
                  onClick={handleStartChat}
                  disabled={isConnecting}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
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
