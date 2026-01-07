import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, DollarSign, Clock, Users, FileText, Eye, CheckCircle,
  Send, Loader2, Calendar, Package, TrendingDown, AlertCircle,
  MessageSquare, MoreVertical, Trash2, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

interface QuoteRequest {
  id: string;
  material: string;
  quantity: string;
  unit: string;
  suppliers_invited: number;
  responses: number;
  best_price: number;
  average_price: number;
  deadline: string;
  status: 'active' | 'expired' | 'accepted' | 'cancelled';
  created_at: string;
  description?: string;
  project_name?: string;
}

interface QuotesTabProps {
  userId?: string;
  isDarkMode?: boolean;
  isProfessional?: boolean;
}

export const QuotesTab: React.FC<QuotesTabProps> = ({ 
  userId, 
  isDarkMode = false,
  isProfessional = false 
}) => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>(mockQuotes);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newQuote, setNewQuote] = useState({
    material: '',
    quantity: '',
    unit: 'bags',
    description: '',
    project_name: '',
    deadline: '',
    suppliers_count: '5'
  });
  const { toast } = useToast();

  const handleCreateQuote = async () => {
    if (!newQuote.material || !newQuote.quantity || !newQuote.deadline) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in material, quantity, and deadline."
      });
      return;
    }

    setCreating(true);

    try {
      // Create new quote object
      const quote: QuoteRequest = {
        id: `QR-${Date.now().toString().slice(-6)}`,
        material: `${newQuote.material} (${newQuote.quantity} ${newQuote.unit})`,
        quantity: newQuote.quantity,
        unit: newQuote.unit,
        suppliers_invited: parseInt(newQuote.suppliers_count),
        responses: 0,
        best_price: 0,
        average_price: 0,
        deadline: newQuote.deadline,
        status: 'active',
        created_at: new Date().toISOString().split('T')[0],
        description: newQuote.description,
        project_name: newQuote.project_name
      };

      // Add to local state
      setQuotes(prev => [quote, ...prev]);

      toast({
        title: "📝 Quote Request Sent!",
        description: `Request for ${newQuote.material} sent to ${newQuote.suppliers_count} suppliers.`,
      });

      // Reset form
      setNewQuote({
        material: '',
        quantity: '',
        unit: 'bags',
        description: '',
        project_name: '',
        deadline: '',
        suppliers_count: '5'
      });
      setShowCreateDialog(false);

    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create quote request. Please try again."
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptBest = (quoteId: string) => {
    setQuotes(prev => prev.map(q => 
      q.id === quoteId ? { ...q, status: 'accepted' as const } : q
    ));
    toast({
      title: "✅ Quote Accepted!",
      description: "The best quote has been accepted. An order will be created.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'expired': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const headerClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const accentColor = isProfessional ? 'blue' : 'emerald';

  return (
    <>
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className={`text-xl ${headerClass}`}>Quote Requests</CardTitle>
              <CardDescription className={textClass}>
                Request quotes from multiple suppliers and compare prices
              </CardDescription>
            </div>
            <Button 
              className={`bg-${accentColor}-600 hover:bg-${accentColor}-700`}
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Quote Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quote Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-green-700'}`}>Active</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-green-800'}`}>
                {quotes.filter(q => q.status === 'active').length}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-700'}`}>Responses</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-blue-800'}`}>
                {quotes.reduce((sum, q) => sum + q.responses, 0)}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-emerald-700'}`}>Accepted</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-emerald-800'}`}>
                {quotes.filter(q => q.status === 'accepted').length}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-amber-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-amber-700'}`}>Avg Savings</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-amber-800'}`}>
                12%
              </p>
            </div>
          </div>

          {/* Quote List */}
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={textClass}>No quote requests yet</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Create a quote request to get competitive prices from suppliers
                </p>
              </div>
            ) : (
              quotes.map((quote) => {
                const daysRemaining = getDaysRemaining(quote.deadline);
                const isExpiringSoon = daysRemaining <= 2 && daysRemaining > 0;
                
                return (
                  <Card 
                    key={quote.id} 
                    className={`border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''} ${
                      isExpiringSoon ? 'border-amber-300 bg-amber-50/30' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className={`font-semibold ${headerClass}`}>{quote.material}</h4>
                            <Badge className={getStatusColor(quote.status)}>
                              {quote.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {quote.responses}/{quote.suppliers_invited} responses
                            </Badge>
                            {isExpiringSoon && (
                              <Badge className="bg-amber-500 text-white">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expires soon
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            {quote.best_price > 0 && (
                              <span className={`flex items-center gap-1 ${textClass}`}>
                                <DollarSign className="h-4 w-4 text-green-600" />
                                Best: <span className="text-green-600 font-semibold">{formatCurrency(quote.best_price)}</span>
                              </span>
                            )}
                            {quote.average_price > 0 && (
                              <span className={`flex items-center gap-1 ${textClass}`}>
                                <TrendingDown className="h-4 w-4" />
                                Avg: {formatCurrency(quote.average_price)}
                              </span>
                            )}
                            <span className={`flex items-center gap-1 ${textClass}`}>
                              <Clock className="h-4 w-4" />
                              Deadline: {quote.deadline}
                              {daysRemaining > 0 && ` (${daysRemaining} days)`}
                            </span>
                            <span className={`flex items-center gap-1 ${textClass}`}>
                              <Users className="h-4 w-4" />
                              {quote.suppliers_invited} suppliers
                            </span>
                          </div>

                          {quote.project_name && (
                            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Project: {quote.project_name}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {quote.status === 'active' && quote.responses > 0 && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className={isDarkMode ? 'border-gray-600' : ''}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Quotes
                              </Button>
                              <Button 
                                size="sm" 
                                className={`bg-${accentColor}-600 hover:bg-${accentColor}-700`}
                                onClick={() => handleAcceptBest(quote.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept Best
                              </Button>
                            </>
                          )}
                          {quote.status === 'active' && quote.responses === 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={isDarkMode ? 'border-gray-600' : ''}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          )}
                          {quote.status === 'accepted' && (
                            <Badge className="bg-blue-600 text-white py-2">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Order Created
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Message Suppliers
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancel Request
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className={`h-5 w-5 text-${accentColor}-600`} />
              Request Quote
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-400' : ''}>
              Send a quote request to multiple suppliers for competitive pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material *</Label>
                <Input
                  id="material"
                  placeholder="e.g., Cement, Steel Bars, Timber"
                  value={newQuote.material}
                  onChange={(e) => setNewQuote(prev => ({ ...prev, material: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_name">For Project (Optional)</Label>
                <Input
                  id="project_name"
                  placeholder="e.g., Kilimani Apartments"
                  value={newQuote.project_name}
                  onChange={(e) => setNewQuote(prev => ({ ...prev, project_name: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g., 500"
                  value={newQuote.quantity}
                  onChange={(e) => setNewQuote(prev => ({ ...prev, quantity: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select 
                  value={newQuote.unit} 
                  onValueChange={(value) => setNewQuote(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bags">Bags</SelectItem>
                    <SelectItem value="tons">Tons</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="sheets">Sheets</SelectItem>
                    <SelectItem value="rolls">Rolls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="suppliers_count">Invite Suppliers</Label>
                <Select 
                  value={newQuote.suppliers_count} 
                  onValueChange={(value) => setNewQuote(prev => ({ ...prev, suppliers_count: value }))}
                >
                  <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 suppliers</SelectItem>
                    <SelectItem value="5">5 suppliers</SelectItem>
                    <SelectItem value="10">10 suppliers</SelectItem>
                    <SelectItem value="all">All matching</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Response Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={newQuote.deadline}
                onChange={(e) => setNewQuote(prev => ({ ...prev, deadline: e.target.value }))}
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Details</Label>
              <Textarea
                id="description"
                placeholder="Any specific requirements, delivery preferences, quality standards..."
                value={newQuote.description}
                onChange={(e) => setNewQuote(prev => ({ ...prev, description: e.target.value }))}
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              className={`bg-${accentColor}-600 hover:bg-${accentColor}-700`}
              onClick={handleCreateQuote}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Mock data
const mockQuotes: QuoteRequest[] = [
  { 
    id: 'QR-001', 
    material: 'Cement (500 bags)', 
    quantity: '500',
    unit: 'bags',
    suppliers_invited: 5, 
    responses: 3, 
    best_price: 340000,
    average_price: 365000,
    deadline: '2024-01-20',
    status: 'active',
    created_at: '2024-01-10',
    project_name: 'Kilimani Apartments'
  },
  { 
    id: 'QR-002', 
    material: 'Roofing Sheets (200 pcs)', 
    quantity: '200',
    unit: 'pieces',
    suppliers_invited: 4, 
    responses: 4, 
    best_price: 180000,
    average_price: 195000,
    deadline: '2024-01-18',
    status: 'active',
    created_at: '2024-01-08'
  },
  { 
    id: 'QR-003', 
    material: 'Electrical Cables (500m)', 
    quantity: '500',
    unit: 'meters',
    suppliers_invited: 6, 
    responses: 2, 
    best_price: 95000,
    average_price: 98000,
    deadline: '2024-01-22',
    status: 'active',
    created_at: '2024-01-12',
    project_name: 'Karen Villa'
  },
  { 
    id: 'QR-004', 
    material: 'Steel Bars (3 tons)', 
    quantity: '3',
    unit: 'tons',
    suppliers_invited: 5, 
    responses: 5, 
    best_price: 420000,
    average_price: 445000,
    deadline: '2024-01-15',
    status: 'accepted',
    created_at: '2024-01-05',
    project_name: 'Mombasa Office'
  },
];

export default QuotesTab;




