"use client";

import { AlertTriangle, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

type NetworkState = "online" | "offline" | "slow" | null;

export function NetworkStatus() {
  const [state, setState] = useState<NetworkState>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: {
          effectiveType?: string;
          addEventListener?: typeof window.addEventListener;
          removeEventListener?: typeof window.removeEventListener;
        };
      }
    ).connection;
    const update = () => {
      if (!navigator.onLine) setState("offline");
      else if (["slow-2g", "2g"].includes(connection?.effectiveType ?? "")) setState("slow");
      else setState(null);
      setDismissed(false);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  if (!state || dismissed) return null;
  const offline = state === "offline";
  return (
    <div className={`network-toast network-toast-${state}`} role="status" aria-live="polite">
      {offline ? <WifiOff size={17} /> : <AlertTriangle size={17} />}
      <span>
        <strong>{offline ? "You are offline" : "Slow connection detected"}</strong>
        <small>
          {offline
            ? "Changes will resume when your connection returns."
            : "Your changes are safe — please give the page a moment."}
        </small>
      </span>
      <button type="button" aria-label="Dismiss network message" onClick={() => setDismissed(true)}>
        <X size={15} />
      </button>
      {!offline && <Wifi className="network-toast-signal" size={14} />}
    </div>
  );
}
