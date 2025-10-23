import React from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const DeliveryMinimal = () => {
  return (
    <div className="min-h-screen bg-gradient-construction">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Delivery Management</h1>
          <p className="text-lg text-muted-foreground">
            This is a minimal delivery page for testing.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DeliveryMinimal;
















