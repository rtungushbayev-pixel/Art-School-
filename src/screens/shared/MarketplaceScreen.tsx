import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ListingCard } from '../../components/ListingCard';
import { fetchApprovedListings, fetchMyListings, ListingCardData } from '../../lib/marketplace';
import { fetchShopListings, refreshShopIfStale, SHOP_URL, type ShopListing } from '../../lib/shop';
import { useAuth } from '../../hooks/useAuth';
import { useStrings } from '../../i18n';
import { colors, radius, shadow, spacing } from '../../theme/colors';
import type { StaffStackParamList, StudentStackParamList } from '../../navigation/types';

type NavParamList = StudentStackParamList & StaffStackParamList;

const STRINGS = {
  ru: {
    shopNote: 'Одобренные работы школа переносит на сайт',
    postWork: '+ Разместить работу',
    all: 'Все',
    myListings: 'Мои объявления',
    emptyAll: 'Пока нет работ на продажу',
    emptyMine: 'У вас пока нет объявлений',
    site: 'Все объявления на сайте',
    openSite: 'Открыть сайт',
    siteNote: 'Список обновляется раз в неделю. Нажмите на работу, чтобы открыть её на сайте.',
    emptySite: 'Объявления с сайта пока не загружены. Откройте сайт кнопкой выше.',
  },
  kk: {
    shopNote: 'Мақұлданған жұмыстарды мектеп мына сайтқа көшіреді:',
    postWork: '+ Жұмыс орналастыру',
    all: 'Барлығы',
    myListings: 'Менің хабарландыруларым',
    emptyAll: 'Әзірге сатылатын жұмыстар жоқ',
    emptyMine: 'Сізде әзірге хабарландырулар жоқ',
    site: 'Сайттағы барлық хабарландырулар',
    openSite: 'Сайтты ашу',
    siteNote: 'Тізім аптасына бір рет жаңартылады. Жұмысты сайтта ашу үшін басыңыз.',
    emptySite: 'Сайттағы хабарландырулар әлі жүктелмеген. Сайтты жоғарыдағы түймемен ашыңыз.',
  },
  en: {
    shopNote: 'The school moves approved works to the website',
    postWork: '+ List a work',
    all: 'All',
    myListings: 'My listings',
    emptyAll: 'No works for sale yet',
    emptyMine: 'You have no listings yet',
    site: 'All listings on the website',
    openSite: 'Open the website',
    siteNote: 'The list is updated once a week. Tap a work to open it on the website.',
    emptySite: 'Listings from the website are not loaded yet. Open the website with the button above.',
  },
};

export function MarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const { profile } = useAuth();
  const s = useStrings(STRINGS);
  const [scope, setScope] = useState<'all' | 'mine' | 'site'>('all');
  const [shop, setShop] = useState<ShopListing[]>([]);
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (scope === 'site') {
        setShop(await fetchShopListings());
        // Раз в неделю сервер забирает свежие объявления с сайта.
        if (await refreshShopIfStale()) setShop(await fetchShopListings());
      } else {
        setListings(scope === 'all' ? await fetchApprovedListings() : await fetchMyListings(profile.id));
      }
    } catch {
      // Нет сети — оставляем то, что уже показано.
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
      <Text style={styles.subheader}>
        {s.shopNote}{' '}
        <Text style={styles.link}>kasteyevshop.kz</Text>
      </Text>

      <Button title={s.postWork} onPress={() => navigation.navigate('CreateListing')} />
      <View style={{ height: spacing.md }} />

      <View style={styles.scopeRow}>
        <Pressable
          onPress={() => setScope('all')}
          style={[styles.scopeOption, scope === 'all' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'all' && styles.scopeTextActive]}>{s.all}</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('mine')}
          style={[styles.scopeOption, scope === 'mine' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'mine' && styles.scopeTextActive]}>{s.myListings}</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('site')}
          style={[styles.scopeOption, scope === 'site' && styles.scopeOptionActive]}
        >
          <Text style={[styles.scopeText, scope === 'site' && styles.scopeTextActive]}>{s.site}</Text>
        </Pressable>
      </View>

      {scope === 'site' ? (
        <>
          <Button title={s.openSite} variant="secondary" onPress={() => Linking.openURL(SHOP_URL).catch(() => {})} />
          <Text style={styles.siteNote}>{s.siteNote}</Text>
          {shop.length === 0 && !loading ? <Text style={styles.empty}>{s.emptySite}</Text> : null}
          <View style={styles.grid}>
            {shop.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <View style={styles.shopShadow}>
                  <Pressable onPress={() => Linking.openURL(item.url).catch(() => {})} style={styles.shopCard}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.shopImage} contentFit="cover" />
                    ) : (
                      <View style={styles.shopImage} />
                    )}
                    <View style={styles.shopBody}>
                      <Text style={styles.shopTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.price ? <Text style={styles.shopPrice}>{item.price}</Text> : null}
                      <Text style={styles.shopMeta} numberOfLines={1}>
                        {[item.author, item.size].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {scope !== 'site' && listings.length === 0 && !loading ? (
        <Text style={styles.empty}>
          {scope === 'all' ? s.emptyAll : s.emptyMine}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {(scope === 'site' ? [] : listings).map((listing) => (
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
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  siteNote: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 18 },
  shopShadow: { borderRadius: radius.lg, marginBottom: spacing.md, backgroundColor: colors.surface, ...shadow.card },
  shopCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  shopImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  shopBody: { padding: spacing.sm },
  shopTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  shopPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 },
  shopMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
