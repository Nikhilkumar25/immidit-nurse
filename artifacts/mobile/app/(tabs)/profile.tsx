import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CaseContext';

function StatCard({ value, label, icon, color }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: color + '12', borderColor: color + '30' }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases, profile } = useCases();

  const stats = useMemo(() => {
    const active = cases.filter(c => c.status !== 'closed' && c.status !== 'assigned').length;
    const today = cases.filter(c => {
      const d = new Date(c.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    const closed = cases.filter(c => c.status === 'closed').length;
    return { active, today, closed };
  }, [cases]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
    >
      <View style={[styles.headerSection, { paddingTop: topPad + 16 }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarInitial}>
            {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'KN'}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{profile?.name ?? 'Nurse'}</Text>
        <Text style={[styles.id, { color: colors.mutedForeground }]}>ID: {profile?.id ?? 'N-001'}</Text>

        <View style={[styles.zoneBadge, { backgroundColor: colors.secondary }]}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={[styles.zoneText, { color: colors.primary }]}>{profile?.zone ?? 'Gurugram'}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard value={String(stats.today)} label="Today's Cases" icon="calendar-outline" color="#006D77" />
        <StatCard value={String(stats.active)} label="Active" icon="pulse-outline" color="#D97706" />
        <StatCard value={String(stats.closed)} label="Completed" icon="checkmark-circle-outline" color="#16A34A" />
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoSectionTitle, { color: colors.foreground }]}>Contact Details</Text>
        <InfoRow icon="call-outline" label="Phone" value={profile?.phone ?? '+91 98765 43210'} colors={colors} />
        <InfoRow icon="ribbon-outline" label="Cases Completed" value={String(profile?.casesCompleted ?? 0)} colors={colors} />
        <InfoRow icon="calendar-outline" label="Joined" value={profile?.joinedDate ?? '—'} colors={colors} />
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoSectionTitle, { color: colors.foreground }]}>Zone Coverage</Text>
        <View style={styles.zoneList}>
          {['Sector 54', 'Sector 56', 'Sector 57'].map(z => (
            <View key={z} style={[styles.zoneChip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.zoneChipText, { color: colors.primary }]}>{z}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoSectionTitle, { color: colors.foreground }]}>App Info</Text>
        <InfoRow icon="medkit-outline" label="App" value="immidit Nurse App v1.0" colors={colors} />
        <InfoRow icon="server-outline" label="Pilot Area" value="Gurugram" colors={colors} />
        <InfoRow icon="shield-checkmark-outline" label="Data" value="Encrypted · Auditable" colors={colors} />
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={16} color={colors.mutedForeground} />
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerSection: {
    alignItems: 'center',
    paddingBottom: 24,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitial: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#fff',
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  id: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  zoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },
  infoSectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  infoValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    maxWidth: 200,
    textAlign: 'right',
  },
  zoneList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  zoneChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  zoneChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
