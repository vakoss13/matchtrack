import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { FlashList as BaseFlashList, ListRenderItem } from '@shopify/flash-list';
import { supabase } from '../services/supabase';
const FlashList = BaseFlashList as any; // Workaround for React 19 / FlashList type intersection issues

// Design System components
import { Typography } from '../components/shared/Typography';
import { Card } from '../components/shared/Card';
import { Avatar } from '../components/shared/Avatar';

// Dummy players will be injected directly inside the component now

import { ScreenHeader } from '../components/shared/ScreenHeader';

interface PlayerProfile {
  id: string;
  display_name: string;
  total_points: number;
  avatar_url?: string;
  rank?: number;
}

export const LeaderboardScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, total_points, avatar_url')
          .order('total_points', { ascending: false })
          .limit(20);

        if (error) throw error;
        
        let allPlayers = data || [];
        
        // Для теста: добавляем "виртуальных" игроков, чтобы было с кем соревноваться
        const dummyPlayers = [
          { id: '1', display_name: 'Alex_Pro', total_points: 50, avatar_url: 'https://api.dicebear.com/8.x/fun-emoji/png?seed=Alex' },
          { id: '2', display_name: 'SoccerKing', total_points: 40, avatar_url: 'https://api.dicebear.com/8.x/fun-emoji/png?seed=SoccerKing' },
          { id: '3', display_name: 'MasterPick', total_points: 20, avatar_url: 'https://api.dicebear.com/8.x/fun-emoji/png?seed=Master' },
          { id: '4', display_name: 'User_99', total_points: 10, avatar_url: 'https://api.dicebear.com/8.x/fun-emoji/png?seed=User99' }
        ];
        
        // Объединяем реальных пользователей с ботами и сортируем по очкам заново
        allPlayers = [...allPlayers, ...dummyPlayers].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

        if (allPlayers.length > 0) {
          // Раздаем реальные места (1, 2, 3...)
          const rankedData = allPlayers.map((item, index) => ({
            ...item,
            rank: index + 1
          }));
          setPlayers(rankedData);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Подписываемся на изменения в таблице profiles (чтобы рейтинг обновлялся в реальном времени, когда кто-то набирает очки)
    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
          fetchLeaderboard(); // Перезагружаем рейтинг, если кто-то получил очки
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
          fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const renderPlayer = ({ item }: { item: PlayerProfile }) => (
    <Card 
      variant="outline" 
      padding="md" 
      style={styles.playerCard}
    >
      <Typography 
        variant="body" 
        bold 
        style={styles.rank((item.rank || 0) <= 3)}
      >
        #{item.rank}
      </Typography>
      
      <Avatar 
        uri={item.avatar_url}
        size={44} 
        style={styles.avatar} 
      />
      
      <Typography variant="body" bold style={styles.playerName}>
        {item.display_name || 'Anonymous User'}
      </Typography>
      
      <Typography variant="body" bold color={theme.colors.primary}>
        {item.total_points} XP
      </Typography>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('tabs.leaderboard')} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlashList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item: any) => item.id}
          estimatedItemSize={70}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    paddingTop: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 120
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rank: (isTop: boolean) => ({
    width: 45,
    color: isTop ? theme.colors.primary : theme.colors.subtext,
  }),
  avatar: {
    marginRight: theme.spacing.md,
  },
  playerName: {
    flex: 1,
  }
}));