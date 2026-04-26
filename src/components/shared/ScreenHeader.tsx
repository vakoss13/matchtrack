import React from 'react';
import { View, Pressable, Animated } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Typography } from './Typography';

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
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<DrawerNavigationProp<any>>();
    
    const scaleAnim = new Animated.Value(1);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.92,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const renderIconButton = (icon: keyof typeof Ionicons.glyphMap, onPress: () => void, size = 28) => (
        <Pressable 
            onPress={onPress} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={({ pressed }) => [
                styles.iconButton,
                { opacity: pressed ? 0.7 : 1 }
            ]}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons name={icon} size={size} color={theme.colors.text} />
            </Animated.View>
        </Pressable>
    );

    return (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <View style={styles.sideContainer}>
                {showBack ? (
                    renderIconButton('arrow-back', onBack || (() => navigation.goBack()))
                ) : showMenu ? (
                    renderIconButton('menu', () => navigation.openDrawer())
                ) : null}
            </View>

            <View style={styles.titleContainer}>
                <Typography variant="h2" align="center" numberOfLines={1}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography 
                        variant="caption" 
                        color={subtitleColor || theme.colors.primary} 
                        style={styles.subtitle}
                        numberOfLines={1}
                    >
                        {subtitle}
                    </Typography>
                )}
            </View>

            <View style={[styles.sideContainer, styles.rightSide]}>
                {rightIcon && renderIconButton(rightIcon, onRightPress || (() => {}), 24)}
            </View>
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing?.md ?? 16,
        paddingBottom: 12,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '20',
    },
    sideContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    rightSide: {
        alignItems: 'flex-end',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    subtitle: {
        marginTop: -2,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    }
}));
