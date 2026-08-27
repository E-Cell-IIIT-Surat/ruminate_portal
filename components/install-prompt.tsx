"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type InstallState = "waiting" | "native" | "fallback" | "installed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [state, setState] = useState<InstallState>(() => (isStandaloneMode() ? "installed" : "waiting"));
  const [ios] = useState(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
      setState("native");
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setDismissed(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    // Some browsers emit beforeinstallprompt before React mounts, and some
    // browsers never emit it at all. Keep a visible, actionable fallback.
    const timer = window.setTimeout(() => {
      setState((current) => (current === "waiting" ? "fallback" : current));
    }, 1500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || state === "waiting" || state === "installed") return null;

  const canPrompt = Boolean(installEvent);

  async function install() {
    const event = installEvent;
    if (!event) return;
    setInstallEvent(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") setDismissed(true);
      else setState("fallback");
    } catch {
      setState("fallback");
    }
  }

  return (
    <aside className="install-prompt" role="status">
      <span className="install-prompt-icon">
        <Download size={17} />
      </span>
      <div>
        <strong>{canPrompt ? "Keep Ruminate close" : "Install Ruminate"}</strong>
        <p>
          {canPrompt
            ? "Install the portal for one-tap access."
            : ios
              ? "Tap Share, then Add to Home Screen."
              : "Use your browser menu and choose Install app or Add to home screen."}
        </p>
      </div>
      {canPrompt && (
        <button className="button button-primary" type="button" onClick={install}>
          Install
        </button>
      )}
      <button
        className="icon-button"
        type="button"
        aria-label="Dismiss install prompt"
        onClick={() => setDismissed(true)}
      >
        <X size={16} />
      </button>
    </aside>
  );
}
