import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  X, 
  Headphones,
  Clock,
  CheckCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SupportMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface SupportChatSession {
  id: string;
  user_id: string;
  user_role: string;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  created_at: string;
  updated_at: string;
}

interface SupportChatProps {
  userId: string;
  userRole: string;
  userName?: string;
}

export function SupportChat({ userId, userRole, userName }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<SupportChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<SupportChatSession | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);

      // Auto-select the most recent open session
      const openSession = (data || []).find(s => s.status !== 'closed');
      if (openSession && !activeSession) {
        setActiveSession(openSession);
        fetchMessages(openSession.id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (!activeSession) return;

    // Set up real-time subscription for messages
    const subscription = supabase
      .channel(`support_messages_${activeSession.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `chat_id=eq.${activeSession.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as SupportMessage]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeSession]);

  const createNewSession = async () => {
    if (!newSubject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter a subject for your support request.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_chats')
        .insert({
          user_id: userId,
          user_role: userRole,
          subject: newSubject.trim(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      setActiveSession(data);
      setShowNewChat(false);
      setNewSubject('');
      fetchSessions();

      toast({
        title: "Support Request Created",
        description: "An admin will respond to your request soon.",
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create support request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!activeSession || !newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          chat_id: activeSession.id,
          sender_id: userId,
          sender_type: 'user',
          message: newMessage.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // Update chat timestamp
      await supabase
        .from('support_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeSession.id);

      setNewMessage('');
      fetchMessages(activeSession.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'open':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
      >
        <Headphones className="w-6 h-6" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">Support Chat</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {showNewChat ? (
              // New Chat Form
              <div className="p-4 space-y-4">
                <h3 className="text-white font-medium">New Support Request</h3>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="What do you need help with?"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewChat(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createNewSession}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Start Chat
                  </Button>
                </div>
              </div>
            ) : activeSession ? (
              // Active Chat
              <>
                <div className="p-3 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate">{activeSession.subject}</span>
                    {getStatusBadge(activeSession.status)}
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-3 ${msg.sender_type === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      <div
                        className={`inline-block max-w-[80%] p-3 rounded-lg ${
                          msg.sender_type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-gray-800 border-gray-600 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={activeSession.status === 'closed'}
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={loading || activeSession.status === 'closed'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              // Sessions List
              <div className="p-4">
                <Button 
                  onClick={() => setShowNewChat(true)}
                  className="w-full mb-4 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Support Request
                </Button>
                
                {sessions.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-gray-400 text-sm">Previous Chats</h4>
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveSession(session);
                          fetchMessages(session.id);
                        }}
                        className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm truncate">{session.subject}</span>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    No previous support chats
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

