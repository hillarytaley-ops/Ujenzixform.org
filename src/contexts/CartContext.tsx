/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - CARTCONTEXT.TSX - DO NOT MODIFY WITHOUT APPROVAL              ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Shopping cart state management                                                 ║
 * ║   2. LocalStorage persistence for cart items                                        ║
 * ║   3. Cart sidebar open/close state                                                  ║
 * ║   4. Add/remove/update quantity functions                                           ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STORAGE_CART_KEY, STORAGE_CART_KEY_LEGACY } from '@/config/appIdentity';

export interface CartItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  supplier_name: string;
  supplier_id?: string;
  /** Store / pickup location for transparency (delivery, builders, clients). */
  supplier_location?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isInCart: (itemId: string) => boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount (prefer new key; migrate from legacy)
  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem(STORAGE_CART_KEY) ??
        localStorage.getItem(STORAGE_CART_KEY_LEGACY);
      console.log('🛒 Loading cart from localStorage:', savedCart ? 'found' : 'not found');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const list = Array.isArray(parsed) ? parsed : [];
        const valid = list.filter((i: any) => i && typeof i.id === 'string' && typeof i.quantity === 'number');
        console.log('🛒 Loaded cart items:', valid.length);
        setItems(valid);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      console.log('🛒 Saving cart to localStorage:', items.length, 'items');
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(items));
      localStorage.removeItem(STORAGE_CART_KEY_LEGACY);
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    console.log('🛒 CartContext.addToCart called:', item?.name, 'qty:', quantity);
    
    if (!item || typeof item.id !== 'string') {
      console.warn('🛒 addToCart: invalid item (missing id)');
      return;
    }
    if (quantity <= 0) {
      console.log('🛒 Quantity is 0 or less, not adding');
      return;
    }
    
    setItems(prevItems => {
      console.log('🛒 Previous items:', prevItems.length);
      const existingItem = prevItems.find(i => i.id === item.id);
      
      let newItems;
      if (existingItem) {
        // Update quantity if item exists
        console.log('🛒 Item exists, updating quantity');
        newItems = prevItems.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        // Add new item
        console.log('🛒 Adding new item');
        newItems = [...prevItems, { ...item, quantity }];
      }
      
      console.log('🛒 New items count:', newItems.length);
      return newItems;
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Update cart item with partial updates (price, supplier, etc.)
  const updateCartItem = (itemId: string, updates: Partial<CartItem>) => {
    console.log('🛒 Updating cart item:', itemId, updates);
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_CART_KEY);
      localStorage.removeItem(STORAGE_CART_KEY_LEGACY);
    } catch {
      /* ignore */
    }
  };

  const getItemQuantity = (itemId: string): number => {
    const item = items.find(i => i.id === itemId);
    return item?.quantity || 0;
  };

  const getTotalItems = (): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = (): number => {
    return items.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  };

  const isInCart = (itemId: string): boolean => {
    return items.some(item => item.id === itemId);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateCartItem,
      clearCart,
      getItemQuantity,
      getTotalItems,
      getTotalPrice,
      isInCart,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

