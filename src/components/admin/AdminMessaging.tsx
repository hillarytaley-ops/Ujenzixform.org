import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Send, 
  Search,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Store,
  Truck,
  ShoppingCart,
  HardHat,
  RefreshCw,
  Filter,
  Bell
} from "lucide-react";

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
}

interface SupportMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

const roleIcons: Record<string, any> = {
  'builder': Building2,
  'supplier': Store,
  'delivery': Truck,
  'private_client': ShoppingCart,
  'professional_builder': HardHat,
  'admin': Users,
};

const roleColors: Record<string, string> = {
  'builder': 'bg-blue-600',
  'supplier': 'bg-amber-600',
  'delivery': 'bg-teal-600',
  'private_client': 'bg-emerald-600',
  'professional_builder': 'bg-indigo-600',
  'admin': 'bg-purple-600',
};

export function AdminMessaging() {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRole, setBroadcastRole] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all support chats with user info
  const fetchChats = async () => {
    setLoading(true);
    try {
      // Get all support chats
      const { data: chatsData, error: chatsError } = await supabase
        .from('support_chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Get user profiles for each chat (profiles table doesn't have email column)
      const userIds = [...new Set((chatsData || []).map(c => c.user_id))];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, user_id, full_name')
          .in('id', userIds);

        // Get roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        // Merge data
        const enrichedChats = (chatsData || []).map(chat => {
          const profile = (profilesData || []).find(p => p.id === chat.user_id || p.user_id === chat.user_id);
          const roleData = (rolesData || []).find(r => r.user_id === chat.user_id);
          return {
            ...chat,
            user_name: profile?.full_name || 'Unknown User',
            user_email: '', // Email not available in profiles table
            user_role: roleData?.role || chat.user_role || 'unknown'
          };
        });

        setChats(enrichedChats);
        setFilteredChats(enrichedChats);
      } else {
        setChats(chatsData || []);
        setFilteredChats(chatsData || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to load support chats",
        variant: "destructive"
      });
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

  // Send message as admin
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: userData.user?.id,
          sender_type: 'admin',
          message: newMessage.trim()
        });

      if (error) throw error;

      // Update chat status and timestamp
      await supabase
        .from('support_chats')
        .update({ 
          status: 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChat.id);

      setNewMessage('');
      fetchMessages(selectedChat.id);
      fetchChats();

      toast({
        title: "✅ Message Sent",
        description: "Your reply has been sent to the user",
      });
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

  // Close chat
  const closeChat = async (chatId: string) => {
    try {
      await supabase
        .from('support_chats')
        .update({ status: 'closed' })
        .eq('id', chatId);

      fetchChats();
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }

      toast({
        title: "Chat Closed",
        description: "Support ticket has been closed",
      });
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  // Send broadcast message to all users of a specific role
  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;

    setSending(true);
    try {
      // Get users to broadcast to
      let usersToNotify: string[] = [];
      
      if (broadcastRole === 'all') {
        const { data } = await supabase.from('profiles').select('id');
        usersToNotify = (data || []).map(u => u.id);
      } else {
        const { data } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', broadcastRole);
        usersToNotify = (data || []).map(u => u.user_id);
      }

      // Create notifications for each user
      const { data: userData } = await supabase.auth.getUser();
      
      for (const userId of usersToNotify) {
        // Create or get existing support chat
        let chatId: string;
        
        const { data: existingChat } = await supabase
          .from('support_chats')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'open')
          .maybeSingle();

        if (existingChat) {
          chatId = existingChat.id;
        } else {
          const { data: newChat } = await supabase
            .from('support_chats')
            .insert({
              user_id: userId,
              user_role: broadcastRole === 'all' ? 'user' : broadcastRole,
              subject: '📢 Admin Broadcast',
              status: 'open'
            })
            .select()
            .single();
          
          chatId = newChat?.id;
        }

        if (chatId) {
          await supabase
            .from('support_messages')
            .insert({
              chat_id: chatId,
              sender_id: userData.user?.id,
              sender_type: 'admin',
              message: `📢 **ADMIN BROADCAST**\n\n${broadcastMessage.trim()}`
            });
        }
      }

      setBroadcastMessage('');
      setShowBroadcast(false);
      fetchChats();

      toast({
        title: "✅ Broadcast Sent",
        description: `Message sent to ${usersToNotify.length} ${broadcastRole === 'all' ? 'users' : broadcastRole + 's'}`,
      });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: "Error",
        description: "Failed to send broadcast",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  // Filter chats
  useEffect(() => {
    let filtered = chats;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.user_name?.toLowerCase().includes(query) ||
        c.user_email?.toLowerCase().includes(query) ||
        c.subject?.toLowerCase().includes(query)
      );
    }

    setFilteredChats(filtered);
  }, [chats, statusFilter, searchQuery]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchChats();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-support-messages')
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
  }, []);

  // Fetch messages when chat selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Open</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600"><AlertCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    const Icon = roleIcons[role] || Users;
    return <Icon className="w-4 h-4" />;
  };

  const openChatsCount = chats.filter(c => c.status === 'open').length;
  const pendingChatsCount = chats.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Chats</p>
                <p className="text-3xl font-bold">{chats.length}</p>
              </div>
              <MessageSquare className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Open</p>
                <p className="text-3xl font-bold">{openChatsCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600 to-amber-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pending</p>
                <p className="text-3xl font-bold">{pendingChatsCount}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setShowBroadcast(true)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Broadcast</p>
                <p className="text-lg font-bold">Send to All</p>
              </div>
              <Bell className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <Card className="border-purple-500 bg-purple-50 dark:bg-purple-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Send Broadcast Message
            </CardTitle>
            <CardDescription>Send a message to all users or specific roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Target Audience</label>
              <select 
                value={broadcastRole} 
                onChange={(e) => setBroadcastRole(e.target.value)}
                className="w-full p-2 border rounded-lg bg-background"
              >
                <option value="all">All Users</option>
                <option value="private_client">Private Clients</option>
                <option value="professional_builder">Professional Builders</option>
                <option value="supplier">Suppliers</option>
                <option value="delivery">Delivery Providers</option>
              </select>
            </div>
            <Textarea 
              placeholder="Type your broadcast message..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={sendBroadcast} disabled={sending || !broadcastMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : 'Send Broadcast'}
              </Button>
              <Button variant="outline" onClick={() => setShowBroadcast(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Support Chats</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchChats}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1">
                {['all', 'open', 'pending', 'closed'].map((status) => (
                  <Button 
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status as any)}
                    className="text-xs"
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {filteredChats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No chats found
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <div 
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${roleColors[chat.user_role] || 'bg-gray-600'} text-white`}>
                          {getRoleIcon(chat.user_role)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{chat.user_name}</p>
                          <p className="text-xs text-muted-foreground">{chat.user_email}</p>
                        </div>
                      </div>
                      {getStatusBadge(chat.status)}
                    </div>
                    <p className="text-sm font-medium truncate">{chat.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="lg:col-span-2">
          {selectedChat ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${roleColors[selectedChat.user_role] || 'bg-gray-600'} text-white`}>
                      {getRoleIcon(selectedChat.user_role)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedChat.user_name}</CardTitle>
                      <CardDescription>{selectedChat.subject}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedChat.status)}
                    {selectedChat.status !== 'closed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => closeChat(selectedChat.id)}
                      >
                        Close Chat
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px] p-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`mb-4 flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        msg.sender_type === 'admin' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                
                {selectedChat.status !== 'closed' && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Type your reply..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      />
                      <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[500px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Select a chat to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
