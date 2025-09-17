"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "pwaInstallDismissed";

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return true;
  const isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari
  const isIOSStandalone = (navigator as any).standalone === true;
  return Boolean(isStandalone || isIOSStandalone);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === "true";
    if (dismissed || isStandaloneDisplayMode()) return;

    const ios = isIOS();
    setIosMode(ios);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // On iOS there is no event; show the hint banner
    if (ios) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, "true");
      } else {
        // keep it hidden after user dismisses once
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, "true");
      }
      setDeferredPrompt(null);
    } catch {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),16px)]"
    >
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-gray-800 dark:bg-black/80">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192x192.png" alt="App icon" className="h-8 w-8 rounded-lg" />
          <div className="flex-1">
            {iosMode ? (
              <>
                <p className="text-base font-medium">Install Stockline app</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Tap the Share icon, then <span className="font-medium">Add to Home Screen</span>.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-medium">Install Stockline</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Get a faster, fullscreen experience with offline support.
                </p>
              </>
            )}
            <div className="mt-3 flex gap-2">
              {iosMode ? (
                <button
                  onClick={handleDismiss}
                  className="h-11 flex-1 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium"
                >
                  Got it
                </button>
              ) : (
                <>
                  <button
                    onClick={handleInstall}
                    className="h-11 flex-1 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="h-11 flex-1 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
                  >
                    Not now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


