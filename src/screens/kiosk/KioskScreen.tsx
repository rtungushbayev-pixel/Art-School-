import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useKeepAwake } from 'expo-keep-awake';
import { checkinQrValue, clearKioskToken, fetchKioskQr, type KioskQr } from '../../lib/checkin';
import { errorText } from '../../lib/errors';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    scan: 'Отметьтесь на занятии',
    hint: 'Откройте приложение KasteyevSchool → «Сканировать QR» и наведите камеру на код',
    refresh: (s: number) => `Код обновится через ${s} с`,
    offline: 'Нет связи с сервером. Проверьте интернет на планшете.',
    unpaired: 'Планшет отключён администратором.',
    exitTitle: 'Выйти из режима планшета?',
    exitText: 'Чтобы снова показывать QR, понадобится новый код подключения от администратора.',
    cancel: 'Отмена',
    exit: 'Выйти',
  },
  kk: {
    scan: 'Сабаққа белгіленіңіз',
    hint: 'KasteyevSchool қолданбасын ашып → «QR сканерлеу», камераны кодқа бағыттаңыз',
    refresh: (s: number) => `Код ${s} с кейін жаңарады`,
    offline: 'Сервермен байланыс жоқ. Планшеттегі интернетті тексеріңіз.',
    unpaired: 'Планшетті әкімші ажыратты.',
    exitTitle: 'Планшет режимінен шығу керек пе?',
    exitText: 'QR-ды қайта көрсету үшін әкімшіден жаңа қосылу коды қажет болады.',
    cancel: 'Бас тарту',
    exit: 'Шығу',
  },
  en: {
    scan: 'Check in for your class',
    hint: 'Open the KasteyevSchool app → “Scan QR” and point the camera at the code',
    refresh: (s: number) => `Code refreshes in ${s} s`,
    offline: 'No connection to the server. Check the tablet’s internet.',
    unpaired: 'This tablet was disconnected by the administrator.',
    exitTitle: 'Leave tablet mode?',
    exitText: 'To show the QR again you will need a new pairing code from the administrator.',
    cancel: 'Cancel',
    exit: 'Leave',
  },
};

// Экран планшета у входа в филиал: QR, который меняется каждые 30 секунд.
// Экран не гаснет. Выход — долгое нажатие на название филиала.
export function KioskScreen({ deviceToken, onExit }: { deviceToken: string; onExit: () => void }) {
  useKeepAwake();
  const s = useStrings(STRINGS);
  const { width, height } = useWindowDimensions();
  const [qr, setQr] = useState<KioskQr | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchKioskQr(deviceToken);
      setQr(next);
      setSecondsLeft(next.seconds_left);
      setError(null);
    } catch (e) {
      const t = errorText(e) ?? '';
      setError(t.includes('kiosk_not_paired') ? s.unpaired : s.offline);
    }
  }, [deviceToken, s]);

  useEffect(() => {
    load();
  }, [load]);

  // Обратный отсчёт; на нуле — новый код. При ошибке пробуем каждые 10 секунд.
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          load();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!error) return;
    const retry = setInterval(load, 10000);
    return () => clearInterval(retry);
  }, [error, load]);

  const askExit = () => {
    Alert.alert(s.exitTitle, s.exitText, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.exit,
        style: 'destructive',
        onPress: async () => {
          await clearKioskToken();
          onExit();
        },
      },
    ]);
  };

  const size = Math.min(width, height) * 0.62;

  return (
    <View style={styles.container}>
      <Pressable onLongPress={askExit} delayLongPress={3000}>
        <Text style={styles.branch}>{qr?.branch_name ?? ' '}</Text>
      </Pressable>
      <Text style={styles.title}>{s.scan}</Text>
      <View style={[styles.qrBox, { width: size + spacing.lg * 2, height: size + spacing.lg * 2 }]}>
        {qr && !error ? (
          <QRCode value={checkinQrValue(qr.branch_id, qr.code)} size={size} color="#000" backgroundColor="#fff" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
      <Text style={styles.hint}>{s.hint}</Text>
      {qr && !error ? <Text style={styles.timer}>{s.refresh(Math.max(secondsLeft, 0))}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  branch: { fontSize: 28, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.lg },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  error: { color: colors.danger, textAlign: 'center', fontSize: 18, padding: spacing.lg },
  hint: { color: colors.textMuted, textAlign: 'center', fontSize: 16, marginTop: spacing.lg, maxWidth: 520 },
  timer: { color: colors.textMuted, marginTop: spacing.sm },
});
