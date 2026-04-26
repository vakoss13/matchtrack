import React from 'react';
import { View, Image, Pressable, Animated } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from './Typography';
import { Card } from './Card';
import { Match } from '../../services/api/football';
import { useTranslation } from 'react-i18next';

interface MatchCardProps {
    item: Match;
    onPress: (match: Match) => void;
}

const LiveBadge = () => {
    const { theme } = useUnistyles();
    const opacity = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.liveBadge, { opacity }]}>
            <View style={styles.liveDot} />
            <Typography variant="tiny" bold color={theme.colors.live}>LIVE</Typography>
        </Animated.View>
    );
};

export const MatchCard: React.FC<MatchCardProps> = React.memo(({ item, onPress }) => {
    const { theme } = useUnistyles();
    const { t, i18n } = useTranslation();
    
    const isLive = ['LIVE', 'IN_PLAY', 'PAUSED'].includes(item.status);
    const score = item.score?.fullTime || { home: null, away: null };

    const formatMatchTime = () => {
        if (isLive) return t('predictionsScreen.liveInPlay');
        if (item.status === 'FINISHED') return 'FINISHED';

        const date = new Date(item.utcDate);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow = date.toDateString() === tomorrow.toDateString();
        
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) return `${t('matchScreen.today')}, ${timeStr}`;
        if (isTomorrow) return `${t('matchScreen.tomorrow')}, ${timeStr}`;
        return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Card variant="outline" padding="none" style={styles.container} onPress={() => onPress(item)}>
            <View style={styles.header}>
                <Typography variant="tiny" bold color={isLive ? theme.colors.live : theme.colors.subtext}>
                    {isLive ? 'IN PLAY' : item.status}
                </Typography>
                {isLive && <LiveBadge />}
            </View>

            <View style={styles.content}>
                <View style={styles.teamSection}>
                    <Image source={{ uri: item.homeTeam.crest || '' }} style={styles.crest} />
                    <Typography variant="caption" bold align="center" numberOfLines={1} style={styles.teamName}>
                        {item.homeTeam.name.toUpperCase()}
                    </Typography>
                </View>

                <View style={styles.scoreSection}>
                    <Typography 
                        variant="h2" 
                        bold 
                        color={isLive ? theme.colors.live : theme.colors.text}
                        style={styles.scoreText}
                    >
                        {score.home !== null ? `${score.home} - ${score.away}` : 'VS'}
                    </Typography>
                    <View style={[styles.timeTag, isLive && styles.timeTagLive]}>
                        <Typography variant="tiny" bold color={isLive ? theme.colors.live : theme.colors.primary}>
                            {formatMatchTime()}
                        </Typography>
                    </View>
                </View>

                <View style={styles.teamSection}>
                    <Image source={{ uri: item.awayTeam.crest || '' }} style={styles.crest} />
                    <Typography variant="caption" bold align="center" numberOfLines={1} style={styles.teamName}>
                        {item.awayTeam.name.toUpperCase()}
                    </Typography>
                </View>
            </View>
        </Card>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        marginBottom: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 16,
        paddingTop: 8,
    },
    teamSection: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    crest: {
        width: 48,
        height: 48,
        resizeMode: 'contain',
    },
    teamName: {
        fontSize: 10,
        width: '100%',
    },
    scoreSection: {
        width: 110,
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 26,
    },
    timeTag: {
        marginTop: 8,
        backgroundColor: theme.colors.border + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    timeTagLive: {
        backgroundColor: theme.colors.live + '15',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.live + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: theme.colors.live,
    }
}));
