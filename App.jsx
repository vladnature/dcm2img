import React, { useState, useRef, useCallback } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #080c10;
    --surface:   #0d1117;
    --panel:     #111820;
    --border:    #1e2d3d;
    --accent:    #00d4ff;
    --accent2:   #00ff9d;
    --warn:      #ff6b35;
    --text:      #c9d8e8;
    --muted:     #4a6278;
    --font-ui:   'Syne', sans-serif;
    --font-mono: 'Space Mono', monospace;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    min-height: 100vh;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px);
    pointer-events: none;
    z-index: 9999;
  }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2rem; height: 56px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky; top: 0; z-index: 100;
  }
  .logo {
    font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700;
    color: var(--accent); letter-spacing: 0.08em;
    display: flex; align-items: center; gap: 10px;
  }
  .logo-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent2); animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
  .badge {
    font-family: var(--font-mono); font-size: 0.65rem;
    padding: 2px 8px; border: 1px solid var(--border);
    border-radius: 2px; color: var(--muted); letter-spacing: 0.1em;
  }

  .workspace { display: grid; grid-template-columns: 320px 1fr; flex: 1; min-height: 0; }

  .sidebar {
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow-y: auto;
  }
  .sidebar-section { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
  .sidebar-label {
    font-family: var(--font-mono); font-size: 0.6rem;
    letter-spacing: 0.18em; color: var(--muted);
    text-transform: uppercase; margin-bottom: 1rem;
  }

  .dropzone {
    border: 1.5px dashed var(--border); border-radius: 6px;
    padding: 2rem 1.5rem; text-align: center; cursor: pointer;
    transition: all 0.2s; background: var(--panel);
  }
  .dropzone:hover, .dropzone.drag-over {
    border-color: var(--accent); background: rgba(0,212,255,0.04);
  }
  .dropzone-icon { font-size: 2rem; margin-bottom: .75rem; display: block; }
  .dropzone-title { font-size: .85rem; font-weight: 600; color: var(--text); margin-bottom: .3rem; }
  .dropzone-sub { font-family: var(--font-mono); font-size: .65rem; color: var(--muted); }
  .file-input { display: none; }

  .meta-table { width: 100%; border-collapse: collapse; }
  .meta-table tr { border-bottom: 1px solid rgba(30,45,61,.5); }
  .meta-table tr:last-child { border-bottom: none; }
  .meta-table td { padding: .4rem 0; font-size: .75rem; vertical-align: top; }
  .meta-key { color: var(--muted); font-family: var(--font-mono); font-size: .65rem; width: 45%; padding-right: .5rem; }
  .meta-val { color: var(--text); word-break: break-all; }

  .control-row { display: flex; flex-direction: column; gap: .75rem; }
  .control-group { display: flex; flex-direction: column; gap: .3rem; }
  .control-label { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: .65rem; color: var(--muted); }
  .control-value { color: var(--accent); }

  .slider {
    -webkit-appearance: none; width: 100%; height: 3px;
    background: var(--border); border-radius: 2px; outline: none; cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px;
    border-radius: 50%; background: var(--accent);
    cursor: pointer; box-shadow: 0 0 8px rgba(0,212,255,.5);
  }
  .slider.slice-slider::-webkit-slider-thumb { background: var(--accent2); box-shadow: 0 0 8px rgba(0,255,157,.5); }

  .apply-btn {
    margin-top: .5rem; width: 100%; padding: .5rem;
    background: transparent; border: 1px solid var(--accent);
    color: var(--accent); font-family: var(--font-mono);
    font-size: .7rem; letter-spacing: .1em; cursor: pointer;
    border-radius: 3px; transition: all .2s;
  }
  .apply-btn:hover { background: rgba(0,212,255,.1); }
  .apply-btn:disabled { opacity: .3; cursor: not-allowed; }

  .viewer {
    background: #020408; display: flex;
    align-items: center; justify-content: center;
    position: relative; overflow: hidden; min-height: 600px;
  }
  .viewer-empty { text-align: center; color: var(--muted); }
  .viewer-empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: .3; display: block; }
  .viewer-empty-text { font-family: var(--font-mono); font-size: .75rem; letter-spacing: .1em; }

  .dicom-image {
    max-width: 100%; max-height: 100%;
    object-fit: contain; image-rendering: pixelated;
    animation: fadeIn .4s ease;
  }
  @keyframes fadeIn { from{opacity:0;transform:scale(.98)} to{opacity:1;transform:scale(1)} }

  .hud {
    position: absolute; font-family: var(--font-mono);
    font-size: .6rem; color: rgba(0,212,255,.6);
    letter-spacing: .05em; pointer-events: none;
  }
  .hud-tl { top: 1rem; left: 1rem; }
  .hud-tr { top: 1rem; right: 1rem; text-align: right; }
  .hud-bl { bottom: 1rem; left: 1rem; }
  .hud-br { bottom: 1rem; right: 1rem; text-align: right; }
  .hud p  { margin-bottom: 2px; }

  .loading-overlay {
    position: absolute; inset: 0; background: rgba(8,12,16,.85);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1rem; z-index: 10;
  }
  .spinner {
    width: 36px; height: 36px;
    border: 2px solid var(--border); border-top-color: var(--accent);
    border-radius: 50%; animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { font-family: var(--font-mono); font-size: .7rem; color: var(--accent); letter-spacing: .1em; }

  .error-banner {
    background: rgba(255,107,53,.1); border: 1px solid var(--warn);
    border-radius: 4px; padding: .75rem 1rem;
    font-family: var(--font-mono); font-size: .7rem;
    color: var(--warn); margin-bottom: 1rem;
  }

  .footer {
    border-top: 1px solid var(--border); padding: .6rem 2rem;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--surface);
  }
  .footer-text { font-family: var(--font-mono); font-size: .6rem; color: var(--muted); letter-spacing: .08em; }
  .footer-link { color: var(--accent); text-decoration: none; }
  .footer-link:hover { text-decoration: underline; }

  .format-tag {
    display: inline-block; font-family: var(--font-mono); font-size: .6rem;
    padding: 2px 6px; border-radius: 2px; margin-left: 8px;
    background: rgba(0,255,157,.1); border: 1px solid var(--accent2);
    color: var(--accent2); letter-spacing: .1em;
  }
