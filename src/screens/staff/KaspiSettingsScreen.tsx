import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { fetchPaymentLinks, savePaymentLinks, type PaymentLinks } from '../../lib/payments';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    intro:
      'Вставьте ссылку на оплату из приложения Kaspi Pay (вида https://pay.kaspi.kz/pay/…). Если у филиала своя касса, укажите её ссылку у филиала; иначе используется общая.',
    general: 'Общая ссылка школы',
    branch: (name: string) => `Филиал ${name} (необязательно)`,
    save: 'Сохранить',
    saved: 'Сохранено',
    bad: 'Ссылка должна начинаться с https://',
    failed: 'Не удалось сохранить',
  },
  kk: {
    intro:
      'Kaspi Pay қолданбасынан төлем сілтемесін қойыңыз (https://pay.kaspi.kz/pay/… түрінде). Филиалдың өз кассасы болса, оның сілтемесін көрсетіңіз; әйтпесе жалпы сілтеме қолданылады.',
    general: 'Мектептің жалпы сілтемесі',
    branch: (name: string) => `${name} филиалы (міндетті емес)`,
    save: 'Сақтау',
    saved: 'Сақталды',
    bad: 'Сілтеме https:// деп басталуы керек',
    failed: 'Сақтау мүмкін болмады',
  },
  en: {
    intro:
      'Paste the payment link from the Kaspi Pay app (like https://pay.kaspi.kz/pay/…). If a branch has its own till, set its link for that branch; otherwise the general one is used.',
    general: 'School general link',
    branch: (name: string) => `Branch ${name} (optional)`,
    save: 'Save',
    saved: 'Saved',
    bad: 'The link must start with https://',
    failed: 'Could not save',
  },
};

const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);

// Только для администратора: ссылки на оплату в кассы Kaspi Pay.
export function KaspiSettingsScreen() {
  const s = useStrings(STRINGS);
  const navigation = useNavigation();
  const [links, setLinks] = useState<PaymentLinks | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPaymentLinks().then(setLinks).catch(() => {});
  }, []);

  if (!links) return null;

  const onSave = async () => {
    const next: PaymentLinks = {
      general: clean(links.general),
      branches: links.branches.map((b) => ({ ...b, url: clean(b.url) })),
    };
    const all = [next.general, ...next.branches.map((b) => b.url)].filter(Boolean) as string[];
    if (all.some((u) => !u.startsWith('https://'))) {
      Alert.alert(s.bad);
      return;
    }
    setSaving(true);
    try {
      await savePaymentLinks(next);
      Alert.alert(s.saved);
      navigation.goBack();
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    }
    setSaving(false);
  };

  return (
    <Screen scroll>
      <Text style={styles.intro}>{s.intro}</Text>
      <TextField
        label={s.general}
        value={links.general ?? ''}
        onChangeText={(v) => setLinks({ ...links, general: v })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://pay.kaspi.kz/pay/..."
      />
      {links.branches.map((b) => (
        <TextField
          key={b.id}
          label={s.branch(b.name)}
          value={b.url ?? ''}
          onChangeText={(v) =>
            setLinks({ ...links, branches: links.branches.map((x) => (x.id === b.id ? { ...x, url: v } : x)) })
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      ))}
      <Button title={s.save} onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
});
