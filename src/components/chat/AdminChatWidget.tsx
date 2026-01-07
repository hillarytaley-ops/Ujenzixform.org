import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle, Send, Search, MoreVertical, Phone, Video,
  User, Clock, CheckCircle, AlertCircle, X, Paperclip,
  Smile, Zap, Archive, Tag, UserPlus, RefreshCw, Filter,
  ChevronLeft, ChevronRight, Circle, MessageSquare, Bell,
  Building2, Truck, Store, Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Conversation, ChatMessage, QuickReply, defaultQuickReplies } from '@/types/chat';

interface AdminChatWidgetProps {
  staffId?: string;
  staffName?: string;
  isDarkMode?: boolean;
}

// Mock conversations for demo
const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    client_id: 'user-001',
    client_name: 'John Kamau',
    client_email: 'john.kamau@gmail.com',
    client_role: 'builder',
    status: 'open',
    priority: 'high',
    subject: 'Order delivery delay',
    last_message: 'When will my cement order arrive?',
    last_message_at: new Date(Date.now() - 5 * 60000).toISOString(),
    unread_count: 3,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    tags: ['delivery', 'urgent']
  },
  {
    id: 'conv-002',
    client_id: 'user-002',
    client_name: 'Mary Wanjiku',
    client_email: 'mary.w@company.co.ke',
    client_role: 'supplier',
    status: 'pending',
    priority: 'normal',
    subject: 'Product listing help',
    last_message: 'How do I add new products to my store?',
    last_message_at: new Date(Date.now() - 30 * 60000).toISOString(),
    unread_count: 1,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
    tags: ['onboarding']
  },
  {
    id: 'conv-003',
    client_id: 'user-003',
    client_name: 'Peter Ochieng',
    client_email: 'peter.o@delivery.co.ke',
    client_role: 'delivery',
    status: 'open',
    priority: 'urgent',
    subject: 'Payment issue',
    last_message: 'My payment has not been processed yet',
    last_message_at: new Date(Date.now() - 2 * 60000).toISOString(),
    unread_count: 5,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    tags: ['payment', 'urgent']
  },
  {
    id: 'conv-004',
    client_id: 'user-004',
    client_name: 'Grace Achieng',
    client_email: 'grace@email.com',
    client_role: 'builder',
    status: 'resolved',
    priority: 'low',
    subject: 'Account verification',
    last_message: 'Thank you for your help!',
    last_message_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    unread_count: 0,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    tags: ['account']
  }
];

// Mock messages for demo
const mockMessages: Record<string, ChatMessage[]> = {
  'conv-001': [
    {
      id: 'msg-001',
      conversation_id: 'conv-001',
      sender_id: 'user-001',
      sender_type: 'client',
      sender_name: 'John Kamau',
      content: 'Hello, I placed an order for cement 3 days ago',
      message_type: 'text',
      read: true,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'msg-002',
      conversation_id: 'conv-001',
      sender_id: 'staff-001',
      sender_type: 'staff',
      sender_name: 'Support Team',
      content: 'Hello John! Let me check on your order. Could you please provide your order number?',
      message_type: 'text',
      read: true,
      created_at: new Date(Date.now() - 1.5 * 3600000).toISOString()
    },
    {
      id: 'msg-003',
      conversation_id: 'conv-001',
      sender_id: 'user-001',
      sender_type: 'client',
      sender_name: 'John Kamau',
      content: 'Order number is ORD-2024-0156',
      message_type: 'text',
      read: true,
      created_at: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      id: 'msg-004',
      conversation_id: 'conv-001',
      sender_id: 'user-001',
      sender_type: 'client',
      sender_name: 'John Kamau',
      content: 'When will my cement order arrive?',
      message_type: 'text',
      read: false,
      created_at: new Date(Date.now() - 5 * 60000).toISOString()
    }
  ],
  'conv-002': [
    {
      id: 'msg-005',
      conversation_id: 'conv-002',
      sender_id: 'user-002',
      sender_type: 'client',
      sender_name: 'Mary Wanjiku',
      content: 'Hi, I just registered as a supplier',
      message_type: 'text',
      read: true,
      created_at: new Date(Date.now() - 24 * 3600000).toISOString()
    },
    {
      id: 'msg-006',
      conversation_id: 'conv-002',
      sender_id: 'user-002',
      sender_type: 'client',
      sender_name: 'Mary Wanjiku',
      content: 'How do I add new products to my store?',
      message_type: 'text',
      read: false,
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    }
  ],
  'conv-003': [
    {
      id: 'msg-007',
      conversation_id: 'conv-003',
      sender_id: 'user-003',
      sender_type: 'client',
      sender_name: 'Peter Ochieng',
      content: 'My payment has not been processed yet',
      message_type: 'text',
      read: false,
      created_at: new Date(Date.now() - 2 * 60000).toISOString()
    }
  ]
};

