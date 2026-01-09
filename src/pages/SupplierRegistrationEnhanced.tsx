import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Package,
  CheckCircle,
  ArrowRight,
  Shield,
  Star,
  Truck,
  Upload,
  Image as ImageIcon,
  X,
  Plus,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
// FloatingSocialSidebar moved to App.tsx for global availability
import { useToast } from "@/hooks/use-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE KENYA CONSTRUCTION MATERIALS CATEGORIES
// Based on complete analysis of Kenya's construction industry
// ═══════════════════════════════════════════════════════════════════════════════
const MATERIAL_CATEGORIES = [
  // STRUCTURAL & FOUNDATION
  { id: 'cement', name: 'Cement & Concrete', icon: '🏗️' },
  { id: 'steel', name: 'Steel & Reinforcement', icon: '🔩' },
  { id: 'blocks', name: 'Blocks & Bricks', icon: '🧱' },
  { id: 'sand', name: 'Sand & Aggregates', icon: '🪨' },
  { id: 'stone', name: 'Building Stones', icon: '🪨' },
  { id: 'ready-mix', name: 'Ready Mix Concrete', icon: '🏗️' },
  
  // ROOFING
  { id: 'roofing', name: 'Roofing Materials', icon: '🏠' },
  { id: 'iron-sheets', name: 'Iron Sheets (Mabati)', icon: '🏠' },
  { id: 'gutters', name: 'Gutters & Downpipes', icon: '🌧️' },
  { id: 'waterproofing', name: 'Waterproofing', icon: '💧' },
  
  // TIMBER & WOOD
  { id: 'timber', name: 'Timber & Wood', icon: '🪵' },
  { id: 'plywood', name: 'Plywood & Boards', icon: '🪵' },
  { id: 'formwork', name: 'Formwork & Shuttering', icon: '🪵' },
  { id: 'poles', name: 'Treated Poles', icon: '🪵' },
  
  // DOORS, WINDOWS & OPENINGS
  { id: 'doors', name: 'Doors & Frames', icon: '🚪' },
  { id: 'windows', name: 'Windows & Glass', icon: '🪟' },
  { id: 'aluminium', name: 'Aluminium Works', icon: '🪟' },
  { id: 'door-hardware', name: 'Door & Window Hardware', icon: '🔐' },
  
  // PLUMBING & WATER
  { id: 'plumbing', name: 'Plumbing Supplies', icon: '🚰' },
  { id: 'pipes', name: 'Pipes & Fittings', icon: '🔧' },
  { id: 'tanks', name: 'Water Tanks & Pumps', icon: '💧' },
  { id: 'sanitary', name: 'Sanitary Ware', icon: '🚽' },
  { id: 'taps', name: 'Taps & Mixers', icon: '🚿' },
  { id: 'heaters', name: 'Water Heaters', icon: '🔥' },
  
  // ELECTRICAL
  { id: 'electrical', name: 'Electrical Supplies', icon: '⚡' },
  { id: 'cables', name: 'Cables & Wires', icon: '🔌' },
  { id: 'switches', name: 'Switches & Sockets', icon: '🔘' },
  { id: 'lighting', name: 'Lighting', icon: '💡' },
  { id: 'solar', name: 'Solar Equipment', icon: '☀️' },
  { id: 'generators', name: 'Generators & UPS', icon: '🔋' },
  
  // TILES & FLOORING
  { id: 'tiles', name: 'Tiles & Flooring', icon: '⬜' },
  { id: 'ceramic', name: 'Ceramic & Porcelain', icon: '⬜' },
  { id: 'granite', name: 'Granite & Marble', icon: '🪨' },
  { id: 'vinyl', name: 'Vinyl & Carpet', icon: '🟫' },
  { id: 'tile-accessories', name: 'Tile Adhesive & Grout', icon: '🧴' },
  
  // PAINT & FINISHES
  { id: 'paint', name: 'Paint & Finishes', icon: '🎨' },
  { id: 'emulsion', name: 'Emulsion Paint', icon: '🎨' },
  { id: 'exterior', name: 'Exterior Paint', icon: '🎨' },
  { id: 'varnish', name: 'Varnish & Wood Finish', icon: '🪵' },
  { id: 'primers', name: 'Primers & Putty', icon: '🧴' },
  
  // WALL & CEILING
  { id: 'gypsum', name: 'Gypsum & Ceiling', icon: '⬜' },
  { id: 'insulation', name: 'Insulation', icon: '🧱' },
  { id: 'cladding', name: 'Wall Cladding', icon: '🧱' },
  
  // HARDWARE & FASTENERS
  { id: 'hardware', name: 'Hardware & Fasteners', icon: '🔧' },
  { id: 'nails', name: 'Nails & Screws', icon: '🔩' },
  { id: 'bolts', name: 'Bolts & Nuts', icon: '🔩' },
  { id: 'locks', name: 'Locks & Hinges', icon: '🔐' },
  { id: 'wire', name: 'Wire & Mesh', icon: '🔗' },
  
  // TOOLS & EQUIPMENT
  { id: 'tools', name: 'Tools & Equipment', icon: '🛠️' },
  { id: 'power-tools', name: 'Power Tools', icon: '🔌' },
  { id: 'hand-tools', name: 'Hand Tools', icon: '🔨' },
  { id: 'safety', name: 'Safety Equipment', icon: '🦺' },
  { id: 'scaffolding', name: 'Scaffolding & Ladders', icon: '🪜' },
  
  // ADHESIVES & SEALANTS
  { id: 'adhesives', name: 'Adhesives & Sealants', icon: '🧴' },
  { id: 'epoxy', name: 'Epoxy & Grout', icon: '🧴' },
  
  // FENCING & SECURITY
  { id: 'fencing', name: 'Fencing Materials', icon: '🔗' },
  { id: 'gates', name: 'Gates & Security', icon: '🚧' },
  { id: 'security-systems', name: 'Security Systems', icon: '📹' },
  
  // LANDSCAPING & OUTDOOR
  { id: 'paving', name: 'Paving & Cabro', icon: '🧱' },
  { id: 'drainage', name: 'Drainage Systems', icon: '🕳️' },
  { id: 'garden', name: 'Garden Materials', icon: '🌿' },
  
  // KITCHEN & BUILT-IN
  { id: 'kitchen', name: 'Kitchen Fittings', icon: '🍳' },
  { id: 'countertops', name: 'Countertops', icon: '🪨' },
  { id: 'wardrobes', name: 'Wardrobes & Closets', icon: '🚪' },
  
  // HVAC & VENTILATION
  { id: 'hvac', name: 'HVAC & Ventilation', icon: '❄️' },
  { id: 'fans', name: 'Fans & Air Conditioning', icon: '🌀' },
  
  // FIRE SAFETY
  { id: 'fire-safety', name: 'Fire Safety', icon: '🔥' },
  { id: 'fire-doors', name: 'Fire Doors & Alarms', icon: '🚨' },
  
  // SPECIALTY MATERIALS
  { id: 'damp-proofing', name: 'Damp Proofing', icon: '💧' },
  { id: 'admixtures', name: 'Concrete Admixtures', icon: '🧪' },
  { id: 'reinforcement', name: 'Reinforcement Accessories', icon: '🔩' },
  
  // MISCELLANEOUS
  { id: 'geotextiles', name: 'Geotextiles & Covers', icon: '📦' },
  { id: 'signage', name: 'Signage', icon: '⚠️' },
  { id: 'other', name: 'Other Materials', icon: '📦' }
];

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  image: File | null;
  imagePreview: string | null;
  description: string;
}

