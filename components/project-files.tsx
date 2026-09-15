"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { File, FilePlus2, FolderOpen, Trash2, UploadCloud } from "lucide-react";

type LocalProjectFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function readableType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "";
  return extension ? `${extension} file` : "File";
}

export function ProjectFiles() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<LocalProjectFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const totalSize = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);

  function addFiles(incoming: File[]) {
    if (!incoming.length) {
      setError("No usable files were selected. Choose files from your computer and try again.");
      return;
    }
    const existing = new Set(files.map((file) => file.id));
    const additions: LocalProjectFile[] = [];
    let duplicates = 0;
    for (const file of incoming) {
      const id = `${file.name}:${file.size}:${file.lastModified}`;
      if (existing.has(id)) {
        duplicates += 1;
        continue;
      }
      existing.add(id);
      additions.push({ id, name: file.name, size: file.size, type: readableType(file), lastModified: file.lastModified });
    }
    if (!additions.length) {
      setError("Those files are already listed in this browser session.");
      return;
    }
    setFiles((current) => [...current, ...additions]);
    setError(duplicates ? `${duplicates} duplicate ${duplicates === 1 ? "file was" : "files were"} not added.` : "");
    setStatus(`${additions.length} ${additions.length === 1 ? "file" : "files"} added to this browser session.`);
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function remove(id: string) {
    const removed = files.find((file) => file.id === id);
    setFiles((current) => current.filter((file) => file.id !== id));
    setError("");
    setStatus(removed ? `${removed.name} removed from this browser session.` : "File removed.");
  }

  return (
    <section className="wf-files" aria-labelledby="project-files-title">
      <div className="wf-files-heading">
        <div>
          <span className="wf-kicker">Project Files</span>
          <h1 id="project-files-title">Keep useful project context close to the work.</h1>
          <p>Add local files for this session so the intended file workspace can be evaluated before durable file import and storage are implemented.</p>
        </div>
        <button className="wf-primary-button" type="button" onClick={() => inputRef.current?.click()}><FilePlus2 size={16} aria-hidden="true" /> Add files</button>
      </div>

      <div className="wf-file-summary-layout">
        <div
          className={`wf-dropzone${dragging ? " dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
          onDrop={drop}
        >
          <span className="wf-drop-icon"><UploadCloud size={26} aria-hidden="true" /></span>
          <h2>Drop project files here</h2>
          <p>or choose files from your computer. Files stay in browser memory for this session; Wayfound does not upload or persist them yet.</p>
          <button className="wf-secondary-button" type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={16} aria-hidden="true" /> Choose files</button>
          <input ref={inputRef} className="sr-only" type="file" multiple onChange={choose} aria-label="Choose project files" />
        </div>

        <aside className="wf-files-context" aria-label="Project file summary">
          <span className="wf-kicker">Current session</span>
          <h2>{files.length ? `${files.length} ${files.length === 1 ? "file" : "files"}` : "No files yet"}</h2>
          <dl>
            <div><dt>File count</dt><dd>{files.length}</dd></div>
            <div><dt>Total size</dt><dd>{formatBytes(totalSize)}</dd></div>
            <div><dt>Persistence</dt><dd>Browser session only</dd></div>
          </dl>
          <div className="wf-boundary-note"><strong>Storage boundary</strong><p>This interface does not create cloud storage, database records, evidence, or project artifacts. Durable file import remains a separate architecture and delivery decision.</p></div>
        </aside>
      </div>

      <div className="wf-files-list-heading"><div><span className="wf-kicker">Files</span><h2>Project file list</h2></div><span>{formatBytes(totalSize)}</span></div>
      {error ? <p className="wf-form-error" role="alert">{error}</p> : null}
      <p className="sr-only" aria-live="polite">{status}</p>
      {files.length ? (
        <ul className="wf-file-list">
          {files.map((file) => (
            <li key={file.id}>
              <span className="wf-file-icon"><File size={18} aria-hidden="true" /></span>
              <span className="wf-file-copy"><strong title={file.name}>{file.name}</strong><small>{file.type} · {formatBytes(file.size)}</small></span>
              <button type="button" onClick={() => remove(file.id)} aria-label={`Remove ${file.name}`}><Trash2 size={17} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="wf-file-empty"><File size={24} aria-hidden="true" /><strong>No project files in this session.</strong><p>Add files when they help explain the project. Nothing is uploaded until a durable file-import boundary is explicitly implemented.</p></div>
      )}
    </section>
  );
}
