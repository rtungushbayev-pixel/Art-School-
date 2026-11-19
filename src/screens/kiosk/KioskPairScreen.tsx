import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { pairKiosk } from '../../lib/checkin';
import { errorText } from '../../lib/errors';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    title: 'Режим планшета',
    text: 'Этот планшет будет показывать QR филиала у входа. Попросите администратора открыть «QR-коды филиалов» → «Подключить планшет» и введите код подключения.',
    code: 'Код подключения',
    connect: 'Подключить',
    bad: 'Код неверный или устарел. Попросите у администратора новый.',
    failed: 'Не удалось подключить',
    back: 'Назад ко входу',
  },
  kk: {
    title: 'Планшет режимі',
    text: 'Бұл планшет кіреберісте филиал QR-ын көрсетеді. Әкімшіден «Филиалдардың QR-кодтары» → «Планшетті қосу» ашуды сұраңыз да, қосылу кодын енгізіңіз.',
    code: 'Қосылу коды',
    connect: 'Қосу',
    bad: 'Код қате немесе ескірген. Әкімшіден жаңасын сұраңыз.',
    failed: 'Қосу мүмкін болмады',
    back: 'Кіруге оралу',
  },
  en: {
    title: 'Tablet mode',
    text: 'This tablet will show the branch QR at the entrance. Ask the administrator to open “Branch QR codes” → “Connect a tablet” and enter the pairing code.',
    code: 'Pairing code',
    connect: 'Connect',
    bad: 'The code is wrong or expired. Ask the administrator for a new one.',
    failed: 'Could not connect',
    back: 'Back to sign-in',
  },
};

export function KioskPairScreen({ onPaired, onBack }: { onPaired: () => void; onBack: () => void }) {
  const s = useStrings(STRINGS);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await pairKiosk(code);
      onPaired();
    } catch (e) {
      const t = errorText(e) ?? '';
      Alert.alert(s.failed, t.includes('invalid_pairing_code') ? s.bad : t);
    }
    setBusy(false);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.text}>{s.text}</Text>
      <TextField
        label={s.code}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="AB12CD34"
      />
      <Button title={s.connect} onPress={connect} loading={busy} />
      <Text style={styles.back} onPress={onBack}>
        {s.back}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  text: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  back: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
});
