// Chat types for staff-client communication

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'staff' | 'client' | 'system';
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_avatar?: string;
  client_role?: 'builder' | 'supplier' | 'delivery' | 'guest';
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'staff' | 'builder' | 'supplier' | 'delivery' | 'guest';
  online: boolean;
  last_seen?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
}

// Default quick replies for staff
export const defaultQuickReplies: QuickReply[] = [
  {
    id: '1',
    title: 'Greeting',
    content: 'Hello! Thank you for contacting UjenziPro support. How can I assist you today?',
    category: 'general'
  },
  {
    id: '2',
    title: 'Order Status',
    content: 'I\'d be happy to help you check your order status. Could you please provide your order number?',
    category: 'orders'
  },
  {
    id: '3',
    title: 'Delivery Info',
    content: 'For delivery inquiries, please share your tracking number and I\'ll look into it right away.',
    category: 'delivery'
  },
  {
    id: '4',
    title: 'Account Help',
    content: 'I can help you with your account. What specific issue are you experiencing?',
    category: 'account'
  },
  {
    id: '5',
    title: 'Thank You',
    content: 'Thank you for contacting us! Is there anything else I can help you with?',
    category: 'general'
  },
  {
    id: '6',
    title: 'Closing',
    content: 'Thank you for choosing UjenziPro. Have a great day! Feel free to reach out if you need any further assistance.',
    category: 'general'
  }
];




