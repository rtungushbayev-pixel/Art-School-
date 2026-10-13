import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { checkinQrValue, fetchBranchCodes, regenerateCheckinCode, type BranchCode } from '../../lib/checkin';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    intro:
      'Распечатайте QR своего филиала (сделайте снимок экрана) и повесьте у входа. Ученик или родитель сканирует его в приложении: «Расписание» → «Отметиться по QR». Если фото кода разошлось, смените код и повесьте новый.',
    regenerate: 'Сменить код',
    regenerateQ: 'Сменить код филиала?',
    regenerateText: 'Старый QR перестанет работать, нужно будет повесить новый.',
    cancel: 'Отмена',
    change: 'Сменить',
    failed: 'Не удалось',
  },
  kk: {
    intro:
      'Филиалыңыздың QR-ын басып шығарыңыз (экран суретін түсіріңіз) және кіреберіске іліңіз. Оқушы немесе ата-ана оны қолданбада сканерлейді: «Кесте» → «QR арқылы белгілену». Код суреті таралып кетсе, кодты ауыстырыңыз.',
    regenerate: 'Кодты ауыстыру',
    regenerateQ: 'Филиал кодын ауыстыру керек пе?',
    regenerateText: 'Ескі QR жұмыс істемей қалады, жаңасын ілу керек.',
    cancel: 'Бас тарту',
    change: 'Ауыстыру',
    failed: 'Мүмкін болмады',
  },
  en: {
    intro:
      'Print your branch QR (take a screenshot) and put it at the entrance. A student or parent scans it in the app: “Schedule” → “Check in with QR”. If a photo of the code has spread, change the code and put up the new one.',
    regenerate: 'Change code',
    regenerateQ: 'Change the branch code?',
    regenerateText: 'The old QR will stop working; you will need to put up the new one.',
    cancel: 'Cancel',
    change: 'Change',
    failed: 'Failed',
  },
};

// Только для администратора: QR-коды филиалов для отметки у входа.
export function BranchQrScreen() {
  const s = useStrings(STRINGS);
  const [branches, setBranches] = useState<BranchCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBranches(await fetchBranchCodes());
    } catch {
      // Нет сети — оставляем то, что уже показано.
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const regenerate = (branch: BranchCode) => {
    Alert.alert(s.regenerateQ, `${branch.name}. ${s.regenerateText}`, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.change,
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await regenerateCheckinCode(branch.id);
            setBranches((prev) => prev.map((b) => (b.id === branch.id ? { ...b, token } : b)));
          } catch (e) {
            Alert.alert(s.failed, errorText(e));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.intro}>{s.intro}</Text>
      {branches.map((b) => (
        <Card key={b.id}>
          <Text style={styles.name}>{b.name}</Text>
          {b.token ? (
            <View style={styles.qr}>
              <QRCode value={checkinQrValue(b.token)} size={220} backgroundColor={colors.white} color={colors.text} />
            </View>
          ) : null}
          <Button title={s.regenerate} variant="secondary" onPress={() => regenerate(b)} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  qr: { alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.white },
});
