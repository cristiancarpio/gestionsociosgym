// api/proxy.js — Vercel serverless function
// Proxea requests al Google Apps Script evitando CORS
export default async function handler(req, res) {
  // Allow from your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const scriptUrl = req.query.url;
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) {
    return res.status(400).json({ ok: false, error: 'URL inválida' });
  }

  try {
    if (req.method === 'GET') {
      // Forward all query params except 'url'
      const params = new URLSearchParams();
      Object.entries(req.query).forEach(([k, v]) => {
        if (k !== 'url') params.append(k, v);
      });
      const fullUrl = scriptUrl + '?' + params.toString();
      const r = await fetch(fullUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'GymAdmin-Proxy/1.0' }
      });
      const text = await r.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(text);

    } else if (req.method === 'POST') {
      const r = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(req.body),
        redirect: 'follow'
      });
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
