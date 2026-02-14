import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Search,
  Filter,
  Clock,
  User,
  Users,
  Truck,
  Store,
  HardHat,
  Circle,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CallSession {
  id: string;
  caller_id: string;
  caller_name: string;
  caller_role: string;
  receiver_id: string;
  receiver_name: string;
  receiver_role: string;
  status: 'pending' | 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  call_type: 'voice' | 'video';
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

interface UserContact {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  is_online?: boolean;
}

interface AdminVoiceCallsProps {
  adminId: string;
  adminName: string;
}

export function AdminVoiceCalls({ adminId, adminName }: AdminVoiceCallsProps) {
  const [activeTab, setActiveTab] = useState('incoming');
  const [callSessions, setCallSessions] = useState<CallSession[]>([]);
  const [incomingCalls, setIncomingCalls] = useState<CallSession[]>([]);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Load call history
  const loadCallSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('app_calls')
        .select('*')
        .or(`caller_id.eq.admin,receiver_id.eq.admin,caller_id.eq.${adminId},receiver_id.eq.${adminId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading calls:', error);
        setCallSessions([]);
        return;
      }
      
      setCallSessions(data || []);
      
      // Filter incoming/ringing calls
      const incoming = (data || []).filter(c => 
        c.status === 'ringing' && 
        (c.receiver_id === 'admin' || c.receiver_id === adminId)
      );
      setIncomingCalls(incoming);
    } catch (err) {
      console.error('Error:', err);
      setCallSessions([]);
    }
  };

  // Load contacts (users from all roles)
  const loadContacts = async () => {
    try {
      // Load suppliers
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, company_name, contact_email, user_id')
        .limit(50);

      // Load profiles (builders)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, user_id')
        .limit(50);

      // Load delivery providers
      const { data: deliveryProviders } = await supabase
        .from('delivery_providers')
        .select('id, company_name, contact_email, user_id')
        .limit(50);

      const allContacts: UserContact[] = [];

      // Add suppliers
      (suppliers || []).forEach(s => {
        allContacts.push({
          id: s.user_id || s.id,
          name: s.company_name || 'Unknown Supplier',
          email: s.contact_email || '',
          role: 'supplier',
        });
      });

      // Add builders
      (profiles || []).forEach(p => {
        allContacts.push({
          id: p.user_id || p.id,
          name: p.full_name || 'Unknown Builder',
          email: '',
          role: 'builder',
        });
      });

      // Add delivery providers
      (deliveryProviders || []).forEach(d => {
        allContacts.push({
          id: d.user_id || d.id,
          name: d.company_name || 'Unknown Driver',
          email: d.contact_email || '',
          role: 'delivery_provider',
        });
      });

      setContacts(allContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  useEffect(() => {
    loadCallSessions();
    loadContacts();

    // Real-time subscription for calls
    const callChannel = supabase
      .channel('admin_calls_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_calls',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newCall = payload.new as CallSession;
          if (newCall.receiver_id === 'admin' || newCall.receiver_id === adminId) {
            if (newCall.status === 'ringing') {
              setIncomingCalls(prev => [...prev, newCall]);
              playRingtone();
              toast({
                title: '📞 Incoming Call',
                description: `${newCall.caller_name} is calling...`,
              });
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedCall = payload.new as CallSession;
          if (activeCall?.id === updatedCall.id) {
            if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
              endCall();
            } else if (updatedCall.status === 'active') {
              setActiveCall(updatedCall);
              startCallTimer();
            }
          }
          // Remove from incoming if status changed
          setIncomingCalls(prev => prev.filter(c => 
            c.id !== updatedCall.id || updatedCall.status === 'ringing'
          ));
          loadCallSessions();
        }
      })
      .subscribe();

    return () => {
      callChannel.unsubscribe();
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [adminId]);

  const playRingtone = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 500);
    } catch (err) {
      console.log('Audio not supported');
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Answer incoming call
  const answerCall = async (call: CallSession) => {
    try {
      await supabase
        .from('app_calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', call.id);

      setActiveCall(call);
      setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
      startCallTimer();
    } catch (err) {
      console.error('Error answering call:', err);
    }
  };

  // Reject incoming call
  const rejectCall = async (call: CallSession) => {
    try {
      await supabase
        .from('app_calls')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', call.id);

      setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
    } catch (err) {
      console.error('Error rejecting call:', err);
    }
  };

  // Initiate call to user
  const initiateCall = async (contact: UserContact, callType: 'voice' | 'video') => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_calls')
        .insert({
          caller_id: adminId,
          caller_name: adminName,
          caller_role: 'admin',
          receiver_id: contact.id,
          receiver_name: contact.name,
          receiver_role: contact.role,
          status: 'ringing',
          call_type: callType,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveCall(data);
      toast({
        title: 'Calling...',
        description: `Connecting to ${contact.name}`,
      });

      // Simulate call being answered after 3 seconds
      setTimeout(async () => {
        await supabase
          .from('app_calls')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', data.id);
      }, 3000);

    } catch (err: any) {
      console.error('Error initiating call:', err);
      toast({
        title: 'Call Failed',
        description: 'Unable to connect. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // End active call
  const endCall = async () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    if (activeCall) {
      try {
        await supabase
          .from('app_calls')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            duration_seconds: callDuration
          })
          .eq('id', activeCall.id);
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }

    setActiveCall(null);
    setCallDuration(0);
    loadCallSessions();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'supplier': return <Store className="h-4 w-4 text-orange-500" />;
      case 'builder':
      case 'professional_builder':
      case 'private_builder': return <HardHat className="h-4 w-4 text-blue-500" />;
      case 'delivery_provider': return <Truck className="h-4 w-4 text-teal-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCallStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PhoneCall className="h-4 w-4 text-green-500" />;
      case 'ended': return <PhoneOff className="h-4 w-4 text-gray-500" />;
      case 'missed': return <PhoneMissed className="h-4 w-4 text-red-500" />;
      case 'rejected': return <X className="h-4 w-4 text-red-500" />;
      case 'ringing': return <PhoneIncoming className="h-4 w-4 text-blue-500 animate-pulse" />;
      default: return <Phone className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Active call UI
  if (activeCall) {
    return (
      <Card className="bg-gray-800 border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-8 text-white text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            {activeCall.call_type === 'video' ? (
              <Video className="h-12 w-12" />
            ) : (
              <Phone className="h-12 w-12" />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-1">
            {activeCall.status === 'ringing' ? 'Calling...' : 'Connected'}
          </h3>
          <p className="text-purple-100 mb-2">
            {activeCall.caller_id === adminId ? activeCall.receiver_name : activeCall.caller_name}
          </p>
          <Badge variant="outline" className="border-white/50 text-white mb-4">
            {activeCall.caller_id === adminId ? activeCall.receiver_role : activeCall.caller_role}
          </Badge>
          
          {activeCall.status === 'active' && (
            <div className="flex items-center justify-center gap-2 text-2xl font-mono">
              <Circle className="h-3 w-3 text-green-400 animate-pulse fill-current" />
              {formatDuration(callDuration)}
            </div>
          )}
          
          {activeCall.status === 'ringing' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
        </div>

        <CardContent className="p-6 bg-gray-800">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className={`rounded-full w-14 h-14 border-gray-600 ${isMuted ? 'bg-red-900/50' : ''}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-6 w-6 text-red-400" /> : <Mic className="h-6 w-6 text-white" />}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className={`rounded-full w-14 h-14 border-gray-600 ${!isSpeakerOn ? 'bg-red-900/50' : ''}`}
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              {isSpeakerOn ? <Volume2 className="h-6 w-6 text-white" /> : <VolumeX className="h-6 w-6 text-red-400" />}
            </Button>
            
            {activeCall.call_type === 'video' && (
              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 border-gray-600 ${!isVideoOn ? 'bg-red-900/50' : ''}`}
                onClick={() => setIsVideoOn(!isVideoOn)}
              >
                {isVideoOn ? <Video className="h-6 w-6 text-white" /> : <VideoOff className="h-6 w-6 text-red-400" />}
              </Button>
            )}
            
            <Button
              size="lg"
              className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
              onClick={endCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Phone className="h-5 w-5 text-purple-400" />
          Voice Calls
          {incomingCalls.length > 0 && (
            <Badge className="bg-red-500 animate-pulse ml-2">
              {incomingCalls.length} incoming
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage voice and video calls with suppliers, builders, and delivery providers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-700 mb-4">
            <TabsTrigger value="incoming" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <PhoneIncoming className="h-4 w-4 mr-2" />
              Incoming
              {incomingCalls.length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-xs rounded-full px-1.5">
                  {incomingCalls.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Incoming Calls Tab */}
          <TabsContent value="incoming">
            <ScrollArea className="h-[400px]">
              {incomingCalls.length === 0 ? (
                <div className="text-center py-12">
                  <PhoneIncoming className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No incoming calls</p>
                  <p className="text-sm text-gray-500">Incoming calls will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingCalls.map((call) => (
                    <div
                      key={call.id}
                      className="p-4 rounded-lg bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-800 animate-pulse"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-red-500">
                            <AvatarFallback className="bg-red-900 text-white">
                              {call.caller_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{call.caller_name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              {getRoleIcon(call.caller_role)}
                              <span>{call.caller_role}</span>
                              <span>•</span>
                              <span>{call.call_type}</span>
                            </div>
                          </div>
                        </div>
                        <PhoneIncoming className="h-8 w-8 text-red-400 animate-bounce" />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={() => rejectCall(call)}
                          variant="outline"
                          className="flex-1 border-red-600 text-red-400 hover:bg-red-900/50"
                        >
                          <PhoneOff className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                        <Button
                          onClick={() => answerCall(call)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Answer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            {/* Search and Filter */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                  <SelectItem value="builder">Builders</SelectItem>
                  <SelectItem value="delivery_provider">Drivers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[350px]">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No contacts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-purple-900 text-white">
                              {contact.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{contact.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              {getRoleIcon(contact.role)}
                              <span>{contact.role.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 hover:bg-green-900/50 hover:border-green-600"
                            onClick={() => initiateCall(contact, 'voice')}
                            disabled={loading}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 hover:bg-purple-900/50 hover:border-purple-600"
                            onClick={() => initiateCall(contact, 'video')}
                            disabled={loading}
                          >
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCallSessions}
                className="border-gray-600 text-gray-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <ScrollArea className="h-[350px]">
              {callSessions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No call history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {callSessions.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 rounded-lg bg-gray-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCallStatusIcon(call.status)}
                          <div>
                            <p className="font-medium text-white">
                              {call.caller_id === adminId ? call.receiver_name : call.caller_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              {getRoleIcon(call.caller_id === adminId ? call.receiver_role : call.caller_role)}
                              <span>{call.caller_id === adminId ? 'Outgoing' : 'Incoming'}</span>
                              <span>•</span>
                              <span>{call.call_type}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            call.status === 'ended' ? 'secondary' : 
                            call.status === 'missed' || call.status === 'rejected' ? 'destructive' : 
                            'default'
                          }>
                            {call.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {call.duration_seconds ? formatDuration(call.duration_seconds) : '--:--'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(call.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdminVoiceCalls;
