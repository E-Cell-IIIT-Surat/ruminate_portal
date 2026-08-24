export default function Loading() {
  return (
    <div className="route-state route-state-loading" role="status" aria-live="polite">
      <div className="route-spinner" />
      <p>Loading your workspace…</p>
      <small>Securely preparing the next view.</small>
    </div>
  );
}
