/**
 * Proxies OpenCage forward geocoder for autocomplete-style suggestions (API key stays server-side).
 */

const suggestLocations = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ suggestions: [], message: 'Suggestions unavailable' });
  }

  try {
    const params = new URLSearchParams({
      q,
      limit: '8',
      key: apiKey,
      no_annotations: '1',
    });
    const url = `https://api.opencagedata.com/geocode/v1/json?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(200).json({ suggestions: [] });
    }
    const data = await response.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const seen = new Set();
    const suggestions = [];
    for (const r of rawResults) {
      const label = typeof r.formatted === 'string' ? r.formatted.trim() : '';
      if (!label || seen.has(label)) continue;
      seen.add(label);
      suggestions.push({ label });
    }
    return res.status(200).json({ suggestions });
  } catch (err) {
    console.error('Location suggest error:', err.message);
    return res.status(200).json({ suggestions: [] });
  }
};

module.exports = {
  suggestLocations,
};
