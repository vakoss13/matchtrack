import React, { useCallback, useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

// Screens
import { TabNavigator } from './TabNavigator';
import { FriendsScreen } from '../screens/FriendsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props: any) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userMeta = user.user_metadata || {};
          let dbProfile = null;

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (data) dbProfile = data;

          setProfile({
            display_name: dbProfile?.display_name || userMeta.full_name || t('common.anonymous'),
            avatar_url: dbProfile?.avatar_url || userMeta.avatar_url || null,
            total_points: dbProfile?.total_points || 0
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    }, [])
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.flexContainer}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* User Stats Card */}
        <View style={styles.statsHeader}>
          <View style={styles.avatarPlaceholder}>
             {profile?.avatar_url ? (
               <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
             ) : (
               <Ionicons name="person" size={40} color={theme.colors.subtext} />
             )}
          </View>
          <Typography bold style={styles.userName}>
            {loading ? '...' : (profile?.display_name || t('common.anonymous'))}
          </Typography>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>
              {loading ? '0' : (profile?.total_points || 0).toLocaleString()} XP
            </Text>
          </View>
        </View>

        {/* Real Navigation Items */}
        <View style={styles.navSection}>
           <DrawerItemList {...props} />
        </View>

      </DrawerContentScrollView>
      
      {/* Footer / Logout with Safe Area Awareness */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
         <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
         </Pressable>
      </View>
    </View>
  );
};

// Minimal Typography for headers inside drawer
const Typography = ({ children, bold, style }: any) => {
  const { theme } = useUnistyles();
  return <Text style={[{ color: theme.colors.text, fontWeight: bold ? '700' : '400' }, style]}>{children}</Text>;
}

export function DrawerNavigator() {
  const { theme } = useUnistyles();
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: '82%', backgroundColor: theme.colors.background },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.subtext,
        drawerLabelStyle: { fontSize: 16, fontWeight: '600' },
        drawerItemStyle: { borderRadius: 12, marginVertical: 4, paddingHorizontal: 4 }
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{
          drawerLabel: t('tabs.home'),
          drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={FriendsScreen} 
        options={{
          drawerLabel: t('drawer.profile'),
          drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Statistics" 
        component={StatsScreen} 
        options={{
          drawerLabel: t('drawer.statistics'),
          drawerIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{
          drawerLabel: t('drawer.settings'),
          drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create((theme) => ({
  flexContainer: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingTop: 0 },
  statsHeader: {
    padding: 30,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarPlaceholder: { 
     width: 80, 
     height: 80, 
     borderRadius: 40, 
     backgroundColor: theme.colors.background, 
     justifyContent: 'center', 
     alignItems: 'center',
     marginBottom: 16,
     borderWidth: 1,
     borderColor: theme.colors.border,
     overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  userName: { fontSize: 18, marginBottom: 8 },
  scoreBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreValue: { color: '#000', fontWeight: '900', fontSize: 14 },

  navSection: { padding: 10 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10, marginHorizontal: 20 },

  section: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: {
    color: theme.colors.subtext,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  leagueItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  leagueName: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  
  footer: { 
     padding: 20, 
     borderTopWidth: 1, 
     borderColor: theme.colors.border,
     paddingBottom: 40
  },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutText: { color: theme.colors.danger, fontWeight: '600' }
}));