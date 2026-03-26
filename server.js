const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Serve nifti-reader.js — tries multiple paths for Railway compatibility
app.get('/nifti-reader.js', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, 'node_modules', 'nifti-reader-js', 'dist', 'nifti-reader.js'),
    path.join(__dirname, 'node_modules', 'nifti-reader-js', 'src', 'nifti-reader.js'),
    path.join(process.cwd(), 'node_modules', 'nifti-reader-js', 'dist', 'nifti-reader.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log('Serving nifti-reader.js from:', p);
      res.setHeader('Content-Type', 'application/javascript');
      return res.sendFile(p);
    }
  }
  // Last resort: serve a CDN redirect
  console.error('nifti-reader.js not found in node_modules, falling back to CDN');
  res.redirect('https://unpkg.com/nifti-reader-js@1.0.1/dist/nifti-reader.js');
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Heatmap analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { grid, fileType, windowCenter, windowWidth, pixelMin, pixelMax, width, height } = req.body;
    if (!grid || !Array.isArray(grid)) return res.status(400).json({ error: 'Invalid grid data' });
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

    const prompt = `You are analyzing a medical image (${fileType?.toUpperCase()}, ${width}x${height} pixels).

Here is a 16x16 grid of normalized intensity values (0=dark, 100=bright):

${grid.map(row => row.join(' ')).join('\n')}

Window Centre: ${Math.round(windowCenter)}, Window Width: ${Math.round(windowWidth)}
Min pixel: ${Math.round(pixelMin)}, Max pixel: ${Math.round(pixelMax)}

Return ONLY valid JSON with this structure:
{
  "heatmap": [[...16 rows of 16 values, each 0.0-1.0...]],
  "regions": [{"label": "region", "gx": 0-15, "gy": 0-15, "intensity": "low|medium|high"}],
  "summary": "one sentence description"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const result = await response.json();
    if (result.error) return res.status(500).json({ error: result.error.message });

    const text = result.content[0].text.trim();
    const analysis = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`dcm2img running on port ${PORT}`);
  console.log(`API key: ${ANTHROPIC_API_KEY ? 'SET' : 'NOT SET'}`);
});
