import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Platform, TextInput, TouchableOpacity, Keyboard, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';
import { FlashList as BaseFlashList } from '@shopify/flash-list';
const FlashList = BaseFlashList as any;

import { supabase } from '../services/supabase';
import { ScreenHeader } from '../components/shared/ScreenHeader';
import { Typography } from '../components/shared/Typography';

export const ChatScreen = ({ route, navigation }: any) => {
    const { friendId, friendName } = route.params;
    const [messages, setMessages] = useState<any[]>([]);
    const [userId, setUserId] = useState<string>('');
    const [inputText, setInputText] = useState('');
    const { theme } = useUnistyles();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const flashListRef = useRef<any>(null);
    
    // Refs for Realtime to avoid stale closures
    const userIdRef = useRef<string>('');
    const channelRef = useRef<any>(null);
    
    const [friendStatus, setFriendStatus] = useState<'online' | 'offline'>('offline');
    const [isFriendTyping, setIsFriendTyping] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Navigation Bar and Keyboard Management
    useFocusEffect(
        useCallback(() => {
            if (Platform.OS === 'android') {
                NavigationBar.setBackgroundColorAsync(theme.colors.background).catch(() => {});
                NavigationBar.setButtonStyleAsync('light').catch(() => {});
            }
            
            const showSub = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
                (e) => {
                    setKeyboardVisible(true);
                    setKeyboardHeight(e.endCoordinates.height);
                    setTimeout(() => flashListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            );
            const hideSub = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
                () => {
                    setKeyboardVisible(false);
                    setKeyboardHeight(0);
                }
            );

            return () => {
                showSub.remove();
                hideSub.remove();
            };
        }, [theme])
    );

    // Core Logic: Loading and Realtime
    useEffect(() => {
        const loadMessages = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            userIdRef.current = user.id;

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true })
                .limit(50);

            if (!error && data) {
                console.log(`✅ Loaded ${data.length} messages for friend ${friendId}`);
                setMessages(data);
                // Mark initial messages as read
                setTimeout(() => markAsRead(), 500);
            } else if (error) {
                console.error('❌ Error loading messages:', error);
            }

            const roomId = [user.id, friendId].sort().join('-');

            const channel = supabase
                .channel(`room:${roomId}`, {
                    config: { presence: { key: user.id } },
                })
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages'
                }, (payload) => {
                    const newMsg = payload.new;
                    const myId = userIdRef.current;
                    
                    if (
                       (newMsg.sender_id === myId && newMsg.receiver_id === friendId) || 
                       (newMsg.sender_id === friendId && newMsg.receiver_id === myId)
                    ) {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            
                            // Optimistic replace
                            if (newMsg.sender_id === myId) {
                                const optIndex = prev.findLastIndex(m => 
                                    m.sender_id === myId && m.text === newMsg.text && 
                                    (String(m.id).includes('.') || !String(m.id).includes('-'))
                                );

                                if (optIndex !== -1) {
                                    const updated = [...prev];
                                    updated[optIndex] = newMsg;
                                    return updated;
                                }
                            }

                            return [...prev, newMsg];
                        });

                        // If message is for us - mark as read instantly
                        if (newMsg.receiver_id === myId) {
                            markAsRead();
                        }
                    }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public', 
                    table: 'messages'
                }, (payload) => {
                    const updatedMsg = payload.new;
                    setMessages(prev => prev.map(m => 
                        m.id === updatedMsg.id ? { ...m, is_read: updatedMsg.is_read } : m
                    ));
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    setFriendStatus(!!state[friendId] ? 'online' : 'offline');
                })
                .on('presence', { event: 'join' }, ({ key }) => {
                    if (key === friendId) setFriendStatus('online');
                })
                .on('presence', { event: 'leave' }, ({ key }) => {
                    if (key === friendId) {
                        setFriendStatus('offline');
                        setIsFriendTyping(false);
                    }
                })
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.user_id === friendId) {
                        setIsFriendTyping(payload.payload.is_typing);
                    }
                })
                .on('broadcast', { event: 'read_all' }, (payload) => {
                    if (payload.payload.user_id === friendId) {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                        setMessages(prev => prev.map(m => 
                            m.sender_id === userIdRef.current ? { ...m, is_read: true } : m
                        ));
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                        markAsRead();
                    }
                });

            channelRef.current = channel;
        };

        loadMessages();

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [friendId]);

    // Typing self-cleanup
    useEffect(() => {
        let timer: any;
        if (isFriendTyping) {
            timer = setTimeout(() => setIsFriendTyping(false), 5000);
        }
        return () => clearTimeout(timer);
    }, [isFriendTyping]);

    // Broadcast our typing status
    useEffect(() => {
        if (channelRef.current && userId) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: userId, is_typing: inputText.length > 0 }
            });
        }
    }, [inputText.length > 0]);

    // Автоматический скролл больше не нужен, так как список инвертирован (inverted)
    // Это уберет раздражающий прыжок при открытии чата


    const markAsRead = async () => {
        const myId = userIdRef.current;
        if (!myId || !friendId) return;

        // 1. Update DB
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', myId)
            .eq('sender_id', friendId)
            .eq('is_read', false);

        // 2. Broadcast to friend
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'read_all',
                payload: { user_id: myId }
            });
        }
    };

    // Функция для форматирования даты заголовка
    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);

        if (date.toDateString() === now.toDateString()) return t('common.today');
        if (date.toDateString() === yesterday.toDateString()) return t('common.yesterday');
        
        return date.toLocaleDateString([], { day: 'numeric', month: 'long' });
    };

    // Группировка сообщений с вставкой дат
    const getGroupedMessages = () => {
        const grouped: any[] = [];
        let lastDate = '';

        messages.forEach((msg) => {
            const dateKey = new Date(msg.created_at).toDateString();
            if (dateKey !== lastDate) {
                grouped.push({ id: `date-${dateKey}`, type: 'date', date: formatDateHeader(msg.created_at) });
                lastDate = dateKey;
            }
            grouped.push({ ...msg, type: 'message' });
        });

        return grouped;
    };

    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (isInitialLoad.current && messages.length > 0) {
            // Прыгаем вниз мгновенно при первом входе, если есть сообщения
            setTimeout(() => {
                flashListRef.current?.scrollToEnd({ animated: false });
                isInitialLoad.current = false;
            }, 100);
        }
    }, [messages.length]);

    const handleSend = async () => {
        if (!inputText.trim() || !userId) return;
        
        const tempMsg = {
           id: Math.random().toString(),
           text: inputText.trim(),
           sender_id: userId,
           receiver_id: friendId,
           is_read: false,
           created_at: new Date().toISOString()
        };
        
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: userId, is_typing: false }
            });
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setMessages(prev => [...prev, tempMsg]);
        setInputText('');

        // Скроллим вниз при отправке своего сообщения
        setTimeout(() => flashListRef.current?.scrollToEnd({ animated: true }), 100);

        await supabase.from('messages').insert({
            sender_id: userId,
            receiver_id: friendId,
            text: tempMsg.text
        });
    };

    const renderMessage = ({ item }: any) => {
        if (item.type === 'date') {
            return (
                <View style={styles.dateHeaderContainer}>
                    <View style={styles.dateHeaderPill}>
                        <Typography variant="caption" bold style={styles.dateHeaderText}>
                            {item.date}
                        </Typography>
                    </View>
                </View>
            );
        }

        const isMyMessage = item.sender_id === userIdRef.current;
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={[
                styles.messageRow,
                isMyMessage ? styles.myMessageRow : styles.otherMessageRow
            ]}>
                <View style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myBubble : styles.otherBubble
                ]}>
                    <Typography style={[styles.messageText, isMyMessage ? styles.myMessageText : {}]}>
                        {item.text}
                    </Typography>
                    <View style={styles.messageFooter}>
                        <Typography variant="caption" style={[styles.timeText, isMyMessage ? styles.myTimeText : {}]}>
                            {time}
                        </Typography>
                        {isMyMessage && (
                            <View style={styles.statusIconContainer}>
                                <Ionicons 
                                    name={item.is_read ? "checkmark-done" : "checkmark"} 
                                    size={15} 
                                    color="#000000" 
                                    style={{ opacity: item.is_read ? 0.8 : 0.4 }}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const getSubtitle = () => {
        if (isFriendTyping) return t('chat.typing');
        if (friendStatus === 'online') return t('chat.online');
        return t('chat.offline');
    };

    const getSubtitleColor = () => {
        if (isFriendTyping || friendStatus === 'online') return theme.colors.primary;
        return theme.colors.subtext;
    };

    return (
        <View style={styles.container}>
            <ScreenHeader 
                title={friendName} 
                subtitle={getSubtitle()}
                subtitleColor={getSubtitleColor()}
                showBack 
                onBack={() => navigation.goBack()} 
            />
            
            <View style={styles.chatBackground}>
                <FlashList
                    ref={flashListRef}
                    data={getGroupedMessages()}
                    renderItem={renderMessage}
                    estimatedItemSize={70}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            <View style={{ paddingBottom: Platform.OS === 'android' ? (isKeyboardVisible ? keyboardHeight + 45 : 0) : 0 }}>
                <View style={[
                    styles.bottomWrapper, 
                    { paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 8) + 4 }
                ]}>
                    <View style={styles.chatInputRow}>
                        <View style={styles.pillInputContainer}>
                            <TextInput
                                style={styles.pillInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder={t('chat.placeholder')} 
                                placeholderTextColor={theme.colors.subtext + 'AA'}
                                multiline
                            />
                        </View>
                        <TouchableOpacity 
                            onPress={handleSend} 
                            style={[styles.circleSendButton, !inputText.trim() && styles.circleSendButtonDisabled]} 
                            disabled={!inputText.trim()}
                        >
                            <Ionicons 
                                name="send" 
                                size={22} 
                                color="#FFFFFF" 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background },
    chatBackground: { flex: 1, backgroundColor: theme.colors.background },
    listContent: { 
        paddingHorizontal: theme.spacing?.md ?? 16, 
        paddingTop: theme.spacing?.lg ?? 24, 
        paddingBottom: theme.spacing?.lg ?? 24 
    },
    messageRow: { marginBottom: theme.spacing?.md ?? 16, flexDirection: 'row' },
    myMessageRow: { justifyContent: 'flex-end', paddingLeft: 60 },
    otherMessageRow: { justifyContent: 'flex-start', paddingRight: 60 },
    messageBubble: { 
        paddingVertical: 10, 
        paddingHorizontal: theme.spacing?.md ?? 16, 
        borderRadius: theme.borderRadius?.lg ?? 24,
        maxWidth: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    myBubble: { 
        backgroundColor: theme.colors.primary, 
        borderBottomRightRadius: theme.borderRadius?.xs ?? 4,
        marginRight: 4,
    },
    otherBubble: { 
        backgroundColor: theme.colors.surface, 
        borderBottomLeftRadius: theme.borderRadius?.xs ?? 4, 
        marginLeft: 4,
        borderWidth: 1, 
        borderColor: theme.colors.border 
    },
    messageText: { 
        fontSize: theme.typography?.body ?? 16, 
        lineHeight: 22, 
        color: theme.colors.text 
    },
    myMessageText: { color: '#000000', fontWeight: '600' },
    timeText: { 
        fontSize: theme.typography?.caption ?? 10, 
        opacity: 0.6, 
        color: theme.colors.subtext 
    },
    myTimeText: { color: '#000000', opacity: 0.5 },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
    },
    statusIconContainer: {
        marginLeft: 4,
        marginBottom: -1,
    },
    dateHeaderContainer: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateHeaderPill: {
        backgroundColor: theme.colors.surface + '99',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dateHeaderText: {
        color: theme.colors.subtext,
        fontSize: 12,
        textTransform: 'lowercase',
    },
    bottomWrapper: {
        paddingTop: theme.spacing?.sm ?? 8,
        paddingHorizontal: theme.spacing?.md ?? 16,
        backgroundColor: theme.colors.background,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: theme.spacing?.sm ?? 8,
    },
    pillInputContainer: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius?.lg ?? 24,
        paddingHorizontal: theme.spacing?.md ?? 16,
        paddingVertical: 4,
        minHeight: 48,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    pillInput: {
        color: theme.colors.text,
        fontSize: theme.typography?.body ?? 16,
        maxHeight: 120,
        paddingTop: 10,
        paddingBottom: 10,
    },
    circleSendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleSendButtonDisabled: {
        backgroundColor: theme.colors.border,
    }
}));
