import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  User, 
  Bot,
  Headphones,
  Volume2,
  VolumeX,
  AlertCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  message_type: string;
  read: boolean;
  created_at: string;
}

interface ChatSession {
  conversation_id: string;
  messages: ChatMessage[];
  sender_name: string;
  last_message_at: string;
  needs_reply: boolean;
  unread_count: number;
}

interface LiveChatManagerProps {
  staffId: string;
  staffName: string;
}

export function LiveChatManager({ staffId, staffName }: LiveChatManagerProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAHIreli4AAAB4nJ8sAAAA');
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  const fetchSessions = useCallback(async () => {
    try {
      console.log('📨 Fetching chat messages...');
      
      // Check if we have a session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('📨 Session status:', sessionData?.session ? 'Active' : 'No session');
      
      // Use direct REST API call to bypass any client-side caching issues
      
      const token = sessionData?.session?.access_token || SUPABASE_ANON_KEY;
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?select=*&order=created_at.desc&limit=500`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📨 REST API error:', response.status, errorText);
        setFetchError(`Failed to fetch messages: ${response.status}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      const error = null;

      console.log('📨 Chat messages result:', { count: data?.length, sample: data?.slice(0, 2) });
      
      if (error) {
        console.error('Error fetching chat messages:', error);
        // If RLS error, show helpful message
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('denied')) {
          setFetchError('RLS policy is blocking access. Please apply the chat RLS fix in Supabase SQL Editor.');
          console.error('❌ RLS is blocking access. Please run the RLS fix migration in Supabase.');
        } else {
          setFetchError(`Database error: ${error.message}`);
        }
        setLoading(false);
        return;
      }
      
      // Clear any previous error
      setFetchError(null);
      
      // Log if no messages found
      if (!data || data.length === 0) {
        console.log('📨 No messages found in database');
      } else {
        console.log('📨 Raw messages sample:', data.slice(0, 3));
      }

      // Group messages by conversation_id
      const sessionsMap = new Map<string, ChatMessage[]>();
      (data || []).forEach((msg: ChatMessage) => {
        const existing = sessionsMap.get(msg.conversation_id) || [];
        existing.push(msg);
        sessionsMap.set(msg.conversation_id, existing);
      });
      
      console.log('📨 Sessions map size:', sessionsMap.size);

      const sessionsList: ChatSession[] = Array.from(sessionsMap.entries()).map(([conversation_id, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Get user info from first client message (user messages are stored as 'client' in DB)
        const userMessage = messages.find(m => m.sender_type === 'client');
        
        // Check if needs reply (last client message without staff reply after it)
        const lastUserMsgIndex = sortedMessages.map(m => m.sender_type).lastIndexOf('client');
        const hasStaffReplyAfter = sortedMessages.slice(lastUserMsgIndex + 1).some(m => m.sender_type === 'staff');
        const needsReply = lastUserMsgIndex >= 0 && !hasStaffReplyAfter;
        
        // Count unread messages from clients
        const unreadCount = sortedMessages.filter(m => m.sender_type === 'client' && !m.read).length;

        return {
          conversation_id,
          messages: sortedMessages,
          sender_name: userMessage?.sender_name || 'Guest',
          last_message_at: sortedMessages[sortedMessages.length - 1]?.created_at || '',
          needs_reply: needsReply,
          unread_count: unreadCount
        };
      });

      // Sort by needs_reply first, then by last_message_at
      sessionsList.sort((a, b) => {
        if (a.needs_reply && !b.needs_reply) return -1;
        if (!a.needs_reply && b.needs_reply) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      console.log('📨 Final sessions list:', sessionsList.length, sessionsList);
      setSessions(sessionsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setLoading(false);
    }
  }, []);

  // Track known message IDs to detect truly new messages
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef<boolean>(true);
  const lastFetchTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    
    console.log('📨 LiveChatManager: Initializing...');
    
    // Initial fetch - run immediately
    fetchSessions().then(() => {
      console.log('📨 LiveChatManager: Initial fetch complete');
      // Initialize known message IDs from fetched sessions
      setSessions(prev => {
        prev.forEach(session => {
          session.messages.forEach(msg => knownMessageIdsRef.current.add(msg.id));
        });
        return prev;
      });
    });

    // Real-time subscription for INSTANT message delivery (WhatsApp style)
    console.log('📨 LiveChatManager: Setting up realtime subscription for INSTANT delivery...');
    const channel = supabase
      .channel('admin_livechat_instant')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (!isSubscribed || !isMountedRef.current) return;
          
          const newMsg = payload.new as ChatMessage;
          console.log('📩 INSTANT: New message received!', newMsg.sender_type, newMsg.content?.substring(0, 30));
          
          // Skip if we've already seen this message
          if (knownMessageIdsRef.current.has(newMsg.id)) {
            return;
          }
          knownMessageIdsRef.current.add(newMsg.id);
          
          // Play sound for new client messages
          if (newMsg.sender_type === 'client') {
            playNotificationSound();
            toast({
              title: "💬 New Chat Message",
              description: `${newMsg.sender_name || 'Guest'}: ${newMsg.content.substring(0, 50)}...`,
            });
          }
          
          // Immediately update the sessions list with the new message
          setSessions(prevSessions => {
            const existingSessionIndex = prevSessions.findIndex(
              s => s.conversation_id === newMsg.conversation_id
            );
            
            if (existingSessionIndex >= 0) {
              // Update existing session
              const updatedSessions = [...prevSessions];
              const session = { ...updatedSessions[existingSessionIndex] };
              
              // Check if message already exists (by ID or content)
              if (!session.messages.some(m => m.id === newMsg.id || m.content === newMsg.content)) {
                session.messages = [...session.messages, newMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                session.last_message_at = newMsg.created_at;
                
                // Update needs_reply status
                if (newMsg.sender_type === 'client') {
                  session.needs_reply = true;
                  session.unread_count = (session.unread_count || 0) + 1;
                } else if (newMsg.sender_type === 'staff') {
                  session.needs_reply = false;
                }
                
                updatedSessions[existingSessionIndex] = session;
                
                // Re-sort sessions
                updatedSessions.sort((a, b) => {
                  if (a.needs_reply && !b.needs_reply) return -1;
                  if (!a.needs_reply && b.needs_reply) return 1;
                  return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
                });
              }
              
              return updatedSessions;
            } else {
              // New session - fetch all sessions to get complete data
              fetchSessions();
              return prevSessions;
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        () => {
          if (!isSubscribed || !isMountedRef.current) return;
          // Refresh when messages are marked as read (throttled)
          const now = Date.now();
          if (now - lastFetchTimeRef.current > 2000) {
            lastFetchTimeRef.current = now;
            fetchSessions();
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 REALTIME subscription status:', status, err || '');
        if (status === 'SUBSCRIBED') {
          console.log('✅ REALTIME: Successfully subscribed to chat_messages!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ REALTIME: Channel error', err);
        }
      });

    // POLLING FALLBACK: Check for new messages every 2 seconds using REST API
    // This ensures messages appear even if realtime fails
    console.log('📨 LiveChatManager: Starting 2-second polling fallback (REST API)...');
    const POLL_URL = SUPABASE_URL;
    const POLL_KEY = SUPABASE_ANON_KEY;

    const pollingInterval = setInterval(async () => {
      if (!isSubscribed || !isMountedRef.current) return;
      
      try {
        // Use REST API for polling to bypass any client issues
        const pollResponse = await fetch(
          `${POLL_URL}/rest/v1/chat_messages?select=id,conversation_id,sender_type,sender_name,content,created_at&order=created_at.desc&limit=100`,
          {
            headers: {
              'apikey': POLL_KEY,
              'Authorization': `Bearer ${POLL_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (pollResponse.ok) {
          const data = await pollResponse.json();
          
          if (data && data.length > 0) {
            // Find truly new messages
            const newMessages = data.filter((msg: any) => !knownMessageIdsRef.current.has(msg.id));
            
            if (newMessages.length > 0) {
              console.log('📨 POLLING: Found', newMessages.length, 'new messages!');
              
              // Add to known IDs
              newMessages.forEach((msg: any) => knownMessageIdsRef.current.add(msg.id));
              
              // Check for new client messages
              const newClientMessages = newMessages.filter((msg: any) => msg.sender_type === 'client');
              
              if (newClientMessages.length > 0) {
                const latestClientMsg = newClientMessages[0];
                playNotificationSound();
                toast({
                  title: "💬 New Chat Message",
                  description: `${latestClientMsg.sender_name || 'Guest'}: ${latestClientMsg.content.substring(0, 50)}...`,
                });
              }
              
              // Refresh sessions to get updated data
              fetchSessions();
            }
          }
        }
      } catch (err) {
        // Silent fail for polling
        console.log('📨 Polling error (silent):', err);
      }
    }, 2000); // Poll every 2 seconds for instant delivery

    return () => {
      isSubscribed = false;
      console.log('🔌 LiveChatManager: Cleaning up subscriptions');
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [fetchSessions, playNotificationSound, toast]);

  // Also fetch when component becomes visible (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📨 LiveChatManager: Tab became visible, refreshing...');
        fetchSessions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchSessions]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, selectedSession]);

  const handleSendReply = async () => {
    if (!selectedSession || !replyMessage.trim()) return;

    const messageContent = replyMessage.trim();
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Optimistically add the message to UI immediately
    const optimisticMessage: ChatMessage = {
      id: messageId,
      conversation_id: selectedSession,
      sender_id: staffId,
      sender_type: 'staff',
      sender_name: staffName,
      content: messageContent,
      message_type: 'text',
      read: true,
      created_at: timestamp
    };
    
    // Update UI immediately (optimistic update)
    setSessions(prevSessions => {
      const updatedSessions = [...prevSessions];
      const sessionIndex = updatedSessions.findIndex(s => s.conversation_id === selectedSession);
      
      if (sessionIndex >= 0) {
        const session = { ...updatedSessions[sessionIndex] };
        session.messages = [...session.messages, optimisticMessage];
        session.last_message_at = timestamp;
        session.needs_reply = false;
        updatedSessions[sessionIndex] = session;
      }
      
      return updatedSessions;
    });
    
    // Clear input immediately for better UX
    setReplyMessage('');

    try {
      console.log('📤 Sending staff reply to conversation:', selectedSession);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId, // Use same ID for consistency
          conversation_id: selectedSession,
          sender_id: staffId,
          sender_type: 'staff',
          sender_name: staffName,
          content: messageContent,
          message_type: 'text',
          read: true
        });

      if (error) throw error;

      console.log('✅ Staff reply sent successfully');

      // Mark previous messages as read (don't wait for this)
      supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', selectedSession)
        .eq('sender_type', 'client')
        .then(() => console.log('✅ Messages marked as read'));

      toast({
        title: "✅ Reply Sent",
        description: "Your message has been delivered instantly.",
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      
      // Revert optimistic update on error
      setSessions(prevSessions => {
        const updatedSessions = [...prevSessions];
        const sessionIndex = updatedSessions.findIndex(s => s.conversation_id === selectedSession);
        
        if (sessionIndex >= 0) {
          const session = { ...updatedSessions[sessionIndex] };
          session.messages = session.messages.filter(m => m.id !== messageId);
          updatedSessions[sessionIndex] = session;
        }
        
        return updatedSessions;
      });
      
      // Restore the message in input
      setReplyMessage(messageContent);
      
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive"
      });
    }
  };

  const markSessionAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'client');
      
      fetchSessions();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const selectedChatSession = sessions.find(s => s.conversation_id === selectedSession);
  const totalUnread = sessions.reduce((sum, s) => sum + s.unread_count, 0);
  const needsReplyCount = sessions.filter(s => s.needs_reply).length;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Live Chat Manager
          </h2>
          <Badge className="bg-red-500">
            {needsReplyCount} Pending
          </Badge>
          <Badge className="bg-blue-500">
            {totalUnread} Unread
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-gray-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSessions}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {fetchError && (
        <Alert className="mb-4 bg-red-900/30 border-red-500">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>Chat Error:</strong> {fetchError}
            <br />
            <span className="text-xs text-red-400 mt-1 block">
              Run this SQL in Supabase: DROP POLICY IF EXISTS ... (see console for full SQL)
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sessions List */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Chat Sessions ({sessions.length})
          </h3>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                <RefreshCw className="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
                <p>Loading chat sessions...</p>
              </div>
            ) : sessions.length === 0 && !fetchError ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No chat sessions yet</p>
                <p className="text-xs mt-2">Messages from the chat widget will appear here</p>
              </div>
            ) : sessions.length === 0 && fetchError ? (
              <div className="text-center py-8 text-red-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Unable to load messages</p>
                <p className="text-xs mt-2">Check the error above</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.conversation_id}
                  onClick={() => {
                    setSelectedSession(session.conversation_id);
                    markSessionAsRead(session.conversation_id);
                  }}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                    selectedSession === session.conversation_id 
                      ? 'bg-purple-600/30 border border-purple-500' 
                      : 'hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${session.needs_reply ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className="text-sm font-medium text-white">
                        {session.sender_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.unread_count > 0 && (
                        <Badge className="bg-red-500 text-xs">
                          {session.unread_count}
                        </Badge>
                      )}
                      {session.needs_reply && (
                        <Badge className="bg-yellow-500 text-xs">
                          Reply
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {session.messages.length} messages
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* Preview last message */}
                  <p className="text-xs text-gray-400 mt-1 truncate italic">
                    {session.messages[session.messages.length - 1]?.content.substring(0, 40)}...
                  </p>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-2 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          {selectedChatSession ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedChatSession.sender_name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {selectedChatSession.messages.length} messages
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={selectedChatSession.needs_reply ? 'bg-yellow-500' : 'bg-green-500'}>
                    {selectedChatSession.needs_reply ? 'Awaiting Reply' : 'Responded'}
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea ref={scrollRef} className="h-[380px] mb-4 pr-4">
                {selectedChatSession.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 ${msg.sender_type === 'client' ? 'text-left' : 'text-right'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.sender_type === 'client'
                          ? 'bg-gray-700 text-white'
                          : msg.sender_type === 'staff'
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                        {msg.sender_type === 'staff' ? (
                          <><Headphones className="w-3 h-3" /> Staff</>
                        ) : msg.sender_type === 'system' ? (
                          <><Bot className="w-3 h-3" /> AI Bot</>
                        ) : (
                          <><User className="w-3 h-3" /> {msg.sender_name}</>
                        )}
                        {' • '}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollArea>

              {/* Reply Input */}
              <div className="flex gap-2">
                <Input
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply to the customer..."
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                />
                <Button 
                  onClick={handleSendReply} 
                  disabled={!replyMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
              <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">Select a chat session</p>
              <p className="text-sm">Click on a session to view and reply to messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveChatManager;
