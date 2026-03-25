const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Serve static files (the frontend HTML)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

// Multer: store uploads in memory, max 100MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0' });
});

// Heatmap analysis endpoint
// Receives a downsampled intensity grid from the frontend
// Calls Claude API, returns analysis JSON
// No file is stored on disk
app.post('/api/analyze', async (req, res) => {
  try {
    const { grid, fileType, windowCenter, windowWidth, pixelMin, pixelMax, width, height } = req.body;

    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ error: 'Invalid grid data' });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server not configured with API key' });
    }

    const prompt = `You are analyzing a medical image (${fileType?.toUpperCase()}, ${width}x${height} pixels).

Here is a 16x16 grid of normalized intensity values (0=dark/low signal, 100=bright/high signal) sampled across the image:

${grid.map(row => row.join(' ')).join('\n')}

Window Centre: ${Math.round(windowCenter)}, Window Width: ${Math.round(windowWidth)}
Min pixel: ${Math.round(pixelMin)}, Max pixel: ${Math.round(pixelMax)}

Analyze this intensity grid and return a JSON object with this exact structure:
{
  "heatmap": [[...16 rows of 16 values, each 0.0 to 1.0...]],
  "regions": [
    {"label": "region name", "gx": 0-15, "gy": 0-15, "intensity": "low|medium|high"}
  ],
  "summary": "one sentence description of the intensity pattern"
}

The heatmap values should highlight areas of significant intensity. Return ONLY valid JSON, no other text.`;

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

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    const text = result.content[0].text.trim();
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    res.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`dcm2img server running on port ${PORT}`);
});
