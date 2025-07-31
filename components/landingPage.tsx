"use client";

import { ArrowRight, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogin } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

export function LandingPage() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: (user) => {
      if (user.user) {
        router.replace("/stocks");
      }
    },
  });

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Abstract diagonal lines pattern */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 transform rotate-45">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-16 bg-gradient-to-r from-blue-400/30 to-purple-400/30"
                style={{
                  left: `${i * 8}px`,
                  top: `${i * 8}px`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with Logo */}
        <div className="flex items-center p-6">
          <div className="flex items-center gap-2">
            <Infinity className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 -mt-16">
          {/* Abstract Graphic */}
          <div className="mb-1 relative">
            <div className="w-64 h-64 relative">
              <img
                src="/abstract-graphic.png"
                alt="Abstract diagonal lines graphic"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Text Content */}
          <div className="text-left mb-6 w-full max-w-md">
            <div className="text-4xl md:text-5xl font-bold mb-2">
              Own
            </div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              a piece of a
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <ArrowRight className="h-3 w-3 text-black" />
              </div>
              <div className="text-4xl md:text-5xl font-bold">
                company
              </div>
            </div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              you use
            </div>
            <div className="text-4xl md:text-5xl font-bold">
              everyday
            </div>
          </div>

          {/* Call to Action */}
          <div className="flex items-center justify-between w-full max-w-sm">
            <span className="text-lg font-medium">Start Investing</span>
            <Button
              onClick={login}
              className="w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 p-0 flex items-center justify-center"
            >
              <ArrowRight className="h-5 w-5 text-black" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 