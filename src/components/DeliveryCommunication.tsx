import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Send, 
  Phone, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle,
  User
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  senderRole: 'driver' | 'builder' | 'supplier' | 'admin';
  recipient: string;
  content: string;
  timestamp: Date;
  urgent: boolean;
  read: boolean;
  deliveryId?: string;
}

interface Contact {
  id: string;
  name: string;
  role: 'driver' | 'builder' | 'supplier' | 'admin';
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  phone?: string;
}

interface DeliveryCommunicationProps {
  userRole?: string | null;
  user?: any;
}

const DeliveryCommunication: React.FC<DeliveryCommunicationProps> = ({ userRole, user }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'John Kamau',
      senderRole: 'driver',
      recipient: 'Site Manager',
      content: 'Delivery TRK001 is 15 minutes away from the construction site. Please prepare the unloading area.',
      timestamp: new Date(Date.now() - 5 * 60000),
      urgent: false,
      read: true,
      deliveryId: 'TRK001'
    },
    {
      id: '2',
      sender: 'Sarah Wanjiku',
      senderRole: 'builder',
      recipient: 'Driver',
      content: 'We are ready to receive the cement delivery. The crane is positioned for unloading.',
      timestamp: new Date(Date.now() - 3 * 60000),
      urgent: false,
      read: true
    },
    {
      id: '3',
      sender: 'James Mwangi',
      senderRole: 'supplier',
      recipient: 'All',
      content: 'URGENT: Steel delivery DEL002 has been delayed by 2 hours due to traffic. New ETA: 3:30 PM',
      timestamp: new Date(Date.now() - 10 * 60000),
      urgent: true,
      read: false,
      deliveryId: 'DEL002'
    }
  ]);

  const [contacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'John Kamau',
      role: 'driver',
      status: 'online',
      phone: '+254 701 234 567'
    },
    {
      id: '2', 
      name: 'Sarah Wanjiku',
      role: 'builder',
      status: 'online',
      phone: '+254 702 345 678'
    },
    {
      id: '3',
      name: 'James Mwangi', 
      role: 'supplier',
      status: 'busy',
      phone: '+254 703 456 789'
    },
    {
      id: '4',
      name: 'Admin Control',
      role: 'admin',
      status: 'online',
      phone: '+254 704 567 890'
    }
  ]);

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver': return 'bg-blue-500';
      case 'builder': return 'bg-green-500';
      case 'supplier': return 'bg-purple-500';
      case 'admin': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'driver': return 'default';
      case 'builder': return 'secondary';
      case 'supplier': return 'outline';
      case 'admin': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: 'You',
      senderRole: 'admin', // Current user role
      recipient: contacts.find(c => c.id === selectedContact)?.name || '',
      content: newMessage,
      timestamp: new Date(),
      urgent: isUrgent,
      read: false
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setIsUrgent(false);
  };

  const markAsRead = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    );
  };

  const urgentMessages = messages.filter(msg => msg.urgent && !msg.read);
  const recentMessages = messages.slice(-10).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Delivery Communication Center</h2>
        </div>
        {urgentMessages.length > 0 && (
          <Badge variant="destructive" className="text-sm">
            {urgentMessages.length} Urgent Messages
          </Badge>
        )}
      </div>

      {/* Urgent Messages Alert */}
      {urgentMessages.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Urgent Messages</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentMessages.map((message) => (
                <div key={message.id} className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleVariant(message.senderRole)}>
                        {message.senderRole}
                      </Badge>
                      <span className="font-medium">{message.sender}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => markAsRead(message.id)}
                    >
                      Mark Read
                    </Button>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Contacts</CardTitle>
            <CardDescription>Drivers, builders, suppliers & admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map((contact) => (
              <div 
                key={contact.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted ${
                  selectedContact === contact.id ? 'bg-muted border-primary' : ''
                }`}
                onClick={() => setSelectedContact(contact.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{contact.name}</p>
                      <Badge variant={getRoleVariant(contact.role)} className="text-xs">
                        {contact.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{contact.status}</p>
                  </div>
                  {contact.phone && (
                    <Button size="sm" variant="ghost">
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedContact 
                  ? `Chat with ${contacts.find(c => c.id === selectedContact)?.name}`
                  : 'Select a contact to start chatting'
                }
              </CardTitle>
              {selectedContact && (
                <Badge variant="secondary">
                  {contacts.find(c => c.id === selectedContact)?.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages Area */}
            <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-3">
              {selectedContact ? (
                messages
                  .filter(msg => 
                    msg.sender === contacts.find(c => c.id === selectedContact)?.name ||
                    msg.recipient === contacts.find(c => c.id === selectedContact)?.name
                  )
                  .map((message) => (
                    <div 
                      key={message.id}
                      className={`flex gap-3 ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs p-3 rounded-lg ${
                        message.sender === 'You' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.urgent && (
                          <Badge variant="destructive" className="text-xs mb-2">
                            URGENT
                          </Badge>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'You' ? 'text-primary-foreground/70' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a contact to view conversation</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            {selectedContact && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                    />
                    Mark as urgent
                  </label>
                </div>
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Communication Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentMessages.map((message) => (
              <div key={message.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={getRoleColor(message.senderRole)}>
                    {message.sender.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{message.sender}</span>
                    <Badge variant={getRoleVariant(message.senderRole)} className="text-xs">
                      {message.senderRole}
                    </Badge>
                    {message.urgent && (
                      <Badge variant="destructive" className="text-xs">
                        URGENT
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 ml-auto text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{message.content}</p>
                  {message.deliveryId && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Delivery: {message.deliveryId}
                    </Badge>
                  )}
                </div>
                {message.read ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryCommunication;