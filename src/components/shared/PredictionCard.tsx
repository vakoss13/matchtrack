import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Typography } from './Typography';
import { Card } from './Card';

export interface PredictionItem {
    id: string;
    match_id: string;
    match_name: string;
    prediction: string;
    status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';
    isLive?: boolean;
    isFinished?: boolean;
    currentScore?: string;
    realScore?: string;
    odds?: number;
}

interface PredictionCardProps {
    item: PredictionItem;
    onEdit?: (item: PredictionItem) => void;
    onDelete?: (id: string) => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = React.memo(({ item, onEdit, onDelete }) => {
    const { theme } = useUnistyles();
    const { t, i18n } = useTranslation();

    const [matchNames, homeCrest, awayCrest, matchDate] = (item.match_name || '').split('|');
    const teams = (matchNames || '').split(' vs ');
    const homeName = teams[0] || 'Unknown';
    const awayName = teams[1] || 'Unknown';

    const isWon = item.status === 'WON';
    const isLost = item.status === 'LOST';
    const isCancelled = item.status === 'CANCELLED';
    const isLive = item.isLive;
    const isFinished = item.isFinished || isWon || isLost || isCancelled;

    const isPastDate = matchDate && !isNaN(new Date(matchDate).getTime()) ? new Date(matchDate).getTime() < Date.now() : false;
    const canEdit = !isLive && !isFinished && item.status === 'PENDING' && !isPastDate;

    const getStatusColor = () => {
        if (isWon) return theme.colors.success;
        if (isLost || isCancelled) return '#FF4D4D';
        if (isLive) return theme.colors.live;
        return theme.colors.surfaceCard;
    };

    const formatDate = () => {
        if (isLive) return t('predictionsScreen.liveInPlay');
        if (!matchDate) return '';
        const date = new Date(matchDate);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString(i18n.language, { 
            day: 'numeric', 
            month: 'long', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <Card 
            variant="outline" 
            padding="none"
            style={[
                styles.container,
                isWon && styles.borderWon,
                isLive && styles.borderLive
            ]}
        >
            <View style={styles.header}>
                <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
                    <Typography variant="tiny" bold color={isWon || isLost || isLive || isCancelled ? '#fff' : theme.colors.subtext}>
                        {isLive ? 'LIVE' : isCancelled ? t('common.canceled').toUpperCase() : t(`predictionsScreen.status_${item.status}`).toUpperCase()}
                    </Typography>
                </View>

                {canEdit && (onEdit || onDelete) && (
                    <View style={styles.actions}>
                        {onEdit && (
                            <Pressable style={styles.actionBtn} onPress={() => onEdit(item)}>
                                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                            </Pressable>
                        )}
                        {onDelete && (
                            <Pressable style={styles.actionBtn} onPress={() => onDelete(item.id)}>
                                <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                            </Pressable>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.scoreboard}>
                <View style={styles.teamCol}>
                    <Typography variant="tiny" bold align="center" numberOfLines={2} style={styles.teamName}>
                        {homeName.toUpperCase()}
                    </Typography>
                    <Image source={{ uri: homeCrest }} style={styles.crest} />
                </View>

                <View style={styles.scoreCol}>
                    <Typography variant="tiny" color={theme.colors.subtext} style={styles.scoreLabel}>
                        {t('drawer.yourPick').toUpperCase()}
                    </Typography>
                    <View style={[styles.predictionPill, isLive && styles.predictionPillLive]}>
                       <Typography variant="h2" bold color={theme.colors.primary}>{item.prediction}</Typography>
                    </View>
                    
                    {isLive && (
                       <View style={styles.liveScoreBox}>
                         <Typography variant="tiny" bold color={theme.colors.live}>
                            LIVE: {item.currentScore}
                         </Typography>
                       </View>
                    )}

                    {isFinished && item.realScore && (
                        <View style={styles.resultBox}>
                            <Typography variant="tiny" bold color={theme.colors.subtext}>
                                {item.realScore === 'Canceled' ? t('common.canceled') : `${t('predictionsScreen.result')} ${item.realScore}`}
                            </Typography>
                        </View>
                    )}
                </View>

                <View style={styles.teamCol}>
                    <Typography variant="tiny" bold align="center" numberOfLines={2} style={styles.teamName}>
                        {awayName.toUpperCase()}
                    </Typography>
                    <Image source={{ uri: awayCrest }} style={styles.crest} />
                </View>
            </View>
            
            <View style={[styles.footer, isLive && styles.footerLive]}>
                <Ionicons name={isLive ? "flash" : "calendar-outline"} size={12} color={isLive ? theme.colors.live : theme.colors.subtext} />
                <Typography variant="tiny" bold={isLive} color={isLive ? theme.colors.live : theme.colors.subtext}>
                    {formatDate()}
                </Typography>
            </View>
        </Card>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        marginBottom: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
    },
    borderWon: { borderColor: theme.colors.success, borderWidth: 2 },
    borderLive: { borderColor: theme.colors.live },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.border + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreboard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    teamCol: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    teamName: {
        width: '100%',
    },
    crest: {
        width: 44,
        height: 44,
        resizeMode: 'contain',
    },
    scoreCol: {
        width: 120,
        alignItems: 'center',
    },
    scoreLabel: {
        marginBottom: 6,
    },
    predictionPill: {
        backgroundColor: theme.colors.border + '15',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
    },
    predictionPillLive: {
        borderWidth: 1,
        borderColor: theme.colors.live,
    },
    liveScoreBox: {
        marginTop: 6,
        backgroundColor: theme.colors.live + '10',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    resultBox: {
        marginTop: 8,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '20',
    },
    footerLive: {
        borderTopColor: theme.colors.live + '30',
    }
}));
