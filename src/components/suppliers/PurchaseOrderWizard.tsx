import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultCategoryImage } from '@/config/defaultCategoryImages';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package, 
  Send,
  Check,
  ArrowRight,
  Store
} from 'lucide-react';

interface PurchaseOrderWizardProps {
  userId: string;
  onComplete?: () => void;
}

interface CartItem {
  materialId: string;
  materialName: string;
  category: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
}

export const PurchaseOrderWizard: React.FC<PurchaseOrderWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<'select' | 'review' | 'submit'>('select');
  const [materials, setMaterials] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          supplier:suppliers(company_name, location)
        `)
        .eq('in_stock', true)
        .limit(50);

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: 'Error loading materials',
        description: 'Could not load materials catalog',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (material: any) => {
    const existing = cart.find(item => item.materialId === material.id);
    
    if (existing) {
      // Increase quantity
      setCart(cart.map(item =>
        item.materialId === material.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      const newItem: CartItem = {
        materialId: material.id,
        materialName: material.name,
        category: material.category,
        supplierId: material.supplier_id,
        supplierName: material.supplier?.company_name || 'Unknown Supplier',
        unitPrice: material.unit_price,
        quantity: 1,
        unit: material.unit,
        imageUrl: material.image_url || getDefaultCategoryImage(material.category)
      };
      setCart([...cart, newItem]);
    }

    toast({
      title: 'Added to cart',
      description: `${material.name} added to your purchase order`,
    });
  };

  const updateQuantity = (materialId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(materialId);
    } else {
      setCart(cart.map(item =>
        item.materialId === materialId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const removeFromCart = (materialId: string) => {
    setCart(cart.filter(item => item.materialId !== materialId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (!projectName.trim()) {
      toast({
        title: 'Project name required',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create purchase order
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          builder_id: userId,
          project_name: projectName,
          delivery_address: deliveryAddress,
          delivery_date: deliveryDate || null,
          status: 'pending',
          notes: notes,
          total_amount: calculateTotal()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add items to order
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        material_id: item.materialId,
        supplier_id: item.supplierId,
        material_name: item.materialName,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: '✅ Purchase Order Created!',
        description: `Order #${orderData.id.slice(0, 8)} submitted. Suppliers will send quotes soon.`,
      });

      // Reset
      setCart([]);
      setProjectName('');
      setDeliveryAddress('');
      setDeliveryDate('');
      setNotes('');
      setStep('select');

      if (onComplete) onComplete();

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error creating order',
        description: 'Failed to submit purchase order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading materials catalog...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'select' ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span>Select Materials</span>
            </div>
            
            <ArrowRight className="h-5 w-5 text-gray-400" />
            
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span>Review Cart</span>
            </div>
            
            <ArrowRight className="h-5 w-5 text-gray-400" />
            
            <div className={`flex items-center gap-2 ${step === 'submit' ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'submit' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span>Submit Order</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shopping Cart Badge */}
      {cart.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">{cart.length} items in cart</p>
                  <p className="text-sm text-gray-600">Total: KES {calculateTotal().toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {step === 'select' && (
                  <Button onClick={() => setStep('review')} className="bg-green-600 hover:bg-green-700">
                    Review Cart
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Materials */}
      {step === 'select' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Materials for Your Order</CardTitle>
              <CardDescription>
                Browse and add construction materials to your purchase order
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => {
              const imageUrl = material.image_url || getDefaultCategoryImage(material.category);
              const inCart = cart.find(item => item.materialId === material.id);

              return (
                <Card key={material.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Material Image */}
                  <div className="relative h-48 bg-white">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={material.name}
                        className="w-full h-full object-contain p-4"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    {inCart && (
                      <Badge className="absolute top-2 right-2 bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        {inCart.quantity} in cart
                      </Badge>
                    )}
                  </div>

                  {/* Material Info */}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-2">{material.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Store className="h-3 w-3" />
                      <span>{material.supplier?.company_name}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold text-blue-600">
                        KES {material.unit_price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        per {material.unit}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {inCart ? (
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(material.id, inCart.quantity - 1)}
                            className="h-10 w-10 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={inCart.quantity}
                            onChange={(e) => updateQuantity(material.id, parseInt(e.target.value) || 0)}
                            className="h-10 text-center font-semibold"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(material.id, inCart.quantity + 1)}
                            className="h-10 w-10 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => addToCart(material)}
                          className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div className="sticky bottom-0 bg-white border-t-2 p-4 shadow-lg">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div>
                  <p className="font-semibold text-lg">{cart.length} items • KES {calculateTotal().toLocaleString()}</p>
                </div>
                <Button size="lg" onClick={() => setStep('review')} className="bg-green-600 hover:bg-green-700">
                  Continue to Review
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review Cart */}
      {step === 'review' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Your Cart</CardTitle>
              <CardDescription>Verify items and quantities before proceeding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.materialId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.imageUrl || '/placeholder.svg'}
                      alt={item.materialName}
                      className="w-16 h-16 object-contain bg-white rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.materialName}</p>
                      <p className="text-sm text-gray-600">{item.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {item.quantity} {item.unit} × KES {item.unitPrice.toLocaleString()}
                      </p>
                      <p className="text-sm text-blue-600 font-semibold">
                        KES {(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.materialId)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">KES {calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
              Back to Shopping
            </Button>
            <Button onClick={() => setStep('submit')} className="flex-1 bg-green-600 hover:bg-green-700">
              Continue to Details
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Submit Order */}
      {step === 'submit' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Provide delivery information for your order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project Name *</Label>
                <Input
                  id="project"
                  placeholder="e.g., 3-Bedroom House - Westlands"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address *</Label>
                <Input
                  id="address"
                  placeholder="e.g., Plot 123, Westlands, Nairobi"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Preferred Delivery Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requirements or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.materialId} className="flex justify-between text-sm">
                    <span>{item.materialName} ({item.quantity} {item.unit})</span>
                    <span className="font-semibold">KES {(item.unitPrice * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">KES {calculateTotal().toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              After submitting, suppliers will review your order and send competitive quotes.
              You'll be notified to compare and select the best offer.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleSubmitOrder} 
              disabled={submitting}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 font-semibold"
            >
              {submitting ? 'Submitting...' : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Purchase Order
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};



