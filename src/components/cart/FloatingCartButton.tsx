/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - FLOATINGCARTBUTTON.TSX - DO NOT MODIFY WITHOUT APPROVAL       ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Floating cart button showing item count and total                              ║
 * ║   2. Opens cart sidebar on click                                                    ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export const FloatingCartButton: React.FC = () => {
  const { getTotalItems, setIsCartOpen, getTotalPrice } = useCart();
  const totalItems = getTotalItems();

  // Position:
  // - Mobile: LEFT side, ABOVE social icons (bottom-20, left-4)
  // - Desktop: RIGHT side, above chatbot (bottom-24, right-6)
  return (
    <Button
      onClick={() => setIsCartOpen(true)}
      className={`fixed z-50 shadow-lg rounded-full flex items-center gap-2
        bottom-20 left-4 h-12 px-3
        sm:bottom-24 sm:right-6 sm:left-auto sm:h-12 sm:px-4
        ${totalItems > 0 
          ? 'bg-green-600 hover:bg-green-700 animate-in slide-in-from-bottom-4' 
          : 'bg-gray-600 hover:bg-gray-700'
        }`}
    >
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </div>
      <div className="flex flex-col items-start text-left">
        <span className="text-xs font-medium">{totalItems > 0 ? 'View Cart' : 'Cart'}</span>
        {totalItems > 0 && (
          <span className="text-[10px] opacity-90">KES {getTotalPrice().toLocaleString()}</span>
        )}
      </div>
    </Button>
  );
};

