"use client";

import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface SuccessImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuccessImageModal({ isOpen, onClose }: SuccessImageModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      
      // Add event listener to close modal when clicking outside
      const handleOutsideClick = () => {
        onClose();
      };
      
      document.addEventListener("mousedown", handleOutsideClick);
      
      return () => {
        document.removeEventListener("mousedown", handleOutsideClick);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0" 
        style={{
          background: 'rgba(46, 71, 68, 0.8)',
          backdropFilter: 'blur(8px)'
        }}
      />
      <div 
        className="relative rounded-2xl shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300"
        style={{
          background: 'rgba(46, 71, 68, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-green-500/20 border border-green-500/30">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-green-400 mb-4">Thank You! Your Order is in the Queue.</h2>
          <p className="text-gray-300 text-lg mb-4">We have successfully received your request.</p>
          
          <p className="text-gray-300 text-sm mb-4">
            Our team will process your order, and you will receive a final confirmation call or WhatsApp notification before order is completed.
          </p>
          
          <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/10 mb-6">
            <p className="text-sm text-orange-300 font-medium">
              All orders are processed during our business hours (Mon-Fri, 9am-5pm).
            </p>
          </div>
          
          <div className="text-sm text-gray-400 mt-4">
            Click anywhere to continue
          </div>
        </div>
      </div>
    </div>
  );
}