import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock,
  RefreshCw,
  Video,
  Mail
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientMessage {
  id: string;
  client_id: string;
  builder_id: string;
  video_id?: string;
  message: string;
  sender_type: 'client' | 'builder';
  created_at: string;
  read: boolean;
  client_name?: string;
  client_email?: string;
  video_title?: string;
}

interface Conversation {
  client_id: string;
  client_name: string;
  client_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  video_title?: string;
}

interface BuilderClientMessagesProps {
  builderId: string;
}

export function BuilderClientMessages({ builderId }: BuilderClientMessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Fetch all messages for this builder
      const { data: messagesData, error } = await supabase
        .from('builder_conversations')
        .select('*')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique client IDs
      const clientIds = [...new Set((messagesData || []).map(m => m.client_id))];

      // Fetch client profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', clientIds);

      // Fetch video titles if any
      const videoIds = [...new Set((messagesData || []).filter(m => m.video_id).map(m => m.video_id))];
      const { data: videos } = await supabase
        .from('builder_videos')
        .select('id, title')
        .in('id', videoIds);

      // Group messages by client
      const conversationsMap = new Map<string, Conversation>();
      
      (messagesData || []).forEach(msg => {
        const profile = profiles?.find(p => p.id === msg.client_id);
        const video = videos?.find(v => v.id === msg.video_id);
        
        if (!conversationsMap.has(msg.client_id)) {
          conversationsMap.set(msg.client_id, {
            client_id: msg.client_id,
            client_name: profile?.full_name || 'Unknown Client',
            client_email: profile?.email || '',
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: msg.sender_type === 'client' && !msg.read ? 1 : 0,
            video_title: video?.title
          });
        } else {
          const existing = conversationsMap.get(msg.client_id)!;
          if (msg.sender_type === 'client' && !msg.read) {
            existing.unread_count++;
          }
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('builder_conversations')
        .select('*')
        .eq('builder_id', builderId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get client profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', clientId)
        .single();

      // Get video titles
      const videoIds = [...new Set((data || []).filter(m => m.video_id).map(m => m.video_id))];
      const { data: videos } = await supabase
        .from('builder_videos')
        .select('id, title')
        .in('id', videoIds);

      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        client_name: profile?.full_name || 'Unknown',
        client_email: profile?.email || '',
        video_title: videos?.find(v => v.id === msg.video_id)?.title
      }));

      setMessages(formattedMessages);

      // Mark messages as read
      await supabase
        .from('builder_conversations')
        .update({ read: true })
        .eq('builder_id', builderId)
        .eq('client_id', clientId)
        .eq('sender_type', 'client');

      fetchConversations(); // Refresh to update unread counts
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('builder_conversations_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'builder_conversations',
        filter: `builder_id=eq.${builderId}`
      }, () => {
        fetchConversations();
        if (selectedConversation) {
          fetchMessages(selectedConversation);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [builderId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('builder_conversations')
        .insert({
          builder_id: builderId,
          client_id: selectedConversation,
          message: newMessage.trim(),
          sender_type: 'builder',
          read: false
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const selectedConvo = conversations.find(c => c.client_id === selectedConversation);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Client Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversations List */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Conversations</h3>
              <Button variant="ghost" size="sm" onClick={fetchConversations}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                  <p className="text-gray-400 text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((convo) => (
                    <div
                      key={convo.client_id}
                      onClick={() => setSelectedConversation(convo.client_id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation === convo.client_id
                          ? 'bg-purple-600/30 border border-purple-500'
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-white text-sm font-medium">
                            {convo.client_name}
                          </span>
                        </div>
                        {convo.unread_count > 0 && (
                          <Badge className="bg-red-500">{convo.unread_count}</Badge>
                        )}
                      </div>
                      {convo.video_title && (
                        <div className="flex items-center gap-1 mt-1">
                          <Video className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-400 text-xs">{convo.video_title}</span>
                        </div>
                      )}
                      <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                        {convo.last_message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(convo.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages View */}
          <div className="lg:col-span-2 bg-gray-900/50 rounded-lg p-4">
            {selectedConvo ? (
              <>
                <div className="mb-4 pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <h4 className="text-white font-medium">{selectedConvo.client_name}</h4>
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedConvo.client_email}
                      </p>
                    </div>
                  </div>
                </div>
                <ScrollArea className="h-[300px] mb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-3 ${msg.sender_type === 'builder' ? 'text-right' : 'text-left'}`}
                    >
                      <div
                        className={`inline-block max-w-[80%] p-3 rounded-lg ${
                          msg.sender_type === 'builder'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        {msg.video_title && (
                          <div className="flex items-center gap-1 mb-1 opacity-70">
                            <Video className="w-3 h-3" />
                            <span className="text-xs">Re: {msg.video_title}</span>
                          </div>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="bg-gray-800 border-gray-600 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

