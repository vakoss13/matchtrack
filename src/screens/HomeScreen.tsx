import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

export const HomeScreen = () => {
  const { theme } = useUnistyles();

  return (
    <ScrollView style={stylesheet.container} contentContainerStyle={stylesheet.content}>
      <StatusBar style="light" />
      
      <View style={stylesheet.header}>
        <Text style={stylesheet.greeting}>MatchTrack</Text>
        <Text style={stylesheet.title}>Upcoming Matches</Text>
      </View>

      {/* MOCK MATCH CARDS */}
      <View style={stylesheet.matchCard}>
        <View style={stylesheet.teamInfo}>
            <View style={stylesheet.teamIcon}><Ionicons name="shield-outline" size={32} color={theme.colors.primary} /></View>
            <Text style={stylesheet.teamName}>Real Madrid</Text>
        </View>
        <View style={stylesheet.matchMeta}>
            <Text style={stylesheet.matchTime}>21:00</Text>
            <View style={stylesheet.liveBadge}>
                <Text style={stylesheet.liveText}>VS</Text>
            </View>
        </View>
        <View style={stylesheet.teamInfo}>
            <View style={stylesheet.teamIcon}><Ionicons name="shield-outline" size={32} color={theme.colors.accent} /></View>
            <Text style={stylesheet.teamName}>Barcelona</Text>
        </View>
      </View>

      <View style={stylesheet.matchCard}>
        <View style={stylesheet.teamInfo}>
            <View style={stylesheet.teamIcon}><Ionicons name="shield-outline" size={32} color="#4ade80" /></View>
            <Text style={stylesheet.teamName}>Liverpool</Text>
        </View>
        <View style={stylesheet.matchMeta}>
            <Text style={stylesheet.matchTime}>22:30</Text>
            <View style={stylesheet.liveBadge}>
                <Text style={stylesheet.liveText}>VS</Text>
            </View>
        </View>
        <View style={stylesheet.teamInfo}>
            <View style={stylesheet.teamIcon}><Ionicons name="shield-outline" size={32} color="#f87171" /></View>
            <Text style={stylesheet.teamName}>Man City</Text>
        </View>
      </View>

      <Pressable style={stylesheet.ctaButton}>
        <Text style={stylesheet.ctaText}>View All Matches</Text>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.background} />
      </Pressable>
    </ScrollView>
  );
};

const stylesheet = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.h1,
    fontWeight: '900',
    color: theme.colors.text,
  },
  matchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  teamInfo: {
    alignItems: 'center',
    width: '35%',
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  teamName: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  matchMeta: {
    alignItems: 'center',
  },
  matchTime: {
    fontSize: theme.typography.h3,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  liveBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.subtext,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  ctaText: {
    color: theme.colors.background,
    fontSize: theme.typography.body,
    fontWeight: '800',
  }
}));
