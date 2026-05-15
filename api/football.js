export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch(
      'https://api.football-data.org/v4/matches?competitions=WC,PD&status=LIVE',
      { headers: { 'X-Auth-Token': key } }
    );
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch football data' });
  }
}