const SupplierRegistration = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    county: '',
    businessType: '',
    description: ''
  });
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Pre-fill email from logged-in user's account
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email || '' }));
      }
    };
    getCurrentUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddProduct = () => {
    const newProduct: ProductItem = {
      id: Date.now().toString(),
      name: '',
      category: selectedCategories[0] || '',
      price: '',
      unit: 'piece',
      image: null,
      imagePreview: null,
      description: ''
    };
    setProducts([...products, newProduct]);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleProductChange = (id: string, field: keyof ProductItem, value: any) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleProductChange(id, 'image', file);
        handleProductChange(id, 'imagePreview', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Application Submitted! 🎉",
      description: `Thank you! Your application with ${products.length} products has been submitted. We'll contact you within 24-48 hours.`,
    });
    
    console.log('Supplier registration:', { formData, selectedCategories, products });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* FloatingSocialSidebar now in App.tsx */}

      {/* Hero Section */}
      <section className="relative text-white py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-4xl mb-3">🇰🇪</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">
              Register Your Supplier Business
            </h1>
            <p className="text-lg mb-4 opacity-95">
              Join Kenya's premier construction materials marketplace
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="text-sm font-medium hidden sm:inline">Business Info</span>
              </div>
              <div className="h-px w-12 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="text-sm font-medium hidden sm:inline">Categories</span>
              </div>
              <div className="h-px w-12 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="text-sm font-medium hidden sm:inline">Products</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Business Information */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Business Information</CardTitle>
                  <CardDescription>Tell us about your supplier business</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="e.g., Nairobi Building Supplies Ltd"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessType">Business Type *</Label>
                    <select
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange as any}
                      required
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select business type</option>
                      <option value="manufacturer">Manufacturer</option>
                      <option value="wholesaler">Wholesaler</option>
                      <option value="retailer">Retailer</option>
                      <option value="distributor">Distributor</option>
                      <option value="hardware">Hardware Store</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="description">Business Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of your business..."
                      required
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactPerson">Contact Person *</Label>
                      <Input
                        id="contactPerson"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleChange}
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+254 700 000 000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="business@example.com"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="county">County *</Label>
                      <Input
                        id="county"
                        name="county"
                        value={formData.county}
                        onChange={handleChange}
                        placeholder="e.g., Nairobi"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Specific Location *</Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g., Industrial Area"
                        required
                      />
                    </div>
                  </div>

                  <Button type="button" onClick={() => setStep(2)} className="w-full mt-6">
                    Next: Select Categories
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Categories Selection */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Select Material Categories</CardTitle>
                  <CardDescription>Choose all categories of materials you supply</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {MATERIAL_CATEGORIES.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => handleCategoryToggle(category.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedCategories.includes(category.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                          />
                          <span className="text-2xl">{category.icon}</span>
                        </div>
                        <p className="text-sm font-medium mt-2">{category.name}</p>
                      </div>
                    ))}
                  </div>

                  {selectedCategories.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        ✅ <strong>{selectedCategories.length} categories</strong> selected
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      ← Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setStep(3)} 
                      className="flex-1"
                      disabled={selectedCategories.length === 0}
                    >
                      Next: Add Products
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Add Products with Images & Prices */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Add Your Products</CardTitle>
                  <CardDescription>
                    Upload product images from your phone and set prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Products List */}
                  {products.map((product, index) => (
                    <Card key={product.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Product {index + 1}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(product.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Image Upload */}
                        <div>
                          <Label>Product Image *</Label>
                          <div className="mt-2">
                            {product.imagePreview ? (
                              <div className="relative">
                                <img
                                  src={product.imagePreview}
                                  alt="Product preview"
                                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    handleProductChange(product.id, 'image', null);
                                    handleProductChange(product.id, 'imagePreview', null);
                                  }}
                                  className="absolute top-2 right-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600 font-medium">Click to upload image</p>
                                  <p className="text-xs text-gray-500">or drag and drop</p>
                                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(product.id, e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Product Name *</Label>
                            <Input
                              value={product.name}
                              onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                              placeholder="e.g., Bamburi Cement 50kg"
                              required
                            />
                          </div>

                          <div>
                            <Label>Category *</Label>
                            <select
                              value={product.category}
                              onChange={(e) => handleProductChange(product.id, 'category', e.target.value)}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                              required
                            >
                              <option value="">Select category</option>
                              {selectedCategories.map(catId => {
                                const cat = MATERIAL_CATEGORIES.find(c => c.id === catId);
                                return (
                                  <option key={catId} value={catId}>
                                    {cat?.icon} {cat?.name}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Label>Price (KES) *</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">KES</span>
                              <Input
                                type="number"
                                value={product.price}
                                onChange={(e) => handleProductChange(product.id, 'price', e.target.value)}
                                placeholder="0"
                                className="pl-14"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Unit *</Label>
                            <select
                              value={product.unit}
                              onChange={(e) => handleProductChange(product.id, 'unit', e.target.value)}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                              <option value="piece">Per Piece</option>
                              <option value="bag">Per Bag</option>
                              <option value="ton">Per Ton</option>
                              <option value="meter">Per Meter</option>
                              <option value="sqm">Per Sqm</option>
                              <option value="liter">Per Liter</option>
                              <option value="sheet">Per Sheet</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label>Description (Optional)</Label>
                          <Textarea
                            value={product.description}
                            onChange={(e) => handleProductChange(product.id, 'description', e.target.value)}
                            placeholder="Additional details about this product..."
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add Product Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddProduct}
                    className="w-full border-dashed border-2 h-20 hover:bg-blue-50 hover:border-blue-400"
                    disabled={selectedCategories.length === 0}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Another Product
                  </Button>

                  {products.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        📦 <strong>{products.length} products</strong> added to your catalog
                      </p>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                      ← Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Submit Application
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>

          {/* Benefits */}
          <Card className="mt-8 bg-gradient-to-br from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle>🌟 Supplier Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">📈</div>
                  <h4 className="font-semibold mb-1">Grow Sales</h4>
                  <p className="text-sm text-gray-600">Reach thousands of builders</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">✓</div>
                  <h4 className="font-semibold mb-1">Get Verified</h4>
                  <p className="text-sm text-gray-600">Build trust with buyers</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📱</div>
                  <h4 className="font-semibold mb-1">Easy Management</h4>
                  <p className="text-sm text-gray-600">Update prices anytime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupplierRegistration;







