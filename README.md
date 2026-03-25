# dcm2img

A lightweight, open-source medical image viewer for DICOM and NIfTI files. No heavy dependencies, no SIVIC, no compiling C++ — just Node.js and a browser.

**Live demo:** [dcm2img-production.up.railway.app](https://dcm2img-production.up.railway.app)

## Features

- **DICOM (.dcm)** — single frame, with rescale slope/intercept for CT
- **NIfTI (.nii / .nii.gz)** — multi-slice MRI volumes
- **Window Centre / Width** controls with presets (Soft, Bone, Lung, Brain, Liver)
- **Slice navigation** slider
- **MPR views** — Axial, Coronal, Sagittal (NIfTI)
- **Measurement tools** — Ruler, Angle, ROI ellipse
- **AI Heatmap** — intensity analysis via Claude API (server-side, key never exposed)
- **Export** — PNG with or without heatmap overlay
- **Invert** image
- **Hounsfield Unit** display on hover
- MIT License — no restrictions

## Architecture

```
Browser (HTML/JS/cornerstoneJS)
    ↓ POST /api/analyze (pixel grid)
Node.js server (Express)
    ↓ Claude API (analysis)
    ↑ Heatmap JSON
Browser renders overlay
```

No Python. No Docker Compose. No PACS. One Node.js server, one HTML file.

## Run locally

```bash
git clone https://github.com/vladnature/dcm2img.git
cd dcm2img
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
# Open http://localhost:3000
```

## Deploy to Railway

1. Fork this repo
2. Create a new Railway project from GitHub
3. Add environment variable: `ANTHROPIC_API_KEY=your_key_here`
4. Deploy — Railway auto-detects Node.js

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Server port (default: 3000) |

## License

MIT — © vladnature. No restrictions. Use freely.

Built as a simpler alternative to legacy tools like SIVIC (8 C++ dependencies, CentOS lock-in, deprecated KWWidgets GUI).
