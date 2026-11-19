import React, { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { fetchBranches } from '../../lib/materials';
import {
  createKioskLink,
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
      'У входа в филиал стоит планшет с QR, который меняется каждые 30 секунд: фото кода быстро устаревает. Чтобы подключить планшет, отправьте ссылку руководителю филиала, например на почту. Он откроет письмо на планшете с установленным приложением и нажмёт ссылку.',
    connect: 'Отправить ссылку для планшета',
    linkSubject: (branch: string) => `Подключение планшета QR, филиал ${branch}`,
    linkText: (branch: string, url: string, code: string) =>
      `Подключение планшета с QR для отметки учеников, филиал ${branch}.\n\n` +
      `1. Установите на планшет приложение KasteyevSchool.\n` +
      `2. Откройте это письмо на планшете и нажмите ссылку:\n${url}\n` +
      `3. В приложении нажмите «Подключить». На планшете появится QR филиала.\n\n` +
      `Если ссылка не открыла приложение: на экране входа удерживайте логотип 3 секунды и введите код ${code}.\n` +
      `Ссылка действует 7 дней и подключает один планшет.`,
    tablets: (n: number) => (n === 0 ? 'Планшетов нет' : `Планшетов: ${n}`),
    online: 'на связи',
    lastSeen: (t: string) => `был на связи ${t}`,
    waiting: (until: string) => `ссылка отправлена, ждёт подключения до ${until}`,
    disconnect: 'Отключить',
    disconnectQ: 'Отключить планшет?',
    disconnectText: 'Он перестанет показывать QR, а неиспользованная ссылка перестанет работать. Для повторного подключения понадобится новая ссылка.',
    reset: 'Сбросить коды филиала',
    resetQ: 'Сбросить коды филиала?',
    resetText: 'Все текущие QR этого филиала сразу перестанут работать. Планшеты продолжат работать с новыми кодами.',
    cancel: 'Отмена',
    failed: 'Не получилось',
  },
  kk: {
    intro:
      'Филиал кіреберісінде әр 30 секунд сайын өзгеретін QR бар планшет тұрады: кодтың суреті тез ескіреді. Планшетті қосу үшін филиал басшысына сілтеме жіберіңіз, мысалы поштаға. Ол хатты қолданба орнатылған планшетте ашып, сілтемені басады.',
    connect: 'Планшетке сілтеме жіберу',
    linkSubject: (branch: string) => `QR планшетін қосу, ${branch} филиалы`,
    linkText: (branch: string, url: string, code: string) =>
      `Оқушыларды белгілейтін QR планшетін қосу, ${branch} филиалы.\n\n` +
      `1. Планшетке KasteyevSchool қолданбасын орнатыңыз.\n` +
      `2. Осы хатты планшетте ашып, сілтемені басыңыз:\n${url}\n` +
      `3. Қолданбада «Қосу» түймесін басыңыз. Планшетте филиал QR-ы шығады.\n\n` +
      `Сілтеме қолданбаны ашпаса: кіру бетінде логотипті 3 секунд басып тұрып, ${code} кодын енгізіңіз.\n` +
      `Сілтеме 7 күн жарамды және бір планшетті қосады.`,
    tablets: (n: number) => (n === 0 ? 'Планшет жоқ' : `Планшеттер: ${n}`),
    online: 'байланыста',
    lastSeen: (t: string) => `соңғы байланыс ${t}`,
    waiting: (until: string) => `сілтеме жіберілді, ${until} дейін қосылуды күтуде`,
    disconnect: 'Ажырату',
    disconnectQ: 'Планшетті ажырату керек пе?',
    disconnectText: 'Ол QR көрсетуді тоқтатады, ал қолданылмаған сілтеме жұмыс істемей қалады. Қайта қосу үшін жаңа сілтеме қажет.',
    reset: 'Филиал кодтарын жаңарту',
    resetQ: 'Филиал кодтарын жаңарту керек пе?',
    resetText: 'Осы филиалдың барлық ағымдағы QR-лары бірден жұмыс істемей қалады. Планшеттер жаңа кодтармен жұмыс істей береді.',
    cancel: 'Бас тарту',
    failed: 'Болмады',
  },
  en: {
    intro:
      'A tablet at the branch entrance shows a QR that changes every 30 seconds, so a photo of the code quickly expires. To connect a tablet, send a link to the branch head, for example by email. They open the email on a tablet with the app installed and tap the link.',
    connect: 'Send a link for the tablet',
    linkSubject: (branch: string) => `Connecting the QR tablet, ${branch} branch`,
    linkText: (branch: string, url: string, code: string) =>
      `Connecting the tablet that shows the check-in QR, ${branch} branch.\n\n` +
      `1. Install the KasteyevSchool app on the tablet.\n` +
      `2. Open this email on the tablet and tap the link:\n${url}\n` +
      `3. In the app, tap “Connect”. The branch QR will appear on the tablet.\n\n` +
      `If the link did not open the app: on the sign-in screen, hold the logo for 3 seconds and enter the code ${code}.\n` +
      `The link works for 7 days and connects one tablet.`,
    tablets: (n: number) => (n === 0 ? 'No tablets' : `Tablets: ${n}`),
    online: 'online',
    lastSeen: (t: string) => `last seen ${t}`,
    waiting: (until: string) => `link sent, waiting to connect until ${until}`,
    disconnect: 'Disconnect',
    disconnectQ: 'Disconnect this tablet?',
    disconnectText: 'It will stop showing the QR, and an unused link stops working. Reconnecting will need a new link.',
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
      const { code, url } = await createKioskLink(branch.id);
      load();
      await Share.share(
        { title: s.linkSubject(branch.name), message: s.linkText(branch.name, url, code) },
        { subject: s.linkSubject(branch.name), dialogTitle: s.connect }
      );
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
        return (
          <Card key={b.id}>
            <Text style={styles.name}>{b.name}</Text>
            <Text style={styles.meta}>{s.tablets(list.filter((k) => k.paired_at).length)}</Text>
            {list.map((k) => {
              const online = k.last_seen_at && now - Date.parse(k.last_seen_at) < 3 * 60 * 1000;
              return (
                <View key={k.id} style={styles.kioskRow}>
                  <Text style={[styles.kioskStatus, online ? styles.online : null]}>
                    {k.paired_at ? (online ? `● ${s.online}` : s.lastSeen(timeAgo(k.last_seen_at))) : s.waiting(timeAgo(k.pairing_expires_at))}
                  </Text>
                  <Text style={styles.disconnect} onPress={() => disconnect(k)}>
                    {s.disconnect}
                  </Text>
                </View>
              );
            })}
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
  reset: { color: colors.textMuted, textAlign: 'center', fontSize: 12, marginTop: spacing.md },
});
