export default async function handler(req, res) {
  const key = process.env.CRICKET_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${key}&offset=0`
    );
    const data = await response.json();
    delete data.apikey;
    if (data.status === 'failure') {
      return res.status(429).json({ error: data.reason || 'API limit reached' });
    }
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch cricket data' });
  }
}
