import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Mail,
  Phone,
  FileText,
  Download,
  Eye,
  Archive,
  Trash2,
  Filter,
  Search,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  MessageCircle,
  Bell,
  Settings
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface Conversation {
  id: string;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  status: 'waiting' | 'active' | 'closed';
  source: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  agent_id: string | null;
  agent_name: string | null;
  metadata: any;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  closed_at: string | null;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: 'client' | 'bot' | 'staff' | 'admin';
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url: string | null;
  file_name: string | null;
  read: boolean;
  created_at: string;
}

interface ChatFeedback {
  id: string;
  message_id: string;
  user_id: string | null;
  feedback_type: 'positive' | 'negative';
  message_content: string | null;
  metadata: any;
  created_at: string;
}

interface ChatTranscript {
  id: string;
  conversation_id: string | null;
  user_email: string;
  transcript: string;
  sent_at: string;
}

interface EnhancedCommunicationsManagerProps {
  staffId: string;
  staffName: string;
}

export function EnhancedCommunicationsManager({ staffId, staffName }: EnhancedCommunicationsManagerProps) {
  // State
  const [activeTab, setActiveTab] = useState('live');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedbacks, setFeedbacks] = useState<ChatFeedback[]>([]);
  const [transcripts, setTranscripts] = useState<ChatTranscript[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<ChatTranscript | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUserId();
  }, []);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAHIreli4AAAB4nJ8sAAAA');
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Fetch chat feedback
  const fetchFeedbacks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setFeedbacks(data);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  }, []);

  // Fetch transcripts
  const fetchTranscripts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_transcripts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setTranscripts(data);
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchConversations(),
        fetchFeedbacks(),
        fetchTranscripts()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchConversations, fetchFeedbacks, fetchTranscripts]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin_communications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.sender_type === 'client') {
            playNotificationSound();
            toast({
              title: "💬 New Message",
              description: `${newMsg.sender_name}: ${newMsg.content.substring(0, 50)}...`,
            });
          }
          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            setMessages(prev => [...prev, newMsg]);
          }
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_feedback' },
        () => fetchFeedbacks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, fetchConversations, fetchFeedbacks, playNotificationSound, toast]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update staff online status
  useEffect(() => {
    const updateStatus = async () => {
      try {
        await supabase
          .from('admin_staff')
          .update({ is_online: isOnline, last_seen_at: new Date().toISOString() })
          .eq('email', staffId);
      } catch (error) {
        // Silently fail
      }
    };
    updateStatus();
  }, [isOnline, staffId]);

  // Send reply
  const handleSendReply = async () => {
    if (!selectedConversation || !replyMessage.trim()) return;

    const content = replyMessage.trim();
    setReplyMessage('');

    try {
      // Insert message - use currentUserId (UUID) for sender_id
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUserId,
          sender_type: 'staff',
          sender_name: staffName,
          content: content,
          message_type: 'text',
          read: true
        });

      if (error) throw error;

      // Update conversation - use currentUserId (UUID) for agent_id
      await supabase
        .from('conversations')
        .update({
          status: 'active',
          agent_id: currentUserId,
          agent_name: staffName,
          last_message: content,
          last_message_at: new Date().toISOString(),
          unread_count: 0
        })
        .eq('id', selectedConversation.id);

      // Mark client messages as read
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_type', 'client');

      toast({ title: "✅ Reply sent" });
    } catch (error) {
      console.error('Error sending reply:', error);
      setReplyMessage(content);
      toast({ variant: 'destructive', title: 'Failed to send', description: 'Please try again' });
    }
  };

  // Close conversation
  const handleCloseConversation = async (conversation: Conversation) => {
    try {
      await supabase
        .from('conversations')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      toast({ title: "Conversation closed" });
      fetchConversations();
    } catch (error) {
      console.error('Error closing conversation:', error);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        c.client_name?.toLowerCase().includes(query) ||
        c.client_email?.toLowerCase().includes(query) ||
        c.last_message?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: conversations.length,
    waiting: conversations.filter(c => c.status === 'waiting').length,
    active: conversations.filter(c => c.status === 'active').length,
    closed: conversations.filter(c => c.status === 'closed').length,
    unread: conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    positiveFeedback: feedbacks.filter(f => f.feedback_type === 'positive').length,
    negativeFeedback: feedbacks.filter(f => f.feedback_type === 'negative').length
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'active': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-cyan-400" />
            Communications Center
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage live chats, feedback, and customer communications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online Status Toggle */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span className="text-sm text-gray-300">{isOnline ? 'Online' : 'Offline'}</span>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} />
          </div>
          
          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-gray-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          
          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettingsDialog(true)}
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchConversations();
              fetchFeedbacks();
              fetchTranscripts();
            }}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total Chats</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/30 border-yellow-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.waiting}</p>
            <p className="text-xs text-yellow-400/70">Waiting</p>
          </CardContent>
        </Card>
        <Card className="bg-green-900/30 border-green-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-xs text-green-400/70">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.closed}</p>
            <p className="text-xs text-gray-500">Closed</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/30 border-red-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.unread}</p>
            <p className="text-xs text-red-400/70">Unread</p>
          </CardContent>
        </Card>
        <Card className="bg-green-900/30 border-green-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
              <ThumbsUp className="w-4 h-4" /> {stats.positiveFeedback}
            </p>
            <p className="text-xs text-green-400/70">Positive</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/30 border-red-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400 flex items-center justify-center gap-1">
              <ThumbsDown className="w-4 h-4" /> {stats.negativeFeedback}
            </p>
            <p className="text-xs text-red-400/70">Negative</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="live" className="data-[state=active]:bg-cyan-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            Live Chats
            {stats.waiting > 0 && (
              <Badge className="ml-2 bg-red-500">{stats.waiting}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="data-[state=active]:bg-cyan-600">
            <Star className="w-4 h-4 mr-2" />
            Feedback
            <Badge className="ml-2 bg-gray-600">{feedbacks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="transcripts" className="data-[state=active]:bg-cyan-600">
            <FileText className="w-4 h-4 mr-2" />
            Transcripts
            <Badge className="ml-2 bg-gray-600">{transcripts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Live Chats Tab */}
        <TabsContent value="live" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversations List */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Conversations</CardTitle>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                          selectedConversation?.id === conv.id
                            ? 'bg-cyan-600/30 border border-cyan-500'
                            : 'hover:bg-gray-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(conv.status)}`} />
                            <span className="text-sm font-medium text-white truncate max-w-[120px]">
                              {conv.client_name || 'Guest'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {conv.unread_count > 0 && (
                              <Badge className="bg-red-500 text-xs">{conv.unread_count}</Badge>
                            )}
                            <Badge className={`text-xs ${getPriorityColor(conv.priority)}`}>
                              {conv.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {conv.client_email || 'No email'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate italic">
                          {conv.last_message || 'No messages'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {conv.source || 'chatbot'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {conv.last_message_at 
                              ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                          </span>
                        </div>
                        {conv.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= conv.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat View */}
            <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700">
              {selectedConversation ? (
                <>
                  <CardHeader className="pb-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {selectedConversation.client_name || 'Guest'}
                        </CardTitle>
                        <CardDescription className="text-gray-400 flex items-center gap-4 mt-1">
                          {selectedConversation.client_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {selectedConversation.client_email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 
                            {new Date(selectedConversation.created_at).toLocaleDateString()}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(selectedConversation.status)}>
                          {selectedConversation.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem
                              className="text-gray-300 hover:bg-gray-700"
                              onClick={() => handleCloseConversation(selectedConversation)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Close Conversation
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Messages */}
                    <ScrollArea ref={scrollRef} className="h-[380px] p-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`mb-3 ${msg.sender_type === 'client' ? 'text-left' : 'text-right'}`}
                        >
                          <div
                            className={`inline-block max-w-[80%] p-3 rounded-lg ${
                              msg.sender_type === 'client'
                                ? 'bg-gray-700 text-white'
                                : msg.sender_type === 'staff'
                                ? 'bg-green-600 text-white'
                                : 'bg-cyan-600 text-white'
                            }`}
                          >
                            {msg.file_url && msg.message_type === 'image' && (
                              <img src={msg.file_url} alt="Attachment" className="max-w-full rounded mb-2" />
                            )}
                            {msg.file_url && msg.message_type === 'file' && (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2 text-sm underline">
                                <FileText className="w-4 h-4" /> {msg.file_name || 'Download file'}
                              </a>
                            )}
                            <p className="text-sm whitespace-pre-line">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                              {msg.sender_type === 'staff' ? (
                                <><UserCheck className="w-3 h-3" /> {msg.sender_name}</>
                              ) : msg.sender_type === 'bot' ? (
                                <><Bot className="w-3 h-3" /> UJbot</>
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
                    {selectedConversation.status !== 'closed' && (
                      <div className="p-4 border-t border-gray-700">
                        <div className="flex gap-2">
                          <Input
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply..."
                            className="bg-gray-700 border-gray-600 text-white"
                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                          />
                          <Button
                            onClick={handleSendReply}
                            disabled={!replyMessage.trim()}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Send className="w-4 h-4 mr-2" /> Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center h-[500px] text-gray-500">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg">Select a conversation</p>
                  <p className="text-sm">Click on a chat to view and reply</p>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="mt-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Chat Feedback</CardTitle>
              <CardDescription className="text-gray-400">
                User feedback on bot responses and chat quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {feedbacks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No feedback yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className={`p-4 rounded-lg border ${
                          feedback.feedback_type === 'positive'
                            ? 'bg-green-900/20 border-green-700'
                            : 'bg-red-900/20 border-red-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {feedback.feedback_type === 'positive' ? (
                              <ThumbsUp className="w-5 h-5 text-green-400" />
                            ) : (
                              <ThumbsDown className="w-5 h-5 text-red-400" />
                            )}
                            <span className={`font-medium ${
                              feedback.feedback_type === 'positive' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {feedback.feedback_type === 'positive' ? 'Positive' : 'Negative'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(feedback.created_at).toLocaleString()}
                          </span>
                        </div>
                        {feedback.message_content && (
                          <p className="text-sm text-gray-300 mt-2 italic">
                            "{feedback.message_content}"
                          </p>
                        )}
                        {feedback.metadata?.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.metadata.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcripts Tab */}
        <TabsContent value="transcripts" className="mt-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Chat Transcripts</CardTitle>
              <CardDescription className="text-gray-400">
                Email transcripts sent to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {transcripts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No transcripts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map((transcript) => (
                      <div
                        key={transcript.id}
                        className="p-4 rounded-lg bg-gray-700/50 border border-gray-600 hover:bg-gray-700 cursor-pointer"
                        onClick={() => {
                          setSelectedTranscript(transcript);
                          setShowTranscriptDialog(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-cyan-400" />
                            <span className="text-white">{transcript.user_email}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(transcript.sent_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2 truncate">
                          {transcript.transcript.substring(0, 100)}...
                        </p>
                        <Button variant="ghost" size="sm" className="mt-2 text-cyan-400">
                          <Eye className="w-4 h-4 mr-1" /> View Full Transcript
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Communication Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Sound Notifications</Label>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show as Online</Label>
              <Switch checked={isOnline} onCheckedChange={setIsOnline} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Chat Transcript
            </DialogTitle>
          </DialogHeader>
          {selectedTranscript && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4" />
                Sent to: {selectedTranscript.user_email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                {new Date(selectedTranscript.sent_at).toLocaleString()}
              </div>
              <ScrollArea className="h-[400px] border border-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {selectedTranscript.transcript}
                </pre>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTranscriptDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EnhancedCommunicationsManager;

