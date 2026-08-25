// "use client";

// import { useEffect, useRef, useState } from "react";
// import { usePathname, useSearchParams } from "next/navigation";

// function isInternalNavigation(anchor: HTMLAnchorElement) {
//   if (!anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
//   if (anchor.origin !== window.location.origin) return false;
//   if (anchor.protocol !== window.location.protocol) return false;
//   if (anchor.pathname === window.location.pathname && anchor.search === window.location.search) return false;
//   return !anchor.hash || anchor.pathname !== window.location.pathname || anchor.search !== window.location.search;
// }

// export function RuminateLoader({ label = "Loading Ruminate", overlay = false }: { label?: string; overlay?: boolean }) {
//   return (
//     <div className={overlay ? "ruminate-loader-overlay" : "ruminate-loader-page"} role="status" aria-live="polite">
//       <div className="ruminate-loader-card">
//         <div className="ruminate-loader-mark" aria-hidden="true">
//           <span>R</span>
//           <i />
//           <i />
//         </div>
//         <p className="ruminate-loader-title">{label}</p>
//         <small>Getting everything ready…</small>
//         <div className="ruminate-loader-track" aria-hidden="true">
//           <span />
//         </div>
//       </div>
//     </div>
//   );
// }

// /** Shows immediate feedback for Next.js client-side route transitions. */
// export function NavigationLoader() {
//   const pathname = usePathname();
//   const searchParams = useSearchParams();
//   return <NavigationLoaderState key={`${pathname}?${searchParams.toString()}`} />;
// }

// function NavigationLoaderState() {
//   const [loading, setLoading] = useState(false);
//   const timeoutRef = useRef<number | null>(null);

//   useEffect(() => {
//     const start = () => {
//       setLoading(true);
//       if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
//       // Never leave the overlay blocking the page forever if a navigation
//       // fails before the framework can render its error boundary.
//       timeoutRef.current = window.setTimeout(() => setLoading(false), 20_000);
//     };
//     const handleClick = (event: MouseEvent) => {
//       if (
//         event.defaultPrevented ||
//         event.button !== 0 ||
//         event.metaKey ||
//         event.ctrlKey ||
//         event.shiftKey ||
//         event.altKey
//       )
//         return;
//       const target = event.target instanceof Element ? event.target.closest("a") : null;
//       if (target instanceof HTMLAnchorElement && isInternalNavigation(target)) start();
//     };
//     const handlePopState = () => start();
//     document.addEventListener("click", handleClick, true);
//     window.addEventListener("popstate", handlePopState);
//     return () => {
//       document.removeEventListener("click", handleClick, true);
//       window.removeEventListener("popstate", handlePopState);
//       if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
//     };
//   }, []);

//   return loading ? <RuminateLoader label="Opening your workspace" overlay /> : null;
// }




"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (!anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  if (anchor.origin !== window.location.origin) return false;
  if (anchor.protocol !== window.location.protocol) return false;
  if (anchor.pathname === window.location.pathname && anchor.search === window.location.search) return false;
  return !anchor.hash || anchor.pathname !== window.location.pathname || anchor.search !== window.location.search;
}

export function RuminateLoader({ label = "Loading Ruminate", overlay = false }: { label?: string; overlay?: boolean }) {
  return (
    <div className={overlay ? "ruminate-loader-overlay" : "ruminate-loader-page"} role="status" aria-live="polite">
      <div className="ruminate-loader-card">
        <div className="ruminate-loader-orbit" aria-hidden="true">
          <span className="ruminate-loader-ring" />
          <span className="ruminate-loader-mark">R</span>
        </div>
        <p className="ruminate-loader-eyebrow">Ruminate</p>
        <p className="ruminate-loader-title">{label}</p>
      </div>
    </div>
  );
}

/** Shows immediate feedback for Next.js client-side route transitions. */
export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <NavigationLoaderState key={`${pathname}?${searchParams.toString()}`} />;
}

function NavigationLoaderState() {
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const start = () => {
      setLoading(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      // Never leave the overlay blocking the page forever if a navigation
      // fails before the framework can render its error boundary.
      timeoutRef.current = window.setTimeout(() => setLoading(false), 20_000);
    };
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (target instanceof HTMLAnchorElement && isInternalNavigation(target)) start();
    };
    const handlePopState = () => start();
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return loading ? <RuminateLoader label="Opening your workspace" overlay /> : null;
}