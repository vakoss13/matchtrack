import { supabase } from '../supabase';
import { fetchMatches, Match } from './football';

const SYNC_THRESHOLD_MS = 60000; // 1 minute

export const syncLiveMatches = async (force = false) => {
  try {
    // 1. Check if sync is needed (only one client should sync every minute)
    const { data: lastUpdates, error: checkError } = await supabase
      .from('live_matches')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1);

    const now = Date.now();
    const lastUpdate = lastUpdates?.[0]?.last_updated ? new Date(lastUpdates[0].last_updated).getTime() : 0;

    if (!force && (now - lastUpdate < SYNC_THRESHOLD_MS)) {
      console.log('⚽ MatchSync: Recently updated, skipping sync.');
      return;
    }

    console.log('⚽ MatchSync: Starting sync with Football API...');

    // 2. Fetch matches from Football API
    const matches = await fetchMatches();
    const liveMatches = matches.filter(m => 
      ['LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED'].includes(m.status)
    );

    if (liveMatches.length === 0) {
      console.log('⚽ MatchSync: No live or recent matches to sync.');
      return;
    }

    // 3. Prepare data for Supabase
    const syncData = liveMatches.map(m => ({
      id: m.id,
      home_score: m.score?.fullTime?.home ?? 0,
      away_score: m.score?.fullTime?.away ?? 0,
      status: m.status,
      last_updated: new Date().toISOString()
    }));

    // 4. Upsert to Supabase
    const { error: upsertError } = await supabase
      .from('live_matches')
      .upsert(syncData, { onConflict: 'id' });

    if (upsertError) {
      console.error('⚽ MatchSync: Upsert error:', upsertError);
    } else {
      console.log(`⚽ MatchSync: Successfully synced ${syncData.length} matches.`);
    }
  } catch (err) {
    console.error('⚽ MatchSync: Error:', err);
  }
};
