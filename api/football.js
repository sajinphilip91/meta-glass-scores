export default async function handler(req, res) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    // Free tier covers: WC, PD (La Liga), CL (Champions League), PL (Premier League)
    const liveRes = await fetch(
      'https://api.football-data.org/v4/matches?competitions=WC,PD,CL,PL&status=LIVE',
      { headers: { 'X-Auth-Token': key } }
    );
    const liveData = await liveRes.json();
    const matches = liveData.matches || [];

    let nextMatch = null;

    if (!matches.length) {
      const scheduledRes = await fetch(
        'https://api.football-data.org/v4/matches?competitions=WC,PD,CL,PL&status=SCHEDULED',
        { headers: { 'X-Auth-Token': key } }
      );
      const scheduledData = await scheduledRes.json();
      const scheduled = scheduledData.matches || [];
      if (scheduled.length) {
        scheduled.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        nextMatch = scheduled[0];
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ matches, nextMatch });
  } catch {
    res.status(500).json({ error: 'Failed to fetch football data' });
  }
}
