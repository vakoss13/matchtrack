import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Typography } from '../components/shared/Typography';
import { Card } from '../components/shared/Card';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/shared/ScreenHeader';
import { fetchUserPredictions } from '../services/api/predictions';
import { fetchMatches } from '../services/api/football';

export const StatsScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatsData = useCallback(async () => {
    try {
      const [predData, matchesData] = await Promise.all([
          fetchUserPredictions(),
          fetchMatches()
      ]);
      
      const processed = predData.map((p: any) => {
          const match = matchesData.find(m => m.id.toString() === p.match_id);
          if (!match) return p;
          if (match.status === 'FINISHED') {
              const realScore = `${match.score.fullTime.home}:${match.score.fullTime.away}`;
              const isWon = p.prediction === realScore;
              return { ...p, status: isWon ? 'WON' : 'LOST', isFinished: true };
          }
          return p;
      });
      setPredictions(processed);
    } catch (err) {
      console.error('STATS_LOAD_ERROR:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
          loadStatsData();
      }, [loadStatsData])
  );

  const stats = useMemo(() => {
    const total = predictions.length;
    const finished = predictions.filter(p => p.isFinished || p.status !== 'PENDING');
    const won = predictions.filter(p => p.status === 'WON').length;
    const lost = predictions.filter(p => p.status === 'LOST').length;
    const winRate = finished.length > 0 ? Math.round((won / finished.length) * 100) : 0;
    
    const validOdds = predictions.filter(p => p.odds && p.odds > 0);
    const averageOdds = validOdds.length > 0 
        ? (validOdds.reduce((sum, p) => sum + p.odds, 0) / validOdds.length).toFixed(2)
        : "0.00";
    
    return { total, finished: finished.length, won, lost, winRate, averageOdds };
  }, [predictions]);

  const StatItem = ({ title, value, icon, color, subtitle }: any) => (
    <Card style={styles.statCard} variant="outline">
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Typography variant="h2" bold color={theme.colors.text}>{value}</Typography>
        <Typography variant="caption" color={theme.colors.subtext} bold style={{ marginTop: 2 }}>{title.toUpperCase()}</Typography>
        {subtitle && <Typography variant="caption" color={color} style={{ fontSize: 10 }}>{subtitle}</Typography>}
      </View>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('drawer.statistics')} />
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStatsData(); }} tintColor={theme.colors.primary} />}
      >
        <Typography variant="h3" style={styles.sectionTitle}>{t('stats.overallSuccess')}</Typography>
        
        <View style={styles.grid}>
          <StatItem title={t('stats.wins')} value={stats.won} icon="checkmark-circle" color={theme.colors.success} subtitle={`${stats.winRate}${t('stats.successRate')}`} />
          <StatItem title={t('stats.losses')} value={stats.lost} icon="close-circle" color="#FF4D4D" />
          <StatItem title={t('stats.bets')} value={stats.total} icon="list" color={theme.colors.primary} subtitle={`${stats.finished} ${t('stats.completed')}`} />
          <StatItem title={t('stats.averageChance')} value={stats.averageOdds} icon="stats-chart" color={theme.colors.secondary} />
        </View>

        <Typography variant="h3" style={styles.sectionTitle}>{t('stats.activity')}</Typography>
        <Card variant="outline" style={styles.mainScoreCard}>
           <View style={styles.mainScoreContent}>
              <View style={styles.mainCircle}>
                <Typography variant="h1" bold color={theme.colors.primary}>{stats.winRate}%</Typography>
                <Typography variant="caption" color={theme.colors.subtext}>{t('stats.winRate')}</Typography>
              </View>
              <View style={styles.scoreDetails}>
                <View style={styles.detailRow}>
                   <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                   <Typography variant="caption" color={theme.colors.text}>{t('stats.won')} {stats.won}</Typography>
                </View>
                <View style={styles.detailRow}>
                   <View style={[styles.dot, { backgroundColor: '#FF4D4D' }]} />
                   <Typography variant="caption" color={theme.colors.text}>{t('stats.lost')} {stats.lost}</Typography>
                </View>
                <View style={styles.detailRow}>
                   <View style={[styles.dot, { backgroundColor: theme.colors.subtext }]} />
                   <Typography variant="caption" color={theme.colors.text}>{t('stats.pending')} {stats.total - stats.finished}</Typography>
                </View>
              </View>
           </View>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { minWidth: '47%', padding: 16, gap: 12, borderRadius: 24, backgroundColor: theme.colors.surface },
  iconCircle: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { marginTop: 12, marginBottom: 16, fontSize: 13, color: theme.colors.subtext, letterSpacing: 2, fontWeight: '800' },
  mainScoreCard: { padding: 24, borderRadius: 32, backgroundColor: theme.colors.surface },
  mainScoreContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  mainCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  scoreDetails: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 }
}));
