import React from 'react';
import { View, Pressable, StyleSheet as RNStyleSheet } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    showMenu?: boolean;
    showBack?: boolean;
    onBack?: () => void;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;
    subtitleColor?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ 
    title, 
    subtitle,
    showMenu = true,
    showBack = false,
    onBack,
    rightIcon,
    onRightPress,
    subtitleColor
}) => {
    const { theme } = useUnistyles();
    const navigation = useNavigation<DrawerNavigationProp<any>>();

    return (
        <View style={styles.header}>
            <View style={styles.left}>
                {showBack ? (
                    <Pressable onPress={onBack || (() => navigation.goBack())} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
                    </Pressable>
                ) : showMenu && (
                    <Pressable onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </Pressable>
                )}
            </View>

            <View style={styles.titleContainer}>
                <Typography variant="h2" bold style={styles.title} numberOfLines={1}>{title}</Typography>
                {subtitle && (
                    <Typography variant="caption" style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : {}]} numberOfLines={1}>
                        {subtitle}
                    </Typography>
                )}
            </View>

            <View style={styles.right}>
                {rightIcon && (
                    <Pressable onPress={onRightPress} style={styles.iconButton}>
                        <Ionicons name={rightIcon} size={24} color={theme.colors.text} />
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 10,
        backgroundColor: theme.colors.background,
    },
    left: { width: 44 },
    right: { width: 44, alignItems: 'flex-end' },
    titleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { textAlign: 'center' },
    subtitle: { color: theme.colors.primary, fontSize: 12, marginTop: -2 },
    iconButton: { padding: 4 }
}));
