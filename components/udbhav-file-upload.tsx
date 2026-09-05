"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";

export function UdbhavFileUpload({ submissionId, hasFile }: { submissionId: string; hasFile: boolean }) {
  const [state, setState] = useState(hasFile ? "A supporting document is attached." : "");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setState("Uploading…");
    try {
      const response = await fetch(`/api/udbhav/submissions/${submissionId}/file`, {
        method: "POST",
        body: new FormData(form),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      setState(response.ok ? "Document uploaded securely." : (result.error ?? "Upload failed"));
      if (response.ok) {
        form.reset();
        setFileName("");
      }
    } catch (error) {
      setState(error instanceof Error ? error.message : "Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    const response = await fetch(`/api/udbhav/submissions/${submissionId}/file`);
    const result = (await response.json().catch(() => ({}))) as { file?: { url?: string }; error?: string };
    if (result.file?.url) window.open(result.file.url, "_blank", "noopener,noreferrer");
    else setState(result.error ?? "Document is unavailable");
  }
  return (
    <form className="panel form-panel" onSubmit={upload}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Supporting document</span>
          <h2>Attach proposal material</h2>
        </div>
        <span className="config-state" role="status">
          {state}
        </span>
      </div>
      <div className="custom-file-dropzone" style={{ marginBottom: "16px" }}>
        <span className="custom-file-icon">
          <FileUp size={22} />
        </span>
        <div className="custom-file-info">
          <strong>{fileName || "Choose file to upload"}</strong>
          <small>PDF or DOCX · Maximum 5 MB · Private R2 Storage</small>
        </div>
        <span className="custom-file-browse-btn">Browse</span>
        <input
          name="file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
      </div>
      <button className="button button-secondary" disabled={busy}>
        {busy ? "Uploading…" : "Upload document"}
      </button>
      {hasFile && (
        <button className="button button-ghost" type="button" onClick={download}>
          Download current document
        </button>
      )}
    </form>
  );
}
