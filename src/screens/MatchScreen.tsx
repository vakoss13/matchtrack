import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Modal, ScrollView, TextInput, Animated } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { FlashList as BaseFlashList } from '@shopify/flash-list';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { fetchMatches, Match } from '../services/api/football';
import { savePrediction, fetchUserPredictions } from '../services/api/predictions';
import { Button } from '../components/shared/Button';
import { Typography } from '../components/shared/Typography';
const FlashList = BaseFlashList as any; // React 19 Workaround

import { ScreenHeader } from '../components/shared/ScreenHeader';
import { supabase } from '../services/supabase';
import { syncLiveMatches } from '../services/api/matchSync';

const LiveBadge = () => {
    const { theme } = useUnistyles();
    const opacity = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={[styles.liveContainer, { opacity }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
        </Animated.View>
    );
};

export const MatchScreen = () => {
  const { theme } = useUnistyles();
  const { t, i18n } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userPredictedIds, setUserPredictedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const listRef = useRef<any>(null);
  const [homePred, setHomePred] = useState(0);
  const [awayPred, setAwayPred] = useState(0);

  useEffect(() => {
    loadAllData();
    
    // Реал-тайм подписка на изменение счетов
    const channel = supabase
      .channel('live_scores')
      .on('postgres_changes', { 
        event: '*', // Слушаем всё (INSERT/UPDATE), чтобы не пропустить голы
        schema: 'public', 
        table: 'live_matches' 
      }, (payload) => {
        const updatedMatch = payload.new as any;
        console.log('⚽ REALTIME SCORE UPDATE:', updatedMatch);
        
        setMatches(prev => prev.map(m => 
          m.id === updatedMatch.id 
            ? { 
                ...m, 
                score: { 
                  ...m.score, 
                  fullTime: { 
                    home: updatedMatch.home_score, 
                    away: updatedMatch.away_score 
                  } 
                },
                status: updatedMatch.status
              } 
            : m
        ));
      })
      .subscribe();

    // Запускаем синхронизацию (она сама проверит, пора ли обновлять API)
    const interval = setInterval(() => {
        syncLiveMatches();
    }, 45000); 
    
    return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
    };
  }, []);

  const loadAllData = async () => {
    try {
      let matchesData: Match[] = [];
      let predictionsData: any[] = [];

      try {
        matchesData = await fetchMatches();
      } catch (e) {
        console.warn('Matches fetch failed (likely API limit):', e);
      }

      try {
        predictionsData = await fetchUserPredictions();
      } catch (e) {
        console.error('Predictions fetch failed:', e);
      }

      if (matchesData.length > 0) setMatches(matchesData);
      
      if (predictionsData) {
        const predictedIds = new Set<string>(predictionsData.map((p: any) => p.match_id));
        setUserPredictedIds(predictedIds);
      }
    } catch (err) {
      console.error('MATCH_SCREEN_LOAD_ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMatchTime = (item: Match) => {
    if (['LIVE', 'IN_PLAY', 'PAUSED'].includes(item.status)) return 'In Play';
    if (item.status === 'FINISHED') return 'FT';

    const date = new Date(item.utcDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `${t('matchScreen.today')}, ${timeStr}`;
    if (isTomorrow) return `${t('matchScreen.tomorrow')}, ${timeStr}`;
    return `${date.getDate()} ${date.toLocaleString(i18n.language, { month: 'short' })}, ${timeStr}`;
  };

  const leagues = useMemo(() => {
    const list = matches.map(m => m.competition?.name).filter(Boolean);
    const unique = Array.from(new Set(list)).sort();
    return ['All', ...unique];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const allowedStatuses = ['SCHEDULED', 'TIMED', 'LIVE', 'IN_PLAY', 'PAUSED'];
    let result = matches.filter(m => !userPredictedIds.has(m.id.toString()) && allowedStatuses.includes(m.status));
    if (selectedLeague !== 'All') {
      result = result.filter(m => m.competition?.name === selectedLeague);
    }
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.homeTeam.name.toLowerCase().includes(query) || 
        m.awayTeam.name.toLowerCase().includes(query)
      );
    }
    return result;
  }, [matches, selectedLeague, searchQuery, userPredictedIds]);

  const handlePredict = async () => {
    const match = selectedMatch;
    if (!match) return;
    const scoreString = `${homePred}:${awayPred}`;
    setPredictionLoading(true);
    try {
      await savePrediction({
        match_id: match.id.toString(),
        match_name: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        prediction: scoreString,
        home_crest: match.homeTeam.crest || '',
        away_crest: match.awayTeam.crest || '',
        match_date: match.utcDate
      });
      setSelectedMatch(null); 
      setUserPredictedIds(prev => new Set(prev).add(match.id.toString()));
      Toast.show({ type: 'success', text1: 'Прогноз сохранен!' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Ошибка', text2: error.message });
    } finally {
      setPredictionLoading(false);
    }
  };

  const groupedData = useMemo(() => {
    if (filteredMatches.length === 0) return [];
    if (selectedLeague !== 'All' || searchQuery !== '') return filteredMatches;
    const groups: { [key: string]: Match[] } = {};
    filteredMatches.forEach(m => {
      const name = m.competition?.name || 'Other';
      if (!groups[name]) groups[name] = [];
      groups[name].push(m);
    });
    const result: any[] = [];
    Object.keys(groups).sort().forEach(league => {
      result.push({ isHeader: true, title: league, id: `header-${league}` });
      result.push(...groups[league]);
    });
    return result;
  }, [filteredMatches, selectedLeague, searchQuery]);

  const MatchCard = React.memo(({ item, onPress }: { item: Match, onPress: (m: Match) => void }) => {
    const { theme } = useUnistyles();
    const isLive = ['LIVE', 'IN_PLAY', 'PAUSED'].includes(item.status);
    const score = item.score?.fullTime || { home: null, away: null };
    
    return (
      <Pressable style={styles.card} onPress={() => onPress(item)}>
        <View style={styles.cardHeader}>
          <Text style={[styles.matchStatus, isLive && { color: theme.colors.live }]}>{isLive ? 'LIVE' : item.status}</Text>
          {isLive && <LiveBadge />}
        </View>
        <View style={styles.scoreRow}>
          <View style={styles.teamSide}>
            <Image source={{ uri: item.homeTeam.crest || '' }} style={styles.logoImage} />
            <Text style={styles.teamName} numberOfLines={1}>{item.homeTeam.name}</Text>
          </View>
          <View style={styles.centerScore}>
            <Text style={[styles.scoreNumber, isLive && { color: theme.colors.live }]}>
              {score.home !== null ? `${score.home} - ${score.away}` : 'VS'}
            </Text>
            <View style={[styles.timeBox, isLive && styles.timeBoxLive]}>
                <Text style={[styles.matchTime, isLive && styles.matchTimeLive]}>
                  {formatMatchTime(item)}
                </Text>
            </View>
          </View>
          <View style={styles.teamSide}>
            <Image source={{ uri: item.awayTeam.crest || '' }} style={styles.logoImage} />
            <Text style={styles.teamName} numberOfLines={1}>{item.awayTeam.name}</Text>
          </View>
        </View>
      </Pressable>
    );
  });

  const handleOpenPredict = useCallback((match: Match) => {
    setSelectedMatch(match);
    setHomePred(0);
    setAwayPred(0);
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <View style={styles.headerItem}>
          <Typography variant="caption" bold color={theme.colors.primary}>
            {item.title.toUpperCase()}
          </Typography>
        </View>
      );
    }
    return <MatchCard item={item} onPress={handleOpenPredict} />;
  }, [theme.colors.primary, handleOpenPredict]);

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title={t('tabs.matches')} 
        rightIcon={isSearchActive ? "close" : "search"} 
        onRightPress={() => { setIsSearchActive(!isSearchActive); setSearchQuery(''); }}
      />

      {isSearchActive && (
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('matchScreen.searchPlaceholder')}
            placeholderTextColor={theme.colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {!isSearchActive && matches.length > 0 && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {leagues.map((league) => (
              <Pressable
                key={league}
                onPress={() => setSelectedLeague(league)}
                style={[styles.filterChip, selectedLeague === league && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selectedLeague === league && styles.filterChipTextActive]}>
                  {league === 'All' ? t('matchScreen.all') : league}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={groupedData}
          renderItem={renderItem}
          estimatedItemSize={140}
          contentContainerStyle={styles.list}
          keyExtractor={(item: any) => item.id.toString()}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!selectedMatch} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedMatch(null)}>
          <View style={styles.modalContentCentered}>
            <View style={styles.modalHeader}>
               <Typography variant="h3" bold>{t('matchScreen.scoreTitle')}</Typography>
               <Pressable onPress={() => setSelectedMatch(null)}><Ionicons name="close" size={24} color={theme.colors.subtext} /></Pressable>
            </View>
            <View style={styles.predictionCardCompact}>
                <View style={styles.predTeamCompact}>
                    <Image source={{ uri: selectedMatch?.homeTeam.crest || '' }} style={styles.predLogoCompact} />
                    <View style={styles.counterRowBoxCompact}>
                        <Pressable style={styles.miniBtn} onPress={() => setHomePred(p => Math.max(0, p-1))}><Ionicons name="remove" size={16} color="#fff" /></Pressable>
                        <Typography variant="h2" bold>{homePred}</Typography>
                        <Pressable style={styles.miniBtn} onPress={() => setHomePred(p => p+1)}><Ionicons name="add" size={16} color="#fff" /></Pressable>
                    </View>
                </View>
                <Typography variant="h1" bold color={theme.colors.primary}>:</Typography>
                <View style={styles.predTeamCompact}>
                    <Image source={{ uri: selectedMatch?.awayTeam.crest || '' }} style={styles.predLogoCompact} />
                    <View style={styles.counterRowBoxCompact}>
                        <Pressable style={styles.miniBtn} onPress={() => setAwayPred(p => Math.max(0, p-1))}><Ionicons name="remove" size={16} color="#fff" /></Pressable>
                        <Typography variant="h2" bold>{awayPred}</Typography>
                        <Pressable style={styles.miniBtn} onPress={() => setAwayPred(p => p+1)}><Ionicons name="add" size={16} color="#fff" /></Pressable>
                    </View>
                </View>
            </View>
            <Button title={t('matchScreen.save')} onPress={handlePredict} loading={predictionLoading} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { paddingHorizontal: 20, paddingBottom: 110 },
  searchBarContainer: { backgroundColor: theme.colors.surface, margin: 15, paddingHorizontal: 15, borderRadius: 16, height: 48, justifyContent: 'center' },
  searchInput: { color: theme.colors.text, fontSize: 16 },
  filterContainer: { paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 15 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#000', fontWeight: '800' },
  card: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 15, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  matchStatus: { fontSize: 12, fontWeight: '800', color: theme.colors.subtext },
  liveContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.live + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.live },
  liveText: { color: theme.colors.live, fontSize: 12, fontWeight: '900' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  teamSide: { flex: 1, alignItems: 'center', gap: 8 },
  logoImage: { width: 44, height: 44, resizeMode: 'contain' },
  teamName: { color: theme.colors.text, fontWeight: '600', fontSize: 12, textAlign: 'center' },
  centerScore: { width: 100, alignItems: 'center' },
  scoreNumber: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  matchTime: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  timeBox: { backgroundColor: theme.colors.surfaceCard, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  timeBoxLive: { backgroundColor: theme.colors.live + '20' },
  matchTimeLive: { color: theme.colors.live },
  headerItem: { paddingVertical: 10, paddingHorizontal: 5, marginBottom: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContentCentered: { backgroundColor: theme.colors.surface, borderRadius: 28, padding: 24, gap: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  predictionCardCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  predTeamCompact: { flex: 1, alignItems: 'center', gap: 15 },
  predLogoCompact: { width: 60, height: 60, resizeMode: 'contain' },
  counterRowBoxCompact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }
}));