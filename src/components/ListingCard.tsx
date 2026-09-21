import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, shadow, spacing } from '../theme/colors';
import { formatPrice, ListingCardData } from '../lib/marketplace';

interface ListingCardProps {
  listing: ListingCardData;
  onPress?: () => void;
  showModerationBadge?: boolean;
}

export function ListingCard({ listing, onPress, showModerationBadge }: ListingCardProps) {
  const cover = listing.images[0];
  return (
    <View style={styles.shadowWrapper}>
      <Pressable onPress={onPress} style={styles.card}>
        {cover ? (
          <Image source={{ uri: cover.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        {listing.sold ? (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>Продано</Text>
          </View>
        ) : showModerationBadge && listing.status !== 'approved' ? (
          <View style={[styles.badge, listing.status === 'pending' ? styles.badgePending : styles.badgeRejected]}>
            <Text style={styles.badgeText}>{listing.status === 'pending' ? 'На модерации' : 'Отклонено'}</Text>
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          <Text style={styles.price}>{formatPrice(listing.price, listing.currency)}</Text>
          <Text style={styles.seller} numberOfLines={1}>
            {listing.seller?.full_name ?? 'Автор неизвестен'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  imagePlaceholder: { backgroundColor: colors.border },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgePending: { backgroundColor: colors.accent },
  badgeRejected: { backgroundColor: colors.danger },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  soldBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
  },
  soldBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  body: { padding: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 },
  seller: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