`;

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function MetadataTable({ metadata }) {
  if (!metadata || !Object.keys(metadata).length)
    return <p style={{fontFamily:"var(--font-mono)",fontSize:".7rem",color:"var(--muted)"}}>No metadata</p>;
  return (
    <table className="meta-table"><tbody>
      {Object.entries(metadata).map(([k,v]) => (
        <tr key={k}>
          <td className="meta-key">{k}</td>
          <td className="meta-val">{String(v)}</td>
        </tr>
      ))}
    </tbody></table>
  );
}

function WindowingControls({ window: win, onApply, disabled }) {
  const [wc, setWc] = useState(win?.window_center ?? 128);
  const [ww, setWw] = useState(win?.window_width  ?? 256);
  return (
    <div className="control-row">
      <div className="control-group">
        <div className="control-label"><span>Window Center</span><span className="control-value">{Math.round(wc)}</span></div>
        <input type="range" className="slider" min={-1000} max={5000} value={wc} onChange={e=>setWc(+e.target.value)}/>
      </div>
      <div className="control-group">
        <div className="control-label"><span>Window Width</span><span className="control-value">{Math.round(ww)}</span></div>
        <input type="range" className="slider" min={1} max={8000} value={ww} onChange={e=>setWw(+e.target.value)}/>
      </div>
      <button className="apply-btn" disabled={disabled} onClick={()=>onApply(wc,ww)}>▶ APPLY WINDOW</button>
    </div>
  );
}

function SliceControls({ slices, onSliceChange, disabled }) {
  const [idx, setIdx] = useState(slices?.slice_idx ?? 0);
  if (!slices || slices.n_slices <= 1) return null;
  return (
    <div className="control-row">
      <div className="control-group">
        <div className="control-label">
          <span>Slice</span>
          <span className="control-value">{idx + 1} / {slices.n_slices}</span>
        </div>
        <input
          type="range" className="slider slice-slider"
          min={0} max={slices.n_slices - 1} value={idx}
          onChange={e => { setIdx(+e.target.value); onSliceChange(+e.target.value); }}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [image,    setImage]    = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [window,   setWindow]   = useState(null);
  const [slices,   setSlices]   = useState(null);
  const [format,   setFormat]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [filename, setFilename] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [curWC,    setCurWC]    = useState(null);
  const [curWW,    setCurWW]    = useState(null);
  const [curSlice, setCurSlice] = useState(0);
  const fileRef = useRef(null);
  const currentFile = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    currentFile.current = file;
    setFilename(file.name);
    setLoading(true); setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Upload failed"); }
      const data = await res.json();
      setImage(data.image);
      setMetadata(data.metadata);
      setWindow(data.window);
      setSlices(data.slices);
      setFormat(data.format);
      setCurWC(data.window?.window_center ?? null);
      setCurWW(data.window?.window_width  ?? null);
      setCurSlice(data.slices?.slice_idx  ?? 0);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const applyWindow = useCallback(async (wc, ww) => {
    if (!currentFile.current) return;
    setLoading(true);
    setCurWC(wc); setCurWW(ww);
    const form = new FormData();
    form.append("file", currentFile.current);
    try {
      const res = await fetch(`${API}/window?window_center=${wc}&window_width=${ww}&slice_idx=${curSlice}`,
        { method: "POST", body: form });
      const data = await res.json();
      setImage(data.image);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }, [curSlice]);

  const applySlice = useCallback(async (idx) => {
    if (!currentFile.current) return;
    setCurSlice(idx);
    setLoading(true);
    const form = new FormData();
    form.append("file", currentFile.current);
    const wc = curWC != null ? `&window_center=${curWC}` : "";
    const ww = curWW != null ? `&window_width=${curWW}` : "";
    try {
      const res = await fetch(`${API}/slice?slice_idx=${idx}${wc}${ww}`,
        { method: "POST", body: form });
      const data = await res.json();
      setImage(data.image);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }, [curWC, curWW]);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="logo">
            <span className="logo-dot"/>
            MEDICAL·VIEWER
            {format && <span className="format-tag">{format.toUpperCase()}</span>}
          </div>
          <span className="badge">MIT LICENSE · OPEN SOURCE</span>
        </header>

        <div className="workspace">
          <aside className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label">Load File</div>
              {error && <div className="error-banner">⚠ {error}</div>}
              <div
                className={`dropzone ${dragOver ? "drag-over" : ""}`}
                onClick={() => fileRef.current.click()}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={handleDrop}
              >
                <span className="dropzone-icon">🩻</span>
                <div className="dropzone-title">{filename || "Drop medical image here"}</div>
                <div className="dropzone-sub">{filename ? "click to replace" : ".dcm · .nii · .nii.gz"}</div>
              </div>
              <input ref={fileRef} className="file-input" type="file"
                accept=".dcm,.nii,.nii.gz"
                onChange={e=>processFile(e.target.files[0])}/>
            </div>

            {slices && slices.n_slices > 1 && (
              <div className="sidebar-section">
                <div className="sidebar-label">Slice Navigation</div>
                <SliceControls slices={slices} onSliceChange={applySlice} disabled={!image||loading}/>
              </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-label">Windowing (W/L)</div>
              <WindowingControls window={window} onApply={applyWindow} disabled={!image||loading}/>
            </div>

            <div className="sidebar-section" style={{flex:1}}>
              <div className="sidebar-label">Metadata</div>
              <MetadataTable metadata={metadata}/>
            </div>
          </aside>

          <main className="viewer">
            {loading && (
              <div className="loading-overlay">
                <div className="spinner"/>
                <span className="loading-text">PROCESSING...</span>
              </div>
            )}
            {image ? (
              <>
                <img className="dicom-image" src={`data:image/png;base64,${image}`} alt="Medical scan"/>
                <div className="hud hud-tl">
                  <p>{metadata?.Modality || metadata?.Format || "—"}</p>
                  <p>{metadata?.["Study Date"] || metadata?.["Voxel Size"] || "—"}</p>
                </div>
                <div className="hud hud-tr">
                  <p>{metadata?.["Patient Name"] || "ANONYMOUS"}</p>
                  <p>{metadata?.["Patient ID"] || "—"}</p>
                </div>
                <div className="hud hud-bl">
                  <p>{metadata?.Rows && metadata?.Columns
                    ? `${metadata.Columns} × ${metadata.Rows} px`
                    : metadata?.Dimensions || "—"}</p>
                </div>
                <div className="hud hud-br">
                  <p>{slices && slices.n_slices > 1 ? `SLICE ${curSlice+1}/${slices.n_slices}` : filename}</p>
                </div>
              </>
            ) : !loading && (
              <div className="viewer-empty">
                <span className="viewer-empty-icon">📡</span>
                <div className="viewer-empty-text">AWAITING INPUT · DCM / NII</div>
              </div>
            )}
          </main>
        </div>

        <footer className="footer">
          <span className="footer-text">MEDICAL IMAGE VIEWER · OPEN SOURCE · <a className="footer-link" href="https://github.com" target="_blank" rel="noreferrer">GITHUB</a></span>
          <span className="footer-text">pydicom · nibabel · FastAPI · React · MIT LICENSE</span>
        </footer>
      </div>
    </>
  );
}
