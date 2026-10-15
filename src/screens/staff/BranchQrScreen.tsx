import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { fetchBranches } from '../../lib/materials';
import {
  createKioskPairing,
  deleteKiosk,
  fetchKiosks,
  regenerateCheckinCode,
  type BranchKiosk,
} from '../../lib/checkin';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { Branch } from '../../types/database';

const STRINGS = {
  ru: {
    intro:
      'У входа в филиал стоит планшет с QR, который меняется каждые 30 секунд: фото кода быстро устаревает. Чтобы подключить планшет, установите на него приложение, на экране входа нажмите «Режим планшета» и введите код подключения отсюда.',
    connect: 'Подключить планшет',
    pairingCode: 'Код подключения',
    pairingValid: 'Действует 15 минут. Введите его на планшете.',
    tablets: (n: number) => (n === 0 ? 'Планшетов нет' : `Планшетов: ${n}`),
    online: 'на связи',
    lastSeen: (t: string) => `был на связи ${t}`,
    waiting: 'ждёт подключения',
    disconnect: 'Отключить',
    disconnectQ: 'Отключить планшет?',
    disconnectText: 'Он перестанет показывать QR. Для повторного подключения понадобится новый код.',
    reset: 'Сбросить коды филиала',
    resetQ: 'Сбросить коды филиала?',
    resetText: 'Все текущие QR этого филиала сразу перестанут работать. Планшеты продолжат работать с новыми кодами.',
    cancel: 'Отмена',
    failed: 'Не получилось',
  },
  kk: {
    intro:
      'Филиал кіреберісінде әр 30 секунд сайын өзгеретін QR бар планшет тұрады: кодтың суреті тез ескіреді. Планшетті қосу үшін оған қолданбаны орнатыңыз, кіру бетінде «Планшет режимі» түймесін басып, осы жердегі қосылу кодын енгізіңіз.',
    connect: 'Планшетті қосу',
    pairingCode: 'Қосылу коды',
    pairingValid: '15 минут жарамды. Оны планшетте енгізіңіз.',
    tablets: (n: number) => (n === 0 ? 'Планшет жоқ' : `Планшеттер: ${n}`),
    online: 'байланыста',
    lastSeen: (t: string) => `соңғы байланыс ${t}`,
    waiting: 'қосылуды күтуде',
    disconnect: 'Ажырату',
    disconnectQ: 'Планшетті ажырату керек пе?',
    disconnectText: 'Ол QR көрсетуді тоқтатады. Қайта қосу үшін жаңа код қажет.',
    reset: 'Филиал кодтарын жаңарту',
    resetQ: 'Филиал кодтарын жаңарту керек пе?',
    resetText: 'Осы филиалдың барлық ағымдағы QR-лары бірден жұмыс істемей қалады. Планшеттер жаңа кодтармен жұмыс істей береді.',
    cancel: 'Бас тарту',
    failed: 'Болмады',
  },
  en: {
    intro:
      'A tablet at the branch entrance shows a QR that changes every 30 seconds, so a photo of the code quickly expires. To connect a tablet, install the app on it, tap “Tablet mode” on the sign-in screen and enter the pairing code from here.',
    connect: 'Connect a tablet',
    pairingCode: 'Pairing code',
    pairingValid: 'Valid for 15 minutes. Enter it on the tablet.',
    tablets: (n: number) => (n === 0 ? 'No tablets' : `Tablets: ${n}`),
    online: 'online',
    lastSeen: (t: string) => `last seen ${t}`,
    waiting: 'waiting to connect',
    disconnect: 'Disconnect',
    disconnectQ: 'Disconnect this tablet?',
    disconnectText: 'It will stop showing the QR. Reconnecting will need a new code.',
    reset: 'Reset branch codes',
    resetQ: 'Reset branch codes?',
    resetText: 'All current QR codes of this branch stop working at once. Tablets keep working with new codes.',
    cancel: 'Cancel',
    failed: 'Failed',
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Только для администратора: планшеты с динамическим QR у входа в филиалы.
export function BranchQrScreen() {
  const s = useStrings(STRINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [kiosks, setKiosks] = useState<BranchKiosk[]>([]);
  const [pairing, setPairing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, k] = await Promise.all([fetchBranches(), fetchKiosks()]);
      setBranches(b);
      setKiosks(k);
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

  const connect = async (branch: Branch) => {
    try {
      const code = await createKioskPairing(branch.id);
      setPairing((prev) => ({ ...prev, [branch.id]: code }));
      load();
    } catch (e) {
      Alert.alert(s.failed, errorText(e));
    }
  };

  const disconnect = (kiosk: BranchKiosk) => {
    Alert.alert(s.disconnectQ, s.disconnectText, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.disconnect,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteKiosk(kiosk.id);
            load();
          } catch (e) {
            Alert.alert(s.failed, errorText(e));
          }
        },
      },
    ]);
  };

  const reset = (branch: Branch) => {
    Alert.alert(s.resetQ, `${branch.name}. ${s.resetText}`, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.reset,
        style: 'destructive',
        onPress: async () => {
          try {
            await regenerateCheckinCode(branch.id);
          } catch (e) {
            Alert.alert(s.failed, errorText(e));
          }
        },
      },
    ]);
  };

  const now = Date.now();

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Text style={styles.intro}>{s.intro}</Text>
      {branches.map((b) => {
        const list = kiosks.filter((k) => k.branch_id === b.id && (k.paired_at || (k.pairing_expires_at && Date.parse(k.pairing_expires_at) > now)));
        const code = pairing[b.id];
        return (
          <Card key={b.id}>
            <Text style={styles.name}>{b.name}</Text>
            <Text style={styles.meta}>{s.tablets(list.filter((k) => k.paired_at).length)}</Text>
            {list.map((k) => {
              const online = k.last_seen_at && now - Date.parse(k.last_seen_at) < 3 * 60 * 1000;
              return (
                <View key={k.id} style={styles.kioskRow}>
                  <Text style={[styles.kioskStatus, online ? styles.online : null]}>
                    {k.paired_at ? (online ? `● ${s.online}` : s.lastSeen(timeAgo(k.last_seen_at))) : s.waiting}
                  </Text>
                  <Text style={styles.disconnect} onPress={() => disconnect(k)}>
                    {s.disconnect}
                  </Text>
                </View>
              );
            })}
            {code ? (
              <View style={styles.pairing}>
                <Text style={styles.meta}>{s.pairingCode}</Text>
                <Text style={styles.pairingCode} selectable>
                  {code}
                </Text>
                <Text style={styles.meta}>{s.pairingValid}</Text>
              </View>
            ) : null}
            <View style={{ height: spacing.sm }} />
            <Button title={s.connect} onPress={() => connect(b)} />
            <Text style={styles.reset} onPress={() => reset(b)}>
              {s.reset}
            </Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  kioskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  kioskStatus: { color: colors.textMuted },
  online: { color: colors.success, fontWeight: '600' },
  disconnect: { color: colors.danger, fontWeight: '600' },
  pairing: { alignItems: 'center', marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: 12 },
  pairingCode: { fontSize: 34, fontWeight: '800', letterSpacing: 6, color: colors.primary, marginVertical: spacing.xs },
  reset: { color: colors.textMuted, textAlign: 'center', fontSize: 12, marginTop: spacing.md },
});
