import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ListingCard } from '../../components/ListingCard';
import { fetchApprovedListings, fetchMyListings, ListingCardData } from '../../lib/marketplace';
import { useAuth } from '../../hooks/useAuth';
import { colors, radius, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

export function MarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setListings(scope === 'all' ? await fetchApprovedListings() : await fetchMyListings(profile.id));
    } finally {
      setLoading(false);
    }
  }, [profile, scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.header}>Продажа работ</Text>
      <Text style={styles.subheader}>
        Одобренные работы школа переносит на сайт{' '}
        <Text style={styles.link}>kasteyevshop.kz</Text>
      </Text>

      <Pressable style={styles.createButton} onPress={() => navigation.navigate('CreateListing')}>
        <Text style={styles.createButtonText}>+ Разместить работу</Text>
      </Pressable>

      <View style={styles.scopeRow}>
        <Pressable
          onPress={() => setScope('all')}
          style={[styles.scopeOption, scope === 'all' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'all' && styles.scopeTextActive]}>Все</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('mine')}
          style={[styles.scopeOption, scope === 'mine' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'mine' && styles.scopeTextActive]}>Мои объявления</Text>
        </Pressable>
      </View>

      {listings.length === 0 && !loading ? (
        <Text style={styles.empty}>
          {scope === 'all' ? 'Пока нет работ на продажу' : 'У вас пока нет объявлений'}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {listings.map((listing) => (
          <View key={listing.id} style={styles.gridItem}>
            <ListingCard
              listing={listing}
              showModerationBadge={scope === 'mine'}
              onPress={() => navigation.navigate('ListingDetail', { listingId: listing.id })}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subheader: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
  link: { color: colors.primary, fontWeight: '600' },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createButtonText: { color: colors.white, fontWeight: '700' },
  scopeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  scopeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scopeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scopeText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  scopeTextActive: { color: colors.white },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  gridItem: { width: '48%' },
});
