import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Store, Package } from "lucide-react";
import { Link } from "react-router-dom";
 
import { MaterialsGrid } from "@/components/suppliers/MaterialsGrid";

// Ultra-optimized Suppliers page for mobile/iPhone
const SuppliersMobileOptimized = () => {
  

  

  

  // Render immediately without gating on auth

  return (
    <div className="min-h-screen bg-background">

      {/* Simple, Highly Visible Hero for iPhone */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Flag */}
          <div className="text-5xl mb-4">🇰🇪</div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            UjenziPro Suppliers
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-semibold text-yellow-300 mb-6">
            Kenya's Premier Materials Marketplace
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Browse verified suppliers and quality construction materials across all 47 counties
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            <Button 
              size="lg"
              className="w-full h-14 bg-white text-blue-900 hover:bg-gray-100 font-bold text-lg"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              <Building className="h-5 w-5 mr-2" />
              Browse Materials
            </Button>
            
            <a
              href={`/auth?lite=1&redirect=${encodeURIComponent('/suppliers?tab=purchase')}`}
              className="block w-full"
            >
              <Button 
                size="lg"
                variant="outline"
                className="w-full h-14 border-2 border-white text-white hover:bg-white/20 font-bold text-lg"
              >
                <Store className="h-5 w-5 mr-2" />
                Sign In
              </Button>
            </a>
            <Link to="/suppliers?full=1" className="w-full">
              <Button 
                size="lg"
                variant="secondary"
                className="w-full h-12 bg-white/20 text-white hover:bg-white/30"
              >
                View Full Suppliers Page
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <main className="py-12 px-4">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Construction Materials
            </h2>
            <p className="text-gray-600">
              850+ verified suppliers across Kenya
            </p>
          </div>

          {/* Materials Grid - iPhone Safe Version */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Browse Materials</CardTitle>
              <CardDescription>
                High-quality construction materials from verified suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialsGrid />
            </CardContent>
          </Card>
        </div>
      </main>

      
    </div>
  );
};

export default SuppliersMobileOptimized;

