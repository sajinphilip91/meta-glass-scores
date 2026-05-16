export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Match ID required' });

  try {
    const r = await fetch(
      `https://api.football-data.org/v4/matches/${id}`,
      { headers: { 'X-Auth-Token': key } }
    );
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
}
