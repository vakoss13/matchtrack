/**
 * Football Data API Service
 * 
 * To use this service, register for a free API key at https://www.football-data.org/
 * and add it to your .env file as EXPO_PUBLIC_FOOTBALL_API_KEY.
 */

const API_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;

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
 * Fetches upcoming and recent matches.
 * Note: Free tier is limited to certain competitions (PL, CL, etc.).
 */
export const fetchMatches = async (): Promise<Match[]> => {
  console.log('🔍 Checking API Key:', API_KEY ? 'Present (First 5 chars: ' + API_KEY.substring(0, 5) + '...)' : 'MISSING');

  if (!API_KEY) {
    console.warn('⚠️ Missing API Key (EXPO_PUBLIC_FOOTBALL_API_KEY). Returning empty matches.');
    return [];
  }

  try {
    // У API бесплатного тарифа лимит в 10 дней на один запрос.
    // Сделаем два параллельных запроса: один на последние 10 дней, другой на будущие 10 дней.
    const datePastFrom = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const datePastTo = new Date(Date.now()).toISOString().split('T')[0];

    const dateFutureFrom = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Начиная с завтрашнего
    const dateFutureTo = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
        throw new Error(`API Error: ${errorData.message || pastRes.statusText}`);
    }

    if (!futureRes.ok) {
        const errorData = await futureRes.json();
        console.error('❌ API Error Detail (Future):', errorData);
        throw new Error(`API Error: ${errorData.message || futureRes.statusText}`);
    }

    const pastData = await pastRes.json();
    const futureData = await futureRes.json();

    const allMatches = [...(pastData.matches || []), ...(futureData.matches || [])];
    
    // Удалим дубликаты на всякий случай
    const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
    
    console.log('✅ Fetched matches count:', uniqueMatches.length);
    return uniqueMatches;
  } catch (error) {
    console.error('❌ Failed to fetch matches:', error);
    return [];
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
