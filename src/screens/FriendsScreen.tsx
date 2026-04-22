import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlashList as BaseFlashList } from '@shopify/flash-list';
const FlashList = BaseFlashList as any;

// Design System components
import { Typography } from '../components/shared/Typography';
import { Avatar } from '../components/shared/Avatar';
import { Card } from '../components/shared/Card';
import { Input } from '../components/shared/Input';
import { Button } from '../components/shared/Button';
import { ScreenHeader } from '../components/shared/ScreenHeader';

// Services
import { searchUsers, fetchFriendships, sendFriendRequest, respondToRequest, FriendProfile } from '../services/api/friends';
import { supabase } from '../services/supabase';

export const FriendsScreen = () => {
    const { theme } = useUnistyles();
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [requestsReceived, setRequestsReceived] = useState<any[]>([]);
    const [requestsSent, setRequestsSent] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchFriendships();
            setFriends(data.friends);
            setRequestsReceived(data.requestsReceived);
            setRequestsSent(data.requestsSent);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            let channel: any;

            const setupSubscription = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Загружаем данные
                loadData();

                // Создаем уникальный канал для этого пользователя
                channel = supabase
                    .channel(`friends_updates_${user.id}`)
                    .on('postgres_changes', { 
                        event: '*', 
                        schema: 'public', 
                        table: 'messages',
                        filter: `receiver_id=eq.${user.id}` // Слушаем только то, что прилетает нам
                    }, (payload) => {
                        console.log('📬 Friends List Update Triggered:', payload.eventType);
                        loadData();
                    })
                    .subscribe();
            };

            setupSubscription();

            return () => {
                if (channel) supabase.removeChannel(channel);
            };
        }, [loadData])
    );

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await searchUsers(text);
            setSearchResults(results);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSendRequest = async (userId: string) => {
        try {
            await sendFriendRequest(userId);
            // Refresh to update UI
            loadData();
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message);
        }
    };

    const handleResponse = async (friendshipId: string, status: 'ACCEPTED' | 'DECLINED') => {
        try {
            await respondToRequest(friendshipId, status);
            loadData(); // Refresh UI
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message);
        }
    };

    // Helper functions for UI
    const isFriend = (userId: string) => friends.some(f => f.profile.id === userId);
    const isPendingSent = (userId: string) => requestsSent.some(r => r.receiverId === userId);
    const isPendingReceived = (userId: string) => requestsReceived.some(r => r.profile.id === userId);

    const renderSearchResult = ({ item }: { item: FriendProfile }) => {
        const friendStatus = isFriend(item.id);
        const sentStatus = isPendingSent(item.id);
        const receivedStatus = isPendingReceived(item.id);

        return (
            <Card variant="outline" padding="sm" style={styles.friendCard}>
                <Avatar uri={item.avatar_url} size={52} />
                <View style={styles.friendInfo}>
                    <Typography variant="body" bold>{item.display_name}</Typography>
                    <Typography variant="caption" color={theme.colors.primary}>{item.total_points || 0} XP</Typography>
                </View>
                
                {friendStatus ? (
                    <Typography variant="caption" color={theme.colors.subtext} bold>{t('friends.yourFriends').toLowerCase()}</Typography>
                ) : sentStatus ? (
                    <Typography variant="caption" color={theme.colors.subtext} bold>{t('friends.pending')}</Typography>
                ) : receivedStatus ? (
                    <Button variant="primary" title={t('friends.accept')} onPress={() => {
                        const freq = requestsReceived.find(r => r.profile.id === item.id);
                        if (freq) handleResponse(freq.friendshipId, 'ACCEPTED');
                    }} style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 30 }} textStyle={{ fontSize: 12 }} />
                ) : (
                    <Button variant="outline" title={t('friends.addFriend')} onPress={() => handleSendRequest(item.id)} style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 30 }} textStyle={{ fontSize: 12 }} />
                )}
            </Card>
        );
    };

    const renderRequest = ({ item }: { item: any }) => (
        <Card variant="outline" padding="sm" style={styles.friendCard}>
            <Avatar uri={item.profile.avatar_url} size={52} />
            <View style={styles.friendInfo}>
                <Typography variant="body" bold>{item.profile.display_name}</Typography>
                <Typography variant="caption" color={theme.colors.subtext}>{t('friends.requests').toLowerCase()}</Typography>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="primary" icon={<Ionicons name="checkmark" size={16} color="#fff" />} onPress={() => handleResponse(item.friendshipId, 'ACCEPTED')} style={{ paddingHorizontal: 12 }} />
                <Button variant="ghost" icon={<Ionicons name="close" size={16} color={theme.colors.danger} />} onPress={() => handleResponse(item.friendshipId, 'DECLINED')} style={{ paddingHorizontal: 12 }} />
            </View>
        </Card>
    );

    const renderFriend = ({ item }: { item: any }) => (
        <Card variant="outline" padding="sm" style={styles.friendCard}>
            <Avatar uri={item.profile.avatar_url} size={52} />
            <View style={styles.friendInfo}>
                <Typography variant="body" bold>{item.profile.display_name}</Typography>
                <Typography variant="caption" color={theme.colors.primary}>{item.profile.total_points || 0} XP</Typography>
            </View>
            <View style={styles.chatActionContainer}>
                {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Typography variant="caption" bold style={styles.unreadBadgeText}>
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Typography>
                    </View>
                )}
                <Button 
                    variant="ghost" 
                    style={styles.chatButton} 
                    icon={<Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.primary} />} 
                    onPress={() => navigation.navigate('Chat', { 
                        friendId: item.profile.id, 
                        friendName: item.profile.display_name, 
                        friendAvatar: item.profile.avatar_url 
                    })}
                />
            </View>
        </Card>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title={t('tabs.friends')} />

            <View style={styles.searchWrapper}>
                <Input
                    placeholder={t('friends.searchPlaceholder')}
                    icon={<Ionicons name="search" size={20} color={theme.colors.subtext} />}
                    containerStyle={{ marginBottom: 0 }}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : searchQuery.length > 0 ? (
                <View style={{ flex: 1 }}>
                    <Typography variant="caption" bold style={styles.sectionTitle}>
                        {t('friends.searchResults')}
                    </Typography>
                    {searchLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <FlashList
                            data={searchResults}
                            renderItem={renderSearchResult}
                            contentContainerStyle={styles.listContent}
                            estimatedItemSize={80}
                            keyExtractor={(item: any) => item.id}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={<Typography variant="body" color={theme.colors.subtext} align="center" style={{ marginTop: 20 }}>{t('friends.noResults')}</Typography>}
                        />
                    )}
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {requestsReceived.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                            <Typography variant="caption" bold style={styles.sectionTitle}>
                                {t('friends.requests')} ({requestsReceived.length})
                            </Typography>
                            {requestsReceived.map((req) => (
                                <View key={req.friendshipId}>{renderRequest({ item: req })}</View>
                            ))}
                        </View>
                    )}

                    <View>
                        <Typography variant="caption" bold style={styles.sectionTitle}>
                            {t('friends.yourFriends')} ({friends.length})
                        </Typography>
                        {friends.length === 0 ? (
                            <Typography variant="body" color={theme.colors.subtext} align="center" style={{ marginTop: 20 }}>
                                {t('friends.noFriends')}
                            </Typography>
                        ) : (
                            friends.map((friend) => (
                                <View key={friend.friendshipId}>{renderFriend({ item: friend })}</View>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background },
    searchWrapper: { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
    listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: 100 },
    sectionTitle: { textTransform: 'uppercase', marginBottom: theme.spacing.md, letterSpacing: 1, marginLeft: 5 },
    friendCard: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
    friendInfo: { flex: 1, marginLeft: theme.spacing.md },
    chatActionContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unreadBadge: {
        backgroundColor: theme.colors.live, // Используем красный цвет для уведомления
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: { color: '#FFFFFF', fontSize: 10 },
    chatButton: { width: 40, height: 40, paddingVertical: 0, paddingHorizontal: 0, borderRadius: 20, backgroundColor: theme.colors.primary + '15' }
}));