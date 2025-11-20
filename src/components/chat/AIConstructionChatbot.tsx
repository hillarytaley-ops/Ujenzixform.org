import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  Minimize2,
  Maximize2,
  Sparkles,
  HelpCircle,
  Package,
  DollarSign,
  Truck,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIConstructionChatbotProps {
  userId?: string;
  userName?: string;
}

export const AIConstructionChatbot: React.FC<AIConstructionChatbotProps> = ({ 
  userId, 
  userName = 'Guest' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize chatbot with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        addBotMessage(
          `🇰🇪 Karibu ${userName}! I'm UJbot, your AI Construction Assistant.\n\nI can help you with:\n\n• Material prices and specifications\n• Supplier recommendations\n• Delivery cost estimates\n• Construction best practices\n• Platform features and navigation\n\nWhat would you like to know?`,
          [
            'What materials do I need for a 3-bedroom house?',
            'Compare cement prices',
            'How do I request a delivery?',
            'Find steel suppliers in Nairobi'
          ]
        );
      }, 500);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addBotMessage = (content: string, suggestions?: string[]) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      suggestions
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const addUserMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
  };

  // AI Response Engine - Construction-focused knowledge base
  const getAIResponse = async (userQuery: string): Promise<{ response: string; suggestions?: string[] }> => {
    const query = userQuery.toLowerCase();

    // Material Price Queries
    if (query.includes('price') || query.includes('cost') || query.includes('how much')) {
      if (query.includes('cement')) {
        return {
          response: `💰 **Cement Prices in Kenya:**

**Bamburi Cement 42.5N (50kg):** KES 850 - 900
**Savannah Cement (50kg):** KES 780 - 820
**Mombasa Cement (50kg):** KES 800 - 850

**Bulk Discounts Available:**
- 50-100 bags: 5% off
- 100-500 bags: 10% off
- 500+ bags: 15% off (contact suppliers)

**Tip:** Prices vary by location. Coastal regions may have lower cement prices due to proximity to factories.`,
          suggestions: [
            'Compare steel prices',
            'Find cement suppliers near me',
            'Calculate total cement needed for my project'
          ]
        };
      }

      if (query.includes('steel') || query.includes('rebar')) {
        return {
          response: `🔩 **Steel Bar Prices in Kenya (per 6m bar):**

**Y8 (8mm):** KES 380 - 420
**Y10 (10mm):** KES 580 - 620
**Y12 (12mm):** KES 850 - 950
**Y16 (16mm):** KES 1,450 - 1,550
**Y20 (20mm):** KES 2,200 - 2,400

**Per Ton:** KES 85,000 - 95,000

**KEBS Quality Standards Applied**

All prices include VAT. Delivery costs separate.`,
          suggestions: [
            'How much steel for foundation?',
            'Find steel suppliers',
            'Calculate steel requirements'
          ]
        };
      }

      if (query.includes('paint')) {
        return {
          response: `🎨 **Paint Prices in Kenya:**

**Crown Paints:**
- Emulsion (20L): KES 4,800 - 5,200
- Gloss (4L): KES 2,400 - 2,600

**Galaxy Paints:**
- Emulsion (20L): KES 4,200 - 4,600

**Basco Paints:**
- Emulsion (20L): KES 3,800 - 4,200

**Coverage:** 1 liter covers ~10-12 sqm

**Pro Tip:** Buy during supplier promotions to save 15-20%!`,
          suggestions: ['Calculate paint needed', 'Best paint for exterior', 'Find paint suppliers']
        };
      }
    }

    // Material Calculation Queries
    if (query.includes('calculate') || query.includes('how much') || query.includes('how many')) {
      if (query.includes('cement') || query.includes('bags')) {
        return {
          response: `🔢 **Cement Calculator:**

**For Different Projects:**

**3-Bedroom House (Foundation + Structure):**
- Foundation: 150-200 bags
- Columns & Beams: 100-150 bags  
- Slabs: 200-250 bags
- **Total: 450-600 bags** (22-30 tons)

**Per Square Meter:**
- Foundation slab: 8-10 bags/sqm
- Floor slab: 6-8 bags/sqm
- Plaster: 1.5 bags/sqm

**Formula:**
Cement bags = (Length × Width × Thickness) ÷ 0.035

Need exact calculation? Tell me your dimensions!`,
          suggestions: [
            'Calculate for 10m x 12m foundation',
            'How much for 200 sqm house?',
            'Request cement quote'
          ]
        };
      }

      if (query.includes('steel') || query.includes('rebar')) {
        return {
          response: `🔩 **Steel Calculator:**

**For 3-Bedroom House:**
- Foundation: 1.5-2 tons
- Columns: 2-3 tons
- Ring beams: 1-1.5 tons
- Slabs: 3-4 tons
- **Total: 8-11 tons**

**Per Square Meter (Slab):**
- Standard residential: 35-45 kg/sqm
- Commercial: 50-70 kg/sqm

**Common Bar Sizes:**
- Foundation: Y12, Y16
- Columns: Y12, Y16, Y20
- Slabs: Y8, Y10, Y12

Tell me your floor area for exact calculation!`,
          suggestions: [
            'Steel for 150 sqm house',
            'Find steel suppliers',
            'Compare Y12 vs Y16 prices'
          ]
        };
      }
    }

    // Supplier Queries
    if (query.includes('supplier') || query.includes('find') || query.includes('where')) {
      if (query.includes('nairobi')) {
        return {
          response: `🏪 **Suppliers in Nairobi:**

I can help you find verified suppliers for:
- Cement (Bamburi, Savannah, Mombasa Cement)
- Steel & Rebar (multiple suppliers)
- Paint (Crown, Galaxy, Basco)
- Roofing (Mabati, Safal)
- Hardware & more

**Browse all materials:** Click "Browse Materials" button
**Filter by location:** Use location filter in suppliers page

All suppliers are verified with ratings and reviews!`,
          suggestions: [
            'Show cement suppliers in Nairobi',
            'Compare supplier prices',
            'Request bulk quote'
          ]
        };
      }

      return {
        response: `🔍 **Finding Suppliers:**

**How to find suppliers:**
1. Go to "Browse Materials" page
2. Use filters:
   - Category (Cement, Steel, etc.)
   - Location (County/City)
   - Price range
   - Stock availability

**Or tell me:**
- What material you need
- Your location
- Your budget

I'll help you find the best suppliers!`,
        suggestions: [
          'Find cement in Mombasa',
          'Steel suppliers Kisumu',
          'Cheapest paint suppliers'
        ]
      };
    }

    // Delivery Queries
    if (query.includes('delivery') || query.includes('deliver') || query.includes('transport')) {
      return {
        response: `🚚 **Delivery Services:**

**How to Request Delivery:**
1. Browse materials and select items
2. Click "Request Quote"
3. Supplier sends quote
4. Accept quote
5. Click "Request Delivery"
6. Fill delivery details
7. Track in real-time with GPS!

**Delivery Costs (Nairobi):**
- Within city: KES 3,000 - 8,000
- To suburbs (20-30km): KES 8,000 - 15,000
- Inter-county: KES 15,000 - 50,000

**Features:**
✅ Real-time GPS tracking
✅ QR code verification
✅ Delivery notes
✅ Payment on delivery

**Delivery to which location?** I can estimate costs!`,
        suggestions: [
          'Delivery cost Nairobi to Kiambu',
          'Track my delivery',
          'Request delivery now'
        ]
      };
    }

    // Platform Features
    if (query.includes('how to') || query.includes('how do i') || query.includes('help')) {
      return {
        response: `🆘 **Platform Help:**

**Main Features:**

📦 **Browse Materials** - View all construction materials with images and prices

👷 **Find Builders** - Connect with certified builders across Kenya

🚚 **Request Delivery** - Get materials delivered with GPS tracking

📍 **Track Orders** - Real-time tracking of your materials

📹 **Site Monitoring** - Camera and drone surveillance (optional)

🧠 **ML Analytics** - AI insights on material usage and costs

📱 **QR Scanners** - Verify material authenticity

**What do you need help with?**`,
        suggestions: [
          'How to register as supplier?',
          'How to upload product images?',
          'How does QR verification work?',
          'Explain ML analytics'
        ]
      };
    }

    // Construction Advice
    if (query.includes('bedroom') || query.includes('house') || query.includes('building')) {
      return {
        response: `🏠 **Building a House in Kenya:**

**3-Bedroom House Estimate:**

**Materials Needed:**
- Cement: 450-600 bags (KES 382,500 - 510,000)
- Steel: 8-11 tons (KES 680,000 - 935,000)
- Sand: 15-20 tons (KES 30,000 - 40,000)
- Ballast: 20-25 tons (KES 70,000 - 87,500)
- Blocks: 3,000-4,000 (KES 195,000 - 260,000)
- Roofing: Iron sheets + timber (KES 250,000 - 350,000)
- Paint: 100-150L (KES 24,000 - 36,000)

**Estimated Materials Cost: KES 1.6M - 2.2M**

*Labor and finishing not included*

Want detailed breakdown or quote? I can help!`,
        suggestions: [
          'Calculate exact quantities',
          'Get supplier quotes',
          'Find builders for my project',
          'Material delivery estimate'
        ]
      };
    }

    // ML Analytics
    if (query.includes('ml') || query.includes('analytics') || query.includes('ai') || query.includes('predict')) {
      return {
        response: `🧠 **ML Analytics Features:**

Our AI analyzes your material usage to provide:

**Predictions:**
- Next week material needs (75-95% accuracy)
- Monthly consumption forecasts
- Cost projections

**Insights:**
- High demand detection
- Price trend predictions
- Waste alerts (save 15%!)
- Bulk purchase opportunities

**Optimization:**
- 12-18% cost savings identified
- Smart supplier recommendations
- Seasonal buying tips

**Access:** Click "ML Analytics" in menu

**It's like having a data scientist for your construction project!** 🎯`,
        suggestions: [
          'View my analytics dashboard',
          'Predict next month costs',
          'Show savings opportunities'
        ]
      };
    }

    // Default response with Kenya construction context
    return {
      response: `I'm your AI construction assistant for Kenya! 🇰🇪

I can help with:
• **Material Prices** - Current rates for cement, steel, paint, etc.
• **Calculations** - How much materials you need
• **Suppliers** - Find verified suppliers near you
• **Deliveries** - Request and track material deliveries
• **Best Practices** - Construction tips and standards
• **Platform Help** - How to use MradiPro features

**Ask me anything about construction in Kenya!**

Examples:
- "How much cement for a 4-bedroom house?"
- "Find steel suppliers in Kisumu"
- "What's the best roofing material for coastal areas?"
- "Calculate paint needed for 200 sqm"`,
      suggestions: [
        'Material prices',
        'Find suppliers',
        'Request delivery',
        'Construction tips'
      ]
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    addUserMessage(userMessage);

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI processing time (500-1500ms)
    const processingTime = 500 + Math.random() * 1000;
    
    setTimeout(async () => {
      const { response, suggestions } = await getAIResponse(userMessage);
      addBotMessage(response, suggestions);
      setIsTyping(false);
    }, processingTime);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick action buttons
  const quickActions = [
    { icon: Package, label: 'Material Prices', query: 'Show me current material prices' },
    { icon: DollarSign, label: 'Cost Calculator', query: 'Calculate costs for 3-bedroom house' },
    { icon: Truck, label: 'Delivery Help', query: 'How do I request delivery?' },
    { icon: HelpCircle, label: 'Platform Guide', query: 'How to use MradiPro?' }
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 animate-pulse"
        >
          <MessageCircle className="h-8 w-8" />
        </Button>
        <Badge className="absolute -top-2 -right-2 bg-red-600 animate-bounce">
          <Sparkles className="h-3 w-3 mr-1" />
          AI
        </Badge>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80' : 'w-96'
    }`}>
      <Card className="shadow-2xl border-2 border-blue-200">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">UJbot - AI Assistant</CardTitle>
                <div className="text-xs opacity-90 flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                  Online • Kenya Construction Expert
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0">
            {/* Messages Area */}
            <div className="h-96 p-4 overflow-y-auto" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        {message.type === 'bot' && <Bot className="h-4 w-4 mt-1" />}
                        {message.type === 'user' && <User className="h-4 w-4 mt-1" />}
                        <div className="flex-1">
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* Suggestion Chips */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs opacity-70">Suggestions:</div>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                size="sm"
                                variant="outline"
                                className="text-xs h-auto py-1 px-2 bg-white hover:bg-gray-50"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions (show if no messages) */}
                {messages.length === 0 && !isTyping && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-blue-50"
                        onClick={() => handleSuggestionClick(action.query)}
                      >
                        <action.icon className="h-5 w-5 text-blue-600" />
                        <span className="text-xs">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask UJbot about materials, prices, suppliers..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Powered by UJbot 🇰🇪 • Kenya Construction Expert
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

