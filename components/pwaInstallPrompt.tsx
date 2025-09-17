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
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-800 dark:bg-black"
    >
      {iosMode ? (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            Add this app to your Home Screen: tap the Share icon, then "Add to Home Screen".
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-sm">Install this app for a better, fullscreen experience.</div>
          <button
            onClick={handleInstall}
            className="rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-white dark:text-black"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}


