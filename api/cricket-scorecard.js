export default async function handler(req, res) {
  const key = process.env.CRICKET_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Match ID required' });

  try {
    const r = await fetch(
      `https://api.cricapi.com/v1/match_scorecard?apikey=${key}&id=${id}`
    );
    const data = await r.json();
    delete data.apikey;
    if (data.status === 'failure') {
      return res.status(429).json({ error: data.reason || 'API limit reached' });
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
}
