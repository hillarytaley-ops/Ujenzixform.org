import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'react-router-dom';

interface Message {
  role: 'user' | 'bot';
  content: string;
  suggestions?: string[];
}

export const SimpleChatButton = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Hide UjenziPro chat on auth pages (login, signup, password reset)
  const authPages = ['/auth', '/admin-login', '/reset-password'];
  if (authPages.includes(location.pathname)) {
    return null;
  }
  
  const [showHumanSupport, setShowHumanSupport] = useState(false);

  // Enhanced AI Response Engine - Kenya Construction Knowledge
  const getAIResponse = async (userQuery: string): Promise<{ response: string; suggestions?: string[] }> => {
    const query = userQuery.toLowerCase();

    // Material Prices
    if (query.includes('price') || query.includes('cost') || query.includes('how much')) {
      if (query.includes('cement')) {
        return {
          response: `💰 **Cement Prices in Kenya:**\n\n**Bamburi Cement 42.5N (50kg):** KES 850 - 900\n**Savannah Cement (50kg):** KES 780 - 820\n**Mombasa Cement (50kg):** KES 800 - 850\n\n**Bulk Discounts:**\n- 50-100 bags: 5% off\n- 100-500 bags: 10% off\n- 500+ bags: 15% off\n\n**Tip:** Coastal regions have lower prices!`,
          suggestions: ['Compare steel prices', 'Find cement suppliers', 'Calculate cement needed']
        };
      }
      if (query.includes('steel') || query.includes('rebar')) {
        return {
          response: `🔩 **Steel Prices (per 6m bar):**\n\n**Y8 (8mm):** KES 380 - 420\n**Y10 (10mm):** KES 580 - 620\n**Y12 (12mm):** KES 850 - 950\n**Y16 (16mm):** KES 1,450 - 1,550\n**Y20 (20mm):** KES 2,200 - 2,400\n\n**Per Ton:** KES 85,000 - 95,000`,
          suggestions: ['Calculate steel needed', 'Find steel suppliers', 'Compare prices']
        };
      }
    }

    // Material Calculations
    if (query.includes('calculate') || query.includes('how many') || query.includes('how much')) {
      if (query.includes('cement')) {
        return {
          response: `🔢 **Cement Calculator:**\n\n**3-Bedroom House:**\n- Foundation: 150-200 bags\n- Columns & Beams: 100-150 bags\n- Slabs: 200-250 bags\n- **Total: 450-600 bags**\n\n**Per Square Meter:**\n- Foundation: 8-10 bags/sqm\n- Floor slab: 6-8 bags/sqm`,
          suggestions: ['Calculate for my project', 'Get cement quote', 'Find suppliers']
        };
      }
    }

    // Suppliers
    if (query.includes('supplier') || query.includes('find') || query.includes('where')) {
      return {
        response: `🏪 **Finding Suppliers:**\n\n**Browse Materials:**\n1. Click "Browse Materials" button\n2. Use filters (Category, Location, Price)\n3. View supplier profiles\n4. Request quotes\n\nAll suppliers are verified with ratings!\n\n**Tell me:** What material and which county?`,
        suggestions: ['Cement in Nairobi', 'Steel in Mombasa', 'Paint in Kisumu']
      };
    }

    // Delivery
    if (query.includes('delivery') || query.includes('deliver')) {
      return {
        response: `🚚 **Delivery Services:**\n\n**Cost Estimates:**\n- Within Nairobi: KES 3,000 - 8,000\n- Suburbs (20-30km): KES 8,000 - 15,000\n- Inter-county: KES 15,000 - 50,000\n\n**Features:**\n✅ Real-time GPS tracking\n✅ QR verification\n✅ Secure payment`,
        suggestions: ['Request delivery', 'Track delivery', 'Delivery to my location']
      };
    }

    // Monitoring Services
    if (query.includes('monitor') || query.includes('camera') || query.includes('surveillance') || query.includes('watch') || query.includes('security')) {
      return {
        response: `📹 **Site Monitoring Services:**\n\n**What We Offer:**\n✅ 24/7 Live Camera Surveillance\n✅ Drone Aerial Monitoring\n✅ AI-Powered Security Alerts\n✅ Time-lapse Construction Progress\n✅ Remote Site Inspection\n\n**Benefits:**\n• Prevent theft & vandalism\n• Monitor worker productivity\n• Track construction progress\n• Remote project oversight\n• Insurance compliance\n• Security documentation\n\n**Pricing:**\n- Basic Camera Setup: KES 50,000 - 100,000\n- Monthly Monitoring: KES 15,000 - 30,000\n- Drone Services: KES 10,000 - 25,000/session\n\n**Access:** Click "Site Monitoring" in menu`,
        suggestions: ['How does monitoring work?', 'Setup site cameras', 'Drone monitoring costs', 'Security features']
      };
    }

    // Help
    if (query.includes('help') || query.includes('how')) {
      return {
        response: `🆘 **UjenziPro Can Help With:**\n\n📦 Material prices & availability\n🔢 Quantity calculations\n🏪 Finding suppliers\n🚚 Delivery estimates\n📹 Site monitoring & security\n🏗️ Project planning\n💡 Best practices\n👤 **Chat with real human staff**\n\nWhat do you need help with?`,
        suggestions: ['Material prices', 'Calculate materials', 'Find suppliers', 'Talk to human staff']
      };
    }

    // Human support request
    if (query.includes('human') || query.includes('staff') || query.includes('person') || query.includes('agent') || query.includes('talk to someone')) {
      setShowHumanSupport(true);
      return {
        response: `👤 **Connect with UjenziPro Staff:**\n\n**Our team is here to help!**\n\n📞 **Call Us:** +254-700-UJENZIPRO\n📧 **Email:** support@ujenzipro.co.ke\n💬 **WhatsApp:** +254-712-345-678\n\n**Office Hours:**\n• Monday - Friday: 8:00 AM - 6:00 PM\n• Saturday: 9:00 AM - 4:00 PM\n• Sunday: Closed\n\n**For urgent matters:** Our 24/7 emergency line is available at +254-700-EMERGENCY\n\n**What can our team help you with?**`,
        suggestions: ['I have a custom order', 'Need project consultation', 'Technical support', 'Back to AI assistant']
      };
    }

    // Default response
    return {
      response: `Hi! I'm UjenziPro 🤖🇰🇪\n\nI can help with:\n• **Prices** - Material costs\n• **Calculate** - Quantities needed\n• **Find** - Suppliers near you\n• **Delivery** - Costs & tracking\n• **Monitoring** - Site security & cameras\n• **Build** - Project estimates\n• **Human Support** - Talk to our staff\n\nWhat would you like to know?`,
      suggestions: ['Cement prices', 'Calculate for 3-bedroom house', 'Find suppliers', 'Talk to human staff']
    };
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    const userQuery = message;
    setMessage('');
    
    // Show typing indicator
    setIsTyping(true);
    
    // Get AI response
    setTimeout(async () => {
      const aiResponse = await getAIResponse(userQuery);
      const botResponse: Message = { 
        role: 'bot', 
        content: aiResponse.response,
        suggestions: aiResponse.suggestions
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 800);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-[9999]"
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-16 w-16 bg-blue-600 hover:bg-blue-700 shadow-2xl animate-pulse"
          style={{ borderRadius: '50%', width: '64px', height: '64px' }}
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </Button>
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
          UJ
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-[9999]"
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
    >
      <Card className="w-96 shadow-2xl">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <div>
              <div className="font-semibold">UjenziPro</div>
              <div className="text-xs">Kenya Construction Expert • AI & Human Support</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-96 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <>
              <div className="bg-white rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 mt-1 text-blue-600" />
                  <div className="text-sm">
                    <strong className="text-blue-600">UjenziPro:</strong> Karibu! I can help you with construction materials, prices, suppliers, and deliveries. Need to talk to a real person? Just ask! What would you like to know?
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs"
                  onClick={() => handleSuggestionClick('Cement prices')}
                >
                  💰 Cement Prices
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs"
                  onClick={() => handleSuggestionClick('Calculate for 3-bedroom house')}
                >
                  🔢 Calculate Materials
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs"
                  onClick={() => handleSuggestionClick('Find suppliers in Nairobi')}
                >
                  🏪 Find Suppliers
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-2 text-xs"
                  onClick={() => handleSuggestionClick('Site monitoring')}
                >
                  📹 Site Monitoring
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500 py-2">
                Click a button or ask me anything!
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'bot' && <Bot className="h-4 w-4 mt-1 text-blue-600 flex-shrink-0" />}
                    <div className={`rounded-lg p-3 max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white ml-auto' 
                        : 'bg-white'
                    }`}>
                      <div className="text-sm whitespace-pre-line">
                        {msg.role === 'bot' && <strong className="text-blue-600">UjenziPro: </strong>}
                        {msg.content}
                      </div>
                    </div>
                    {msg.role === 'user' && <User className="h-4 w-4 mt-1 flex-shrink-0" />}
                  </div>
                  
                  {/* Suggestion Buttons */}
                  {msg.role === 'bot' && msg.suggestions && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <Badge
                          key={sIdx}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 mt-1 text-blue-600" />
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder="Ask UjenziPro or request human support..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  handleSend();
                }
              }}
            />
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by UjenziPro 🇰🇪 • AI & Human Support Available • v2.0
          </div>
        </div>
      </Card>
    </div>
  );
};

