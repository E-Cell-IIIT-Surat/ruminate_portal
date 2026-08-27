export function WorkspaceSkeleton({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="workspace-skeleton" role="status" aria-live="polite" aria-label={label}>
      <span className="workspace-skeleton-eyebrow" />
      <span className="workspace-skeleton-title" />
      <span className="workspace-skeleton-copy" />
      <div className="workspace-skeleton-metrics" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="workspace-skeleton-panels" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}
