"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/landingPage";

export default function Home() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();

  useEffect(() => {
    // Only redirect if user is authenticated and ready
    if (ready && authenticated) {
      router.replace("/stocks");
    }
  }, [router, authenticated, ready]);

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!authenticated) {
    return <LandingPage />;
  }

  // Show loading while redirecting authenticated users
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <div className="text-gray-400">Redirecting to stocks...</div>
      </div>
    </div>
  );
}
