import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Mail,
  Flag
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatbotMessage {
  id: string;
  session_id: string;
  user_id?: string;
  message: string;
  sender: 'user' | 'bot' | 'staff';
  created_at: string;
  staff_replied?: boolean;
}

interface ChatbotSession {
  session_id: string;
  messages: ChatbotMessage[];
  user_id?: string;
  last_message_at: string;
  needs_reply: boolean;
}

interface SupportChat {
  id: string;
  user_id: string;
  user_role: string;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  messages: SupportMessage[];
}

interface SupportMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface ContactMessage {
  id: string;
  category: string;
  comment: string;
  rating?: number;
  created_at: string;
}

interface AdminConversationsViewerProps {
  staffId: string;
  staffName: string;
  isDarkMode?: boolean;
}

export function AdminConversationsViewer({ staffId, staffName, isDarkMode = true }: AdminConversationsViewerProps) {
  const [activeTab, setActiveTab] = useState('chatbot');
  const [chatbotSessions, setChatbotSessions] = useState<ChatbotSession[]>([]);
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedSupportChat, setSelectedSupportChat] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchChatbotSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by session_id
      const sessionsMap = new Map<string, ChatbotMessage[]>();
      (data || []).forEach((msg: ChatbotMessage) => {
        const existing = sessionsMap.get(msg.session_id) || [];
        existing.push(msg);
        sessionsMap.set(msg.session_id, existing);
      });

      const sessions: ChatbotSession[] = Array.from(sessionsMap.entries()).map(([session_id, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastUserMessage = sortedMessages.filter(m => m.sender === 'user').pop();
        const hasStaffReply = sortedMessages.some(m => m.sender === 'staff');
        
        return {
          session_id,
          messages: sortedMessages,
          user_id: messages[0]?.user_id,
          last_message_at: sortedMessages[sortedMessages.length - 1]?.created_at || '',
          needs_reply: !!lastUserMessage && !hasStaffReply
        };
      });

      // Sort by needs_reply first, then by last_message_at
      sessions.sort((a, b) => {
        if (a.needs_reply && !b.needs_reply) return -1;
        if (!a.needs_reply && b.needs_reply) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setChatbotSessions(sessions);
    } catch (error) {
      console.error('Error fetching chatbot sessions:', error);
    }
  }, []);

  const fetchSupportChats = useCallback(async () => {
    try {
      const { data: chats, error: chatsError } = await supabase
        .from('support_chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Fetch messages for each chat
      const chatsWithMessages = await Promise.all((chats || []).map(async (chat: any) => {
        const { data: messages } = await supabase
          .from('support_messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: true });

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', chat.user_id)
          .single();

        return {
          ...chat,
          messages: messages || [],
          user_name: profile?.full_name || 'Unknown User',
          user_email: profile?.email || 'No email'
        };
      }));

      setSupportChats(chatsWithMessages);
    } catch (error) {
      console.error('Error fetching support chats:', error);
    }
  }, []);

  const fetchContactMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('category', '[CONTACT FORM]')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContactMessages(data || []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchChatbotSessions(),
        fetchSupportChats(),
        fetchContactMessages()
      ]);
      setLoading(false);
    };

    fetchAll();

    // Set up real-time subscriptions
    const chatbotSubscription = supabase
      .channel('chatbot_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbot_messages' }, () => {
        fetchChatbotSessions();
      })
      .subscribe();

    const supportSubscription = supabase
      .channel('support_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        fetchSupportChats();
      })
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchChatbotSessions();
      fetchSupportChats();
    }, 30000);

    return () => {
      chatbotSubscription.unsubscribe();
      supportSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchChatbotSessions, fetchSupportChats, fetchContactMessages]);

  const handleSendChatbotReply = async () => {
    if (!selectedSession || !replyMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('chatbot_messages')
        .insert({
          session_id: selectedSession,
          message: replyMessage.trim(),
          sender: 'staff',
          staff_replied: true
        });

      if (error) throw error;

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent to the user.",
      });

      setReplyMessage('');
      fetchChatbotSessions();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      });
    }
  };

  const handleSendSupportReply = async () => {
    if (!selectedSupportChat || !replyMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          chat_id: selectedSupportChat,
          sender_id: staffId,
          sender_type: 'admin',
          message: replyMessage.trim()
        });

      if (error) throw error;

      // Update chat status
      await supabase
        .from('support_chats')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', selectedSupportChat);

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent to the user.",
      });

      setReplyMessage('');
      fetchSupportChats();
    } catch (error) {
      console.error('Error sending support reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      });
    }
  };

  const selectedChatbotSession = chatbotSessions.find(s => s.session_id === selectedSession);
  const selectedSupport = supportChats.find(c => c.id === selectedSupportChat);

  const bgClass = isDarkMode ? "bg-gray-900" : "bg-white";
  const textClass = isDarkMode ? "text-white" : "text-gray-900";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-600";
  const cardBgClass = isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200";

  return (
    <div className={`${bgClass} rounded-lg`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-gray-700 rounded-none bg-transparent p-0">
          <TabsTrigger 
            value="chatbot" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600"
          >
            <Bot className="w-4 h-4 mr-2" />
            Chatbot
            {chatbotSessions.filter(s => s.needs_reply).length > 0 && (
              <Badge className="ml-2 bg-red-500">{chatbotSessions.filter(s => s.needs_reply).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="support"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
          >
            <Headphones className="w-4 h-4 mr-2" />
            Support
            {supportChats.filter(c => c.status === 'pending').length > 0 && (
              <Badge className="ml-2 bg-red-500">{supportChats.filter(c => c.status === 'pending').length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="contact"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-green-600"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact
          </TabsTrigger>
        </TabsList>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot" className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sessions List */}
            <div className={`${cardBgClass} rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${textClass}`}>Sessions</h3>
                <Button variant="ghost" size="sm" onClick={fetchChatbotSessions}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                {chatbotSessions.map((session) => (
                  <div
                    key={session.session_id}
                    onClick={() => setSelectedSession(session.session_id)}
                    className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                      selectedSession === session.session_id 
                        ? 'bg-purple-600/30 border border-purple-500' 
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${textClass}`}>
                        {session.session_id.slice(0, 8)}...
                      </span>
                      {session.needs_reply && (
                        <Badge className="bg-red-500 text-xs">Needs Reply</Badge>
                      )}
                    </div>
                    <p className={`text-xs ${mutedClass} mt-1`}>
                      {session.messages.length} messages
                    </p>
                    <p className={`text-xs ${mutedClass}`}>
                      {new Date(session.last_message_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* Conversation View */}
            <div className={`lg:col-span-2 ${cardBgClass} rounded-lg p-4`}>
              {selectedChatbotSession ? (
                <>
                  <ScrollArea className="h-[350px] mb-4">
                    {selectedChatbotSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-3 ${msg.sender === 'user' ? 'text-left' : 'text-right'}`}
                      >
                        <div
                          className={`inline-block max-w-[80%] p-3 rounded-lg ${
                            msg.sender === 'user'
                              ? 'bg-gray-700 text-white'
                              : msg.sender === 'staff'
                              ? 'bg-purple-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.sender === 'staff' ? '👤 Staff' : msg.sender === 'bot' ? '🤖 Bot' : '💬 User'} • 
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="bg-gray-700 border-gray-600 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendChatbotReply()}
                    />
                    <Button onClick={handleSendChatbotReply} className="bg-purple-600 hover:bg-purple-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[400px]">
                  <p className={mutedClass}>Select a session to view messages</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chats List */}
            <div className={`${cardBgClass} rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${textClass}`}>Support Chats</h3>
                <Button variant="ghost" size="sm" onClick={fetchSupportChats}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                {supportChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedSupportChat(chat.id)}
                    className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                      selectedSupportChat === chat.id 
                        ? 'bg-blue-600/30 border border-blue-500' 
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${textClass}`}>
                        {chat.user_name}
                      </span>
                      <Badge className={
                        chat.status === 'pending' ? 'bg-yellow-500' :
                        chat.status === 'open' ? 'bg-green-500' : 'bg-gray-500'
                      }>
                        {chat.status}
                      </Badge>
                    </div>
                    <p className={`text-xs ${mutedClass} mt-1`}>{chat.subject}</p>
                    <p className={`text-xs ${mutedClass}`}>
                      {chat.user_role} • {new Date(chat.updated_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* Chat View */}
            <div className={`lg:col-span-2 ${cardBgClass} rounded-lg p-4`}>
              {selectedSupport ? (
                <>
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <h4 className={`font-semibold ${textClass}`}>{selectedSupport.subject}</h4>
                    <p className={`text-sm ${mutedClass}`}>
                      {selectedSupport.user_name} ({selectedSupport.user_email}) • {selectedSupport.user_role}
                    </p>
                  </div>
                  <ScrollArea className="h-[300px] mb-4">
                    {selectedSupport.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-3 ${msg.sender_type === 'user' ? 'text-left' : 'text-right'}`}
                      >
                        <div
                          className={`inline-block max-w-[80%] p-3 rounded-lg ${
                            msg.sender_type === 'user'
                              ? 'bg-gray-700 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.sender_type === 'admin' ? '👤 Admin' : '💬 User'} • 
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="bg-gray-700 border-gray-600 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendSupportReply()}
                    />
                    <Button onClick={handleSendSupportReply} className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[400px]">
                  <p className={mutedClass}>Select a chat to view messages</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="p-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {contactMessages.map((msg) => (
                <Card key={msg.id} className={cardBgClass}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm ${textClass} whitespace-pre-wrap`}>{msg.comment}</p>
                        <p className={`text-xs ${mutedClass} mt-2`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      {msg.rating && (
                        <Badge className="bg-yellow-500">
                          ⭐ {msg.rating}/5
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {contactMessages.length === 0 && (
                <div className="text-center py-12">
                  <Mail className={`w-12 h-12 mx-auto ${mutedClass} mb-4`} />
                  <p className={mutedClass}>No contact messages yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

