import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Supplier } from '@/types/supplier';

interface ModalState {
  quoteModal: {
    isOpen: boolean;
    supplier: Supplier | null;
  };
  catalogModal: {
    isOpen: boolean;
    supplier: Supplier | null;
  };
  registrationModal: {
    isOpen: boolean;
  };
}

interface ModalContextType {
  modals: ModalState;
  openQuoteModal: (supplier: Supplier) => void;
  openCatalogModal: (supplier: Supplier) => void;
  openRegistrationModal: () => void;
  closeQuoteModal: () => void;
  closeCatalogModal: () => void;
  closeRegistrationModal: () => void;
  closeAllModals: () => void;
}

const initialState: ModalState = {
  quoteModal: { isOpen: false, supplier: null },
  catalogModal: { isOpen: false, supplier: null },
  registrationModal: { isOpen: false },
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<ModalState>(initialState);

  const openQuoteModal = (supplier: Supplier) => {
    setModals(prev => ({
      ...prev,
      quoteModal: { isOpen: true, supplier },
      catalogModal: { isOpen: false, supplier: null }, // Close other modals
    }));
  };

  const openCatalogModal = (supplier: Supplier) => {
    setModals(prev => ({
      ...prev,
      catalogModal: { isOpen: true, supplier },
      quoteModal: { isOpen: false, supplier: null }, // Close other modals
    }));
  };

  const openRegistrationModal = () => {
    setModals(prev => ({
      ...prev,
      registrationModal: { isOpen: true },
      quoteModal: { isOpen: false, supplier: null },
      catalogModal: { isOpen: false, supplier: null },
    }));
  };

  const closeQuoteModal = () => {
    setModals(prev => ({
      ...prev,
      quoteModal: { isOpen: false, supplier: null },
    }));
  };

  const closeCatalogModal = () => {
    setModals(prev => ({
      ...prev,
      catalogModal: { isOpen: false, supplier: null },
    }));
  };

  const closeRegistrationModal = () => {
    setModals(prev => ({
      ...prev,
      registrationModal: { isOpen: false },
    }));
  };

  const closeAllModals = () => {
    setModals(initialState);
  };

  const value: ModalContextType = {
    modals,
    openQuoteModal,
    openCatalogModal,
    openRegistrationModal,
    closeQuoteModal,
    closeCatalogModal,
    closeRegistrationModal,
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};