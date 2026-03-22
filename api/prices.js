// api/prices.js — Proxy Yahoo Finance (données ETF réelles)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker, days = 730 } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker requis' });

  const end   = Math.floor(Date.now() / 1000);
  const start = end - parseInt(days) * 86400;
  const url   = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${start}&period2=${end}&interval=1d`;

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    if (!resp.ok) throw new Error(`Yahoo HTTP ${resp.status}`);
    const data  = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('Pas de données');

    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.quote?.[0]?.close || [];

    const prices = timestamps
      .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().split('T')[0], close: closes[i] }))
      .filter(p => p.close !== null && p.close !== undefined);

    res.setHeader('Cache-Control', 's-maxage=3600'); // cache 1h
    return res.status(200).json({ ticker, prices });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
