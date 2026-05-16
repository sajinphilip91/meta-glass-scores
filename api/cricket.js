export default async function handler(req, res) {
  const key = process.env.CRICKET_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${key}&offset=0`
    );
    const data = await response.json();
    delete data.apikey;
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch cricket data' });
  }
}
