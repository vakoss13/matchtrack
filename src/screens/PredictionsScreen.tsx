import React, { useState, useCallback, useMemo } from 'react';
import { View, ActivityIndicator, Image, Pressable, Modal, Alert } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Typography } from '../components/shared/Typography';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { FlashList as BaseFlashList } from '@shopify/flash-list';
import { fetchUserPredictions, deletePrediction, updatePrediction } from '../services/api/predictions';
import { fetchMatches, fetchMatchById } from '../services/api/football';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
const FlashList = BaseFlashList as any; // React 19 Props Workaround

import { ScreenHeader } from '../components/shared/ScreenHeader';

export const PredictionsScreen = () => {
    const { theme } = useUnistyles();
    const { t, i18n } = useTranslation();
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

    // Editing states
    const [editingItem, setEditingItem] = useState<any>(null);
    const [homePred, setHomePred] = useState(0);
    const [awayPred, setAwayPred] = useState(0);
    const [updateLoading, setUpdateLoading] = useState(false);

    const loadAllData = useCallback(async () => {
        try {
            // Fetch independently so failure in one doesn't kill the other
            let predData: any[] = [];
            let matchesData: any[] = [];
            
            try {
                predData = await fetchUserPredictions();
            } catch (e) {
                console.error('Supabase fetch failed:', e);
            }
            
            try {
                matchesData = await fetchMatches();
            } catch (e) {
                console.warn('Football API fetch failed:', e);
            }
            
            if (predData.length === 0 && !loading) return; // No new data and already loaded once
            
            const processed = predData.map((p: any) => {
                const match = matchesData.find(m => m.id.toString() === p.match_id);
                if (!match) {
                   // Match not in API (too old/deleted). Use DB status.
                   const parsedScore = p.match_name.split('|')[4];
                   // Если статус ВЫИГРЫШ, то реальный счет гарантированно равен нашему прогнозу!
                   const autoScore = p.status === 'WON' ? p.prediction : undefined;
                   
                   return { 
                      ...p, 
                      realScore: parsedScore || autoScore,
                      isFinished: p.status === 'WON' || p.status === 'LOST' || p.status === 'CANCELLED' 
                   };
                }

                const isFinished = match.status === 'FINISHED' || match.status === 'AWARDED';
                const isCancelled = ['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(match.status);
                const isLive = ['LIVE', 'IN_PLAY', 'PAUSED'].includes(match.status);
                
                if (isFinished) {
                    const realScore = `${match.score.fullTime.home}:${match.score.fullTime.away}`;
                    const status = p.prediction === realScore ? 'WON' : 'LOST';
                    
                    // Save to DB so old matches aren't lost (append realScore to match_name to avoid DB schema changes)
                    if (p.status !== status || p.match_name.split('|').length <= 4) {
                        const newMatchName = p.match_name.split('|').slice(0,4).join('|') + `|${realScore}`;
                        import('../services/supabase').then(async ({ supabase }) => {
                            await supabase.from('predictions').update({ status, match_name: newMatchName }).eq('id', p.id);
                            
                            // Начисляем очки при первой победе (по 10 очков за каждый верный прогноз!)
                            if (status === 'WON' && p.status !== 'WON') {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) {
                                   const { data: profile } = await supabase.from('profiles').select('total_points').eq('id', user.id).single();
                                   if (profile) {
                                      await supabase.from('profiles').update({ total_points: (profile.total_points || 0) + 10 }).eq('id', user.id);
                                   }
                                }
                            }
                        }).catch(() => {});
                        p.match_name = newMatchName;
                    }
                    
                    return { ...p, status, realScore, isFinished };
                }

                if (isCancelled) {
                    if (p.status !== 'CANCELLED') {
                        import('../services/supabase').then(({ supabase }) => {
                            supabase.from('predictions').update({ status: 'CANCELLED' }).eq('id', p.id).then();
                        }).catch(() => {});
                    }
                    return { ...p, status: 'CANCELLED', isFinished: true, realScore: 'Canceled' };
                }

                return { 
                    ...p, 
                    isLive, 
                    currentScore: `${match.score.fullTime.home}:${match.score.fullTime.away}`
                };
            });

            setPredictions(processed);

            // Ищем матчи: либо еще в "Ожидании", либо мы знаем что "Проиграли", но не знаем точный счет
            const missingPending = processed.filter((p: any) => 
               !p.isLive && 
               p.match_name.split('|')[3] && 
               new Date(p.match_name.split('|')[3]).getTime() < Date.now() &&
               (
                 (p.status === 'PENDING' && !p.isFinished) || 
                 (p.status === 'LOST' && !p.realScore)
               )
            );

            if (missingPending.length > 0) {
               // Загружаем по одному, чтобы не словить ошибку 429
               (async () => {
                   for (const p of missingPending) {
                       const match = await fetchMatchById(p.match_id);
                       if (match && (match.status === 'FINISHED' || match.status === 'AWARDED')) {
                           const realScore = `${match.score.fullTime.home}:${match.score.fullTime.away}`;
                           const status = p.prediction === realScore ? 'WON' : 'LOST';
                           
                           if (p.status !== status || p.match_name.split('|').length <= 4) {
                               const newMatchName = p.match_name.split('|').slice(0,4).join('|') + `|${realScore}`;
                               const { supabase } = await import('../services/supabase');
                               await supabase.from('predictions').update({ status, match_name: newMatchName }).eq('id', p.id);
                               
                               // Начисляем очки при первой фоновой победе
                               if (status === 'WON' && p.status !== 'WON') {
                                   const { data: { user } } = await supabase.auth.getUser();
                                   if (user) {
                                      const { data: profile } = await supabase.from('profiles').select('total_points').eq('id', user.id).single();
                                      if (profile) await supabase.from('profiles').update({ total_points: (profile.total_points || 0) + 10 }).eq('id', user.id);
                                   }
                               }
                               
                               setPredictions(prev => prev.map(old => 
                                   old.id === p.id ? { ...old, status, realScore, match_name: newMatchName, isFinished: true } : old
                               ));
                           } else {
                               setPredictions(prev => prev.map(old => 
                                   old.id === p.id ? { ...old, realScore, isFinished: true } : old
                               ));
                           }
                       } else if (match && ['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(match.status)) {
                           const { supabase } = await import('../services/supabase');
                           await supabase.from('predictions').update({ status: 'CANCELLED' }).eq('id', p.id);
                           setPredictions(prev => prev.map(old => 
                               old.id === p.id ? { ...old, status: 'CANCELLED', isFinished: true, realScore: 'Canceled' } : old
                           ));
                       }
                       await new Promise(r => setTimeout(r, 600)); // Пауза
                   }
               })();
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAllData();
            const interval = setInterval(loadAllData, 30000);
            return () => clearInterval(interval);
        }, [loadAllData])
    );

    const filteredPredictions = useMemo(() => {
        return predictions.filter((item) => {
            const [,, , matchDate] = item.match_name.split('|');
            const isFinishedStatus = item.isFinished || item.status === 'WON' || item.status === 'LOST';
            const isPastTime = matchDate && !isNaN(new Date(matchDate).getTime()) ? new Date(matchDate).getTime() < Date.now() : false;
            const isHistory = isFinishedStatus || (isPastTime && !item.isLive);

            if (activeTab === 'HISTORY') return isHistory;
            return !isHistory;
        });
    }, [predictions, activeTab]);

    const formatMatchDisplayDate = (dateString?: string, isLive?: boolean) => {
        if (isLive) return t('predictionsScreen.liveInPlay');
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString(i18n.language, { 
            day: 'numeric', 
            month: 'long', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const handleDelete = async (id: string) => {
        Alert.alert(t('common.confirm'), 'Удалить этот прогноз?', [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: 'УДАЛИТЬ', 
              style: 'destructive',
              onPress: async () => {
                try {
                    await deletePrediction(id);
                    loadAllData();
                } catch (error: any) {
                    Toast.show({ type: 'error', text1: error.message });
                }
              }
            }
        ]);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        setUpdateLoading(true);
        try {
            const newScore = `${homePred}:${awayPred}`;
            await updatePrediction(editingItem.id, newScore);
            setEditingItem(null);
            loadAllData();
        } catch (error: any) {
            Toast.show({ type: 'error', text1: error.message });
        } finally {
            setUpdateLoading(false);
        }
    };

    const PredictionCard = React.memo(({ item, onEdit, onDelete }: { item: any, onEdit: (i: any) => void, onDelete: (id: string) => void }) => {
        const { theme } = useUnistyles();
        const { t, i18n } = useTranslation();
        const [matchNames, homeCrest, awayCrest, matchDate] = item.match_name.split('|');
        const teams = (matchNames || '').split(' vs ');
        const homeName = teams[0] || 'Unknown';
        const awayName = teams[1] || 'Unknown';

        const isLost = item.status === 'LOST';
        const isWon = item.status === 'WON';
        const isCancelled = item.status === 'CANCELLED';
        const isLive = item.isLive;
        const isFinished = item.isFinished || isWon || isLost || isCancelled;
        const isPastMatchDate = matchDate && !isNaN(new Date(matchDate).getTime()) ? new Date(matchDate).getTime() < Date.now() : false;
        const canEdit = !isLive && !isFinished && item.status === 'PENDING' && !isPastMatchDate;

        return (
            <Card style={[styles.card, isWon && styles.cardWon, isLost && styles.cardLost, isLive && styles.cardLive]} variant="outline">
                <View style={styles.statusRow}>
                    <View style={[styles.badge, { backgroundColor: isWon ? theme.colors.success : (isLost || isCancelled) ? '#FF4D4D' : isLive ? theme.colors.live : theme.colors.surfaceCard }]}>
                        <Typography variant="caption" bold color={isWon || isLost || isLive || isCancelled ? '#fff' : theme.colors.subtext}>
                            {isLive ? 'LIVE' : isCancelled ? 'ОТМЕНЕН' : t(`predictionsScreen.status_${item.status}`)}
                        </Typography>
                    </View>
                    
                    {canEdit && (
                        <View style={styles.actionsBox}>
                            <Pressable style={styles.actionBtn} onPress={() => onEdit(item)}>
                                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                            </Pressable>
                            <Pressable style={styles.actionBtn} onPress={() => onDelete(item.id)}>
                                <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                            </Pressable>
                        </View>
                    )}
                </View>

                <View style={styles.scoreboard}>
                    <View style={styles.teamCol}>
                        <Typography variant="caption" bold align="center" numberOfLines={2} style={styles.teamNameText}>
                            {homeName.toUpperCase()}
                        </Typography>
                        <Image source={{ uri: homeCrest }} style={styles.crest} />
                    </View>

                    <View style={styles.scoreCol}>
                        <Typography variant="caption" color={theme.colors.subtext} style={{ marginBottom: 5 }}>{t('drawer.yourPick').toUpperCase()}</Typography>
                        <View style={[styles.scoreWrapper, isLive && { borderColor: theme.colors.live, borderWidth: 1 }]}>
                           <Typography variant="h2" bold color={theme.colors.primary}>{item.prediction}</Typography>
                        </View>
                        {isLive && (
                           <View style={styles.liveScoreContainer}>
                             <Typography variant="caption" bold color={theme.colors.live}>
                                LIVE: {item.currentScore}
                             </Typography>
                           </View>
                        )}
                        {isFinished && item.realScore && (
                            <Typography variant="caption" bold color={theme.colors.subtext} style={{ marginTop: 8 }}>
                               {item.realScore === 'Canceled' ? 'Отменен' : `${t('predictionsScreen.result')} ${item.realScore}`}
                            </Typography>
                        )}
                    </View>

                    <View style={styles.teamCol}>
                        <Typography variant="caption" bold align="center" numberOfLines={2} style={styles.teamNameText}>
                            {awayName.toUpperCase()}
                        </Typography>
                        <Image source={{ uri: awayCrest }} style={styles.crest} />
                    </View>
                </View>
                
                <View style={[styles.footerContainer, isLive && styles.footerLive]}>
                    <Ionicons name={isLive ? "flash" : "calendar-outline"} size={12} color={isLive ? theme.colors.live : theme.colors.subtext} />
                    <Typography variant="caption" bold={isLive} color={isLive ? theme.colors.live : theme.colors.subtext} style={{ marginLeft: 5 }}>
                        {formatMatchDisplayDate(matchDate, isLive)}
                    </Typography>
                </View>
            </Card>
        );
    });

    const handleOpenEdit = useCallback((item: any) => {
        const [h, a] = item.prediction.split(':').map(Number);
        setHomePred(h); 
        setAwayPred(a); 
        setEditingItem(item);
    }, []);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <PredictionCard 
            item={item} 
            onEdit={handleOpenEdit} 
            onDelete={handleDelete} 
        />
    ), [handleOpenEdit, handleDelete]);

    return (
        <View style={styles.container}>
            <ScreenHeader title={t('drawer.myPredictions')} />
            
            <View style={styles.tabContainer}>
                <Pressable style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]} onPress={() => setActiveTab('ACTIVE')}>
                    <Typography variant="caption" bold color={activeTab === 'ACTIVE' ? '#000' : theme.colors.subtext}>{t('predictionsScreen.active')}</Typography>
                </Pressable>
                <Pressable style={[styles.tabButton, activeTab === 'HISTORY' && styles.tabButtonActive]} onPress={() => setActiveTab('HISTORY')}>
                    <Typography variant="caption" bold color={activeTab === 'HISTORY' ? '#000' : theme.colors.subtext}>{t('predictionsScreen.history')}</Typography>
                </Pressable>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : (
                <FlashList 
                    data={filteredPredictions}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item.id.toString()}
                    estimatedItemSize={180}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ЦЕНТРИРОВАННОЕ ОКНО РЕДАКТИРОВАНИЯ */}
            <Modal visible={!!editingItem} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setEditingItem(null)}>
                    <View style={styles.modalContentCentered} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                           <Typography variant="h3" bold>{t('matchScreen.editPrediction')}</Typography>
                           <Pressable style={styles.closeBtn} onPress={() => setEditingItem(null)}>
                              <Ionicons name="close" size={24} color={theme.colors.subtext} />
                           </Pressable>
                        </View>

                        <View style={styles.predictionCardCompact}>
                           <View style={styles.predTeamCompact}>
                              <Typography variant="caption" bold align="center" style={{ width: 90 }}>
                                 {(editingItem?.match_name?.split('|')[0]?.split(' vs ')[0] || '').toUpperCase()}
                              </Typography>
                              <View style={styles.counterRowBoxCompact}>
                                 <Pressable style={styles.miniBtn} onPress={() => setHomePred(p => Math.max(0, p-1))}><Ionicons name="remove" size={16} color="#fff" /></Pressable>
                                 <Typography variant="h2" bold style={styles.scoreText}>{homePred}</Typography>
                                 <Pressable style={styles.miniBtn} onPress={() => setHomePred(p => p+1)}><Ionicons name="add" size={16} color="#fff" /></Pressable>
                              </View>
                           </View>

                           <Typography variant="h1" bold color={theme.colors.primary}>:</Typography>

                           <View style={styles.predTeamCompact}>
                              <Typography variant="caption" bold align="center" style={{ width: 90 }}>
                                 {(editingItem?.match_name?.split('|')[0]?.split(' vs ')[1] || '').toUpperCase()}
                              </Typography>
                              <View style={styles.counterRowBoxCompact}>
                                 <Pressable style={styles.miniBtn} onPress={() => setAwayPred(p => Math.max(0, p-1))}><Ionicons name="remove" size={16} color="#fff" /></Pressable>
                                 <Typography variant="h2" bold style={styles.scoreText}>{awayPred}</Typography>
                                 <Pressable style={styles.miniBtn} onPress={() => setAwayPred(p => p+1)}><Ionicons name="add" size={16} color="#fff" /></Pressable>
                              </View>
                           </View>
                        </View>

                        <Button 
                           title={t('matchScreen.save')} 
                           onPress={handleUpdate} 
                           loading={updateLoading} 
                           style={{ marginTop: 20 }} 
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: 20, paddingBottom: 100 },
    tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, marginHorizontal: 20, marginBottom: 5, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: theme.colors.border },
    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
    tabButtonActive: { backgroundColor: theme.colors.primary },
    card: { padding: 15, borderRadius: 24, backgroundColor: theme.colors.surface, marginBottom: 15, borderWidth: 1, borderColor: theme.colors.border },
    cardWon: { borderColor: theme.colors.success, borderWidth: 2 },
    cardLost: { borderColor: '#FF4D4D30' },
    cardLive: { borderColor: theme.colors.live, borderWidth: 1 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    actionsBox: { flexDirection: 'row', gap: 10 },
    actionBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.surfaceCard, justifyContent: 'center', alignItems: 'center' },
    scoreboard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    teamCol: { flex: 1, alignItems: 'center', gap: 8 },
    teamNameText: { color: theme.colors.text, fontSize: 10 },
    crest: { width: 40, height: 40, resizeMode: 'contain' },
    scoreCol: { width: 110, alignItems: 'center' },
    scoreWrapper: { backgroundColor: theme.colors.surfaceCard, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12 },
    liveScoreContainer: { marginTop: 8, backgroundColor: theme.colors.live + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    footerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
    footerLive: { borderTopColor: theme.colors.live + '30' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
    modalContentCentered: { backgroundColor: theme.colors.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.colors.border, width: '100%', gap: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceCard, justifyContent: 'center', alignItems: 'center' },
    predictionCardCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    predTeamCompact: { flex: 1, alignItems: 'center', gap: 12 },
    counterRowBoxCompact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    miniBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
    scoreText: { color: theme.colors.text, minWidth: 20, textAlign: 'center' }
}));
