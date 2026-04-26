const API_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;

const CACHE_TTL = 5 * 60 * 1000;
let cachedMatches: Match[] | null = null;
let lastFetchTime = 0;

export interface MatchTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED' | 'AWARDED';
  matchday: number;
  stage: string;
  group: string;
  lastUpdated: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
}

/**
 * Fetches upcoming and recent matches with caching.
 */
export const fetchMatches = async (force = false): Promise<Match[]> => {
  const now = Date.now();
  
  // Если есть свежий кеш, возвращаем его
  if (!force && cachedMatches && (now - lastFetchTime < CACHE_TTL)) {
    console.log('📦 Returning cached matches (Age: ' + Math.round((now - lastFetchTime) / 1000) + 's)');
    return cachedMatches;
  }

  console.log('🔍 Checking API Key:', API_KEY ? 'Present (First 5 chars: ' + API_KEY.substring(0, 5) + '...)' : 'MISSING');

  if (!API_KEY) {
    console.warn('⚠️ Missing API Key (EXPO_PUBLIC_FOOTBALL_API_KEY). Returning empty matches.');
    return [];
  }

  try {
    const datePastFrom = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const datePastTo = new Date(Date.now()).toISOString().split('T')[0];

    const dateFutureFrom = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateFutureTo = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('🌐 Fetching fresh matches from API...');
    
    const [pastRes, futureRes] = await Promise.all([
      fetch(`${API_URL}/matches?dateFrom=${datePastFrom}&dateTo=${datePastTo}`, {
        method: 'GET',
        headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
      }),
      fetch(`${API_URL}/matches?dateFrom=${dateFutureFrom}&dateTo=${dateFutureTo}`, {
        method: 'GET',
        headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
      })
    ]);

    if (!pastRes.ok) {
        const errorData = await pastRes.json();
        console.error('❌ API Error Detail (Past):', errorData);
        if (pastRes.status === 429 && cachedMatches) return cachedMatches; // Фоллбек на кеш при ошибке лимита
        throw new Error(`API Error: ${errorData.message || pastRes.statusText}`);
    }

    if (!futureRes.ok) {
        const errorData = await futureRes.json();
        console.error('❌ API Error Detail (Future):', errorData);
        if (futureRes.status === 429 && cachedMatches) return cachedMatches;
        throw new Error(`API Error: ${errorData.message || futureRes.statusText}`);
    }

    const pastData = await pastRes.json();
    const futureData = await futureRes.json();

    const allMatches = [...(pastData.matches || []), ...(futureData.matches || [])];
    const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
    
    // Обновляем кеш
    cachedMatches = uniqueMatches;
    lastFetchTime = now;

    console.log('✅ Fetched matches count:', uniqueMatches.length);
    return uniqueMatches;
  } catch (error) {
    console.error('❌ Failed to fetch matches:', error);
    return cachedMatches || []; // Возвращаем кеш, если запрос провалился
  }
};

/**
 * Fetches a single match by its ID. Useful for old matches outside the 10-day window.
 */
export const fetchMatchById = async (id: string | number): Promise<Match | null> => {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${API_URL}/matches/${id}`, {
      method: 'GET',
      headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
};