export const AdminChatWidget: React.FC<AdminChatWidgetProps> = ({
  staffId = 'staff-001',
  staffName = 'Support Team',
  isDarkMode = false
}) => {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const convMessages = mockMessages[selectedConversation.id] || [];
      setMessages(convMessages);
      
      // Mark messages as read
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c
      ));
    }
  }, [selectedConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up real-time subscription (would connect to Supabase in production)
  useEffect(() => {
    // Simulate new message notification
    const interval = setInterval(() => {
      // Random chance of new message
      if (Math.random() > 0.95) {
        toast({
          title: "💬 New Message",
          description: "You have a new message from a client",
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);

    try {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_id: staffId,
        sender_type: 'staff',
        sender_name: staffName,
        content: newMessage.trim(),
        message_type: 'text',
        read: true,
        created_at: new Date().toISOString()
      };

      // Add to local state
      setMessages(prev => [...prev, message]);
      
      // Update conversation last message
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { 
              ...c, 
              last_message: newMessage.trim(),
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } 
          : c
      ));

      setNewMessage('');

      // In production, save to Supabase
      // await supabase.from('chat_messages').insert(message);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    setNewMessage(reply.content);
    setShowQuickReplies(false);
  };

  const handleStatusChange = (conversationId: string, newStatus: Conversation['status']) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, status: newStatus } : c
    ));
    
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : null);
    }

    toast({
      title: "Status Updated",
      description: `Conversation marked as ${newStatus}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'resolved': return 'bg-blue-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'builder': return <Building2 className="h-3 w-3" />;
      case 'supplier': return <Store className="h-3 w-3" />;
      case 'delivery': return <Truck className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const headerClass = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <Card className={`${cardClass} h-[700px] flex flex-col`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageCircle className="h-6 w-6 text-cyan-600" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <div>
              <CardTitle className={`text-lg ${headerClass}`}>Support Chat</CardTitle>
              <p className={`text-xs ${textClass}`}>
                {conversations.filter(c => c.status === 'open').length} active conversations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex overflow-hidden">
        {/* Conversations List */}
        {!isCollapsed && (
          <div className={`w-80 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
            {/* Search and Filter */}
            <div className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-9 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                />
              </div>
              <div className="flex gap-1">
                {['all', 'open', 'pending', 'resolved'].map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className={`h-8 w-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-sm ${textClass}`}>No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conv.id
                          ? isDarkMode ? 'bg-cyan-900/30 border border-cyan-700' : 'bg-cyan-50 border border-cyan-200'
                          : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.client_avatar} />
                            <AvatarFallback className={isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}>
                              {conv.client_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${
                            isDarkMode ? 'border-gray-800' : 'border-white'
                          } ${getStatusColor(conv.status)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm truncate ${headerClass}`}>
                                {conv.client_name}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 flex items-center gap-0.5">
                                {getRoleIcon(conv.client_role)}
                                {conv.client_role}
                              </Badge>
                            </div>
                            <span className={`text-xs ${textClass}`}>
                              {formatTime(conv.last_message_at || conv.updated_at)}
                            </span>
                          </div>
                          <p className={`text-xs truncate ${textClass}`}>
                            {conv.last_message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-[10px] px-1 py-0 ${getPriorityColor(conv.priority)}`}>
                              {conv.priority}
                            </Badge>
                            {conv.unread_count > 0 && (
                              <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.client_avatar} />
                    <AvatarFallback>
                      {selectedConversation.client_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${headerClass}`}>
                        {selectedConversation.client_name}
                      </span>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {getRoleIcon(selectedConversation.client_role)}
                        {selectedConversation.client_role}
                      </Badge>
                    </div>
                    <p className={`text-xs ${textClass}`}>{selectedConversation.client_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Circle className={`h-2 w-2 mr-2 ${getStatusColor(selectedConversation.status)}`} />
                        {selectedConversation.status}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleStatusChange(selectedConversation.id, 'open')}>
                        <Circle className="h-2 w-2 mr-2 bg-green-500" /> Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(selectedConversation.id, 'pending')}>
                        <Circle className="h-2 w-2 mr-2 bg-yellow-500" /> Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(selectedConversation.id, 'resolved')}>
                        <Circle className="h-2 w-2 mr-2 bg-blue-500" /> Resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(selectedConversation.id, 'closed')}>
                        <Circle className="h-2 w-2 mr-2 bg-gray-500" /> Closed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <User className="h-4 w-4 mr-2" /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="h-4 w-4 mr-2" /> Assign Staff
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Tag className="h-4 w-4 mr-2" /> Add Tags
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${
                        message.sender_type === 'staff'
                          ? 'bg-cyan-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl'
                          : isDarkMode 
                            ? 'bg-gray-700 text-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl'
                            : 'bg-gray-100 text-gray-900 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl'
                      } px-4 py-2`}>
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          message.sender_type === 'staff' ? 'text-cyan-200' : textClass
                        }`}>
                          <span className="text-xs">{formatTime(message.created_at)}</span>
                          {message.sender_type === 'staff' && message.read && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {showQuickReplies && (
                <div className={`p-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex flex-wrap gap-2">
                    {defaultQuickReplies.map(reply => (
                      <Button
                        key={reply.id}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleQuickReply(reply)}
                      >
                        {reply.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className={`p-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className={showQuickReplies ? 'bg-cyan-100 text-cyan-700' : ''}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className={`flex-1 min-h-[40px] max-h-[120px] resize-none ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                    rows={1}
                  />
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <h3 className={`text-lg font-medium mb-2 ${headerClass}`}>Select a conversation</h3>
                <p className={`text-sm ${textClass}`}>
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminChatWidget;




