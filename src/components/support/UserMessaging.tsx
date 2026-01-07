import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Headphones,
  X
} from "lucide-react";

interface SupportChat {
  id: string;
  user_id: string;
  user_role: string;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  created_at: string;
  updated_at: string;
}

interface SupportMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface UserMessagingProps {
  userId: string;
  userRole: string;
  userName?: string;
  themeColor?: string;
}

export function UserMessaging({ userId, userRole, userName, themeColor = 'blue' }: UserMessagingProps) {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user's chats
  const fetchChats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);

      // Count unread (open chats with admin messages)
      const openChats = (data || []).filter(c => c.status === 'open');
      setUnreadCount(openChats.length);

      // Auto-select most recent open chat
      if (!selectedChat && openChats.length > 0) {
        setSelectedChat(openChats[0]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
    setLoading(false);
  };

  // Fetch messages for selected chat
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

  // Create new chat
  const createNewChat = async () => {
    if (!newSubject.trim()) return;

    setSending(true);
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

      if (error) throw error;

      setNewSubject('');
      setShowNewChat(false);
      setSelectedChat(data);
      fetchChats();

      toast({
        title: "✅ Chat Created",
        description: "Your support request has been submitted",
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: userId,
          sender_type: 'user',
          message: newMessage.trim()
        });

      if (error) throw error;

      // Update chat timestamp
      await supabase
        .from('support_chats')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChat.id);

      setNewMessage('');
      fetchMessages(selectedChat.id);
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchChats();

    const channel = supabase
      .channel('user-support-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages'
      }, () => {
        if (selectedChat) {
          fetchMessages(selectedChat.id);
        }
        fetchChats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_chats'
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-600 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Replied</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600 text-xs"><AlertCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge className="text-xs">{status}</Badge>;
    }
  };

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    teal: 'bg-teal-600 hover:bg-teal-700',
  };

  const buttonColor = colorClasses[themeColor as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${buttonColor} text-white`}>
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Admin Support</h3>
            <p className="text-sm text-muted-foreground">Direct communication with MradiPro team</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-600">{unreadCount} new</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Your Conversations</CardTitle>
              <Button 
                size="sm" 
                className={buttonColor}
                onClick={() => setShowNewChat(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {showNewChat && (
              <div className="p-3 border-b bg-muted/50">
                <Input 
                  placeholder="What do you need help with?"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className={buttonColor}
                    onClick={createNewChat}
                    disabled={sending || !newSubject.trim()}
                  >
                    Start Chat
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowNewChat(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : chats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                  <Button 
                    size="sm" 
                    className={`mt-2 ${buttonColor}`}
                    onClick={() => setShowNewChat(true)}
                  >
                    Start a Chat
                  </Button>
                </div>
              ) : (
                chats.map((chat) => (
                  <div 
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate flex-1">{chat.subject}</p>
                      {getStatusBadge(chat.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2">
          {selectedChat ? (
            <>
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedChat.subject}</CardTitle>
                    <CardDescription className="text-xs">
                      Started {new Date(selectedChat.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedChat.status)}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px] p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`mb-3 flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.sender_type === 'user' 
                            ? `${buttonColor} text-white` 
                            : 'bg-muted'
                        }`}>
                          {msg.sender_type === 'admin' && (
                            <p className="text-xs font-semibold mb-1 text-primary">
                              🛡️ MradiPro Admin
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                
                {selectedChat.status !== 'closed' && (
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      />
                      <Button 
                        className={buttonColor}
                        onClick={sendMessage} 
                        disabled={sending || !newMessage.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a conversation or start a new one</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

