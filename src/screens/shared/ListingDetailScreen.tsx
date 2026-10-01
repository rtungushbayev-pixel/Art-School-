import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/marketplace';
import { sendPushNotification } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { MarketplaceListing, MarketplaceListingImage, Profile } from '../../types/database';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const SHOP_URL = 'https://kasteyevshop.kz';

const STRINGS = {
  ru: {
    deleteQ: 'Удалить объявление?',
    cancel: 'Отмена',
    delete: 'Удалить',
    notFound: 'Объявление удалено или недоступно',
    loading: 'Загрузка…',
    sold: 'Продано',
    sellerContacts: 'Контакты продавца',
    openShop: 'Открыть kasteyevshop.kz',
    approve: 'Одобрить',
    reject: 'Отклонить',
    unsell: 'Снять с продажи',
    markSold: 'Отметить как продано',
    deleteListing: 'Удалить объявление',
  },
  kk: {
    deleteQ: 'Хабарландыруды жою керек пе?',
    cancel: 'Бас тарту',
    delete: 'Жою',
    notFound: 'Хабарландыру жойылған немесе қолжетімсіз',
    loading: 'Жүктелуде…',
    sold: 'Сатылды',
    sellerContacts: 'Сатушының байланыстары',
    openShop: 'kasteyevshop.kz сайтын ашу',
    approve: 'Мақұлдау',
    reject: 'Қабылдамау',
    unsell: 'Сатудан алу',
    markSold: 'Сатылды деп белгілеу',
    deleteListing: 'Хабарландыруды жою',
  },
  en: {
    deleteQ: 'Delete this listing?',
    cancel: 'Cancel',
    delete: 'Delete',
    notFound: 'This listing has been deleted or is unavailable',
    loading: 'Loading…',
    sold: 'Sold',
    sellerContacts: 'Seller contacts',
    openShop: 'Open kasteyevshop.kz',
    approve: 'Approve',
    reject: 'Reject',
    unsell: 'Remove from sale',
    markSold: 'Mark as sold',
    deleteListing: 'Delete listing',
  },
};

export function ListingDetailScreen() {
  const route = useRoute<RouteProp<NavParamList, 'ListingDetail'>>();
  const { listingId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [images, setImages] = useState<MarketplaceListingImage[]>([]);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('marketplace_listings').select('*').eq('id', listingId).maybeSingle();
    // Нет ошибки и нет строки — объявление удалено или недоступно (например,
    // открыто из старого уведомления). При ошибке сети оставляем «Загрузка…».
    if (!error && !data) setNotFound(true);
    if (!data) return;
    setListing(data as MarketplaceListing);

    const [{ data: imgs }, { data: sellerData }] = await Promise.all([
      supabase.from('marketplace_listing_images').select('*').eq('listing_id', listingId).order('position'),
      supabase.from('profiles').select('*').eq('id', (data as MarketplaceListing).seller_id).single(),
    ]);
    setImages((imgs as MarketplaceListingImage[]) ?? []);
    setSeller(sellerData as Profile);
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isOwner = profile?.id === listing?.seller_id;
  const isStaff = profile?.role === 'staff';

  const moderate = async (status: 'approved' | 'rejected') => {
    if (!profile || !listing) return;
    setBusy(true);
    await supabase
      .from('marketplace_listings')
      .update({ status, moderated_by: profile.id, moderated_at: new Date().toISOString() })
      .eq('id', listingId);
    setBusy(false);
    load();
    sendPushNotification({ event: 'listing_moderated', id: listingId });
  };

  const toggleSold = async () => {
    if (!listing) return;
    setBusy(true);
    await supabase.from('marketplace_listings').update({ sold: !listing.sold }).eq('id', listingId);
    setBusy(false);
    load();
  };

  const onDelete = () => {
    Alert.alert(s.deleteQ, listing?.title, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          await supabase.from('marketplace_listings').delete().eq('id', listingId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!listing) {
    return (
      <Screen>
        <Text style={styles.empty}>{notFound ? s.notFound : s.loading}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {images[0] ? (
        <Image source={{ uri: images[0].image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={styles.headerRow}>
        <Text style={styles.title}>{listing.title}</Text>
        {listing.sold ? (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>{s.sold}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.price}>{formatPrice(listing.price, listing.currency)}</Text>

      <Pressable
        onPress={() => seller && navigation.navigate('UserProfile', { userId: seller.id })}
        style={styles.sellerCard}
      >
        <Avatar uri={seller?.avatar_url} name={seller?.full_name} size={36} />
        <Text style={styles.sellerName}>{seller?.full_name}</Text>
      </Pressable>

      {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

      {listing.contact_info ? (
        <Card>
          <Text style={styles.sectionTitle}>{s.sellerContacts}</Text>
          <Text style={styles.description}>{listing.contact_info}</Text>
        </Card>
      ) : null}

      <Button title={s.openShop} variant="secondary" onPress={() => Linking.openURL(SHOP_URL)} />

      {isStaff && listing.status === 'pending' ? (
        <View style={styles.moderationRow}>
          <View style={styles.moderationButton}>
            <Button title={s.approve} onPress={() => moderate('approved')} loading={busy} />
          </View>
          <View style={styles.moderationButton}>
            <Button title={s.reject} variant="danger" onPress={() => moderate('rejected')} loading={busy} />
          </View>
        </View>
      ) : null}

      {isOwner || isStaff ? (
        <View style={styles.ownerActions}>
          <Button
            title={listing.sold ? s.unsell : s.markSold}
            variant="secondary"
            onPress={toggleSold}
            loading={busy}
          />
          <View style={{ height: spacing.sm }} />
          <Button title={s.deleteListing} variant="danger" onPress={onDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
  imagePlaceholder: { backgroundColor: colors.border },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  soldBadge: { backgroundColor: colors.textMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  soldBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  price: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: spacing.xs, marginBottom: spacing.md },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sellerName: { fontWeight: '600', color: colors.text },
  description: { color: colors.text, lineHeight: 21, marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  moderationRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  moderationButton: { flex: 1 },
  ownerActions: { marginTop: spacing.md, marginBottom: spacing.xl },
});
