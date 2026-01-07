import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  User, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Bot,
  Headphones,
  Bell,
  Volume2,
  VolumeX
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  session_id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  message: string;
  sender_type: 'user' | 'bot' | 'staff';
  staff_id?: string;
  needs_staff_reply: boolean;
  read_by_staff: boolean;
  created_at: string;
}

interface ChatSession {
  session_id: string;
  messages: ChatMessage[];
  user_name?: string;
  user_email?: string;
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
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching chat messages:', error);
        return;
      }

      // Group messages by session_id
      const sessionsMap = new Map<string, ChatMessage[]>();
      (data || []).forEach((msg: ChatMessage) => {
        const existing = sessionsMap.get(msg.session_id) || [];
        existing.push(msg);
        sessionsMap.set(msg.session_id, existing);
      });

      const sessionsList: ChatSession[] = Array.from(sessionsMap.entries()).map(([session_id, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Get user info from first message with user data
        const userMessage = messages.find(m => m.user_name || m.user_email);
        
        // Check if needs reply (last user message without staff reply after it)
        const lastUserMsgIndex = sortedMessages.map(m => m.sender_type).lastIndexOf('user');
        const hasStaffReplyAfter = sortedMessages.slice(lastUserMsgIndex + 1).some(m => m.sender_type === 'staff');
        const needsReply = lastUserMsgIndex >= 0 && !hasStaffReplyAfter;
        
        // Count unread messages
        const unreadCount = sortedMessages.filter(m => m.sender_type === 'user' && !m.read_by_staff).length;

        return {
          session_id,
          messages: sortedMessages,
          user_name: userMessage?.user_name || 'Guest',
          user_email: userMessage?.user_email,
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

      setSessions(sessionsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();

    // Real-time subscription
    const channel = supabase
      .channel('chat_messages_admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Play sound for new user messages
          if (newMsg.sender_type === 'user') {
            playNotificationSound();
            toast({
              title: "New Chat Message",
              description: `${newMsg.user_name || 'Guest'}: ${newMsg.message.substring(0, 50)}...`,
            });
          }
          
          fetchSessions();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchSessions, playNotificationSound, toast]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, selectedSession]);

  const handleSendReply = async () => {
    if (!selectedSession || !replyMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: selectedSession,
          message: replyMessage.trim(),
          sender_type: 'staff',
          staff_id: staffId,
          user_name: staffName,
          needs_staff_reply: false,
          read_by_staff: true,
          read_by_user: false
        });

      if (error) throw error;

      // Mark previous messages as read
      await supabase
        .from('chat_messages')
        .update({ read_by_staff: true })
        .eq('session_id', selectedSession)
        .eq('sender_type', 'user');

      toast({
        title: "Reply Sent",
        description: "Your message has been sent to the user.",
      });

      setReplyMessage('');
      fetchSessions();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive"
      });
    }
  };

  const markSessionAsRead = async (sessionId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_by_staff: true })
        .eq('session_id', sessionId)
        .eq('sender_type', 'user');
      
      fetchSessions();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const selectedChatSession = sessions.find(s => s.session_id === selectedSession);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sessions List */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Chat Sessions ({sessions.length})
          </h3>
          <ScrollArea className="h-[500px]">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No chat sessions yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.session_id}
                  onClick={() => {
                    setSelectedSession(session.session_id);
                    markSessionAsRead(session.session_id);
                  }}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                    selectedSession === session.session_id 
                      ? 'bg-purple-600/30 border border-purple-500' 
                      : 'hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${session.needs_reply ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className="text-sm font-medium text-white">
                        {session.user_name}
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
                  {session.user_email && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {session.user_email}
                    </p>
                  )}
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
                    {session.messages[session.messages.length - 1]?.message.substring(0, 40)}...
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
                    {selectedChatSession.user_name}
                  </h4>
                  {selectedChatSession.user_email && (
                    <p className="text-sm text-gray-400">{selectedChatSession.user_email}</p>
                  )}
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
                    className={`mb-3 ${msg.sender_type === 'user' ? 'text-left' : 'text-right'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.sender_type === 'user'
                          ? 'bg-gray-700 text-white'
                          : msg.sender_type === 'staff'
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                        {msg.sender_type === 'staff' ? (
                          <><Headphones className="w-3 h-3" /> Staff</>
                        ) : msg.sender_type === 'bot' ? (
                          <><Bot className="w-3 h-3" /> AI Bot</>
                        ) : (
                          <><User className="w-3 h-3" /> User</>
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

