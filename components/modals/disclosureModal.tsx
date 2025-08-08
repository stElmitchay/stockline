"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DisclosureModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function DisclosureModal({ isOpen, onAccept }: DisclosureModalProps) {
  const [hasScrolled, setHasScrolled] = useState(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isScrolledToBottom) {
      setHasScrolled(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden"
           style={{
             background: 'rgba(46, 71, 68, 0.95)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
             boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
           }}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Disclaimer</h2>
              <p className="text-gray-400 text-sm">Please read and acknowledge before continuing</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto" onScroll={handleScroll}>
          <div className="text-white text-sm leading-relaxed space-y-4">
            <p>
              Stockline provides a platform to access tokenized U.S. equities. We are not a registered investment advisor or broker-dealer. All investment decisions are made at your own risk. Investing in securities involves risks, including the possible loss of the principal amount invested. The value of stocks can fluctuate, and past performance does not guarantee future returns. Stockline does not provide investment, tax, or legal advice.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onAccept}
              disabled={!hasScrolled}
              className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 ${
                hasScrolled 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {hasScrolled ? 'I Understand and Agree' : 'Acknowledge'}
            </Button>
          </div>
          
          {!hasScrolled && (
            <p className="text-gray-400 text-xs text-center mt-2">
              Scroll through the full disclosure to enable the continue button
            </p>
          )}
        </div>
      </div>
    </div>
  );
}