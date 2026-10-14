import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { errorText } from '../../lib/errors';
import { parseCheckinQr, qrCheckIn, type CheckInResult } from '../../lib/checkin';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    expired: 'Код уже сменился. Отсканируйте QR на планшете ещё раз.',
    hint: 'Наведите камеру на QR-код на планшете у входа в филиал.',
    needCamera: 'Чтобы отметиться, разрешите доступ к камере.',
    allow: 'Разрешить камеру',
    checking: 'Отмечаем…',
    notOurs: 'Это не QR-код школы. Найдите QR у входа в филиал.',
    invalid: 'Код устарел или неверный. Попросите администратора филиала.',
    nothing: 'Сейчас в этом филиале нет вашего занятия. Отметиться можно за час до начала и до конца занятия.',
    done: 'Готово!',
    present: 'Был',
    late: 'Опоздал',
    again: 'Сканировать ещё раз',
    failed: 'Не удалось отметиться',
  },
  kk: {
    expired: 'Код ауысып кетті. Планшеттегі QR-ды қайта сканерлеңіз.',
    hint: 'Камераны филиал кіреберісіндегі QR-кодқа бағыттаңыз.',
    needCamera: 'Белгілену үшін камераға рұқсат беріңіз.',
    allow: 'Камераға рұқсат беру',
    checking: 'Белгілеп жатырмыз…',
    notOurs: 'Бұл мектептің QR-коды емес. Филиал кіреберісіндегі QR-ды табыңыз.',
    invalid: 'Код ескірген немесе қате. Филиал әкімшісінен сұраңыз.',
    nothing: 'Қазір бұл филиалда сіздің сабағыңыз жоқ. Сабақ басталардан бір сағат бұрын және сабақ біткенше белгілене аласыз.',
    done: 'Дайын!',
    present: 'Келді',
    late: 'Кешікті',
    again: 'Қайта сканерлеу',
    failed: 'Белгілену мүмкін болмады',
  },
  en: {
    expired: 'The code has already changed. Scan the QR on the tablet again.',
    hint: 'Point the camera at the QR code at the branch entrance.',
    needCamera: 'Allow camera access to check in.',
    allow: 'Allow camera',
    checking: 'Checking in…',
    notOurs: 'This is not a school QR code. Find the QR at the branch entrance.',
    invalid: 'The code is outdated or wrong. Ask the branch administrator.',
    nothing: 'You have no class at this branch right now. Check-in opens an hour before the class and closes when it ends.',
    done: 'Done!',
    present: 'Here',
    late: 'Late',
    again: 'Scan again',
    failed: 'Could not check in',
  },
};

type State =
  | { kind: 'scanning' }
  | { kind: 'checking' }
  | { kind: 'done'; results: CheckInResult[] }
  | { kind: 'error'; message: string };

// Ученик (или родитель за своих детей) отмечается по QR у входа в филиал.
export function CheckInScreen() {
  const s = useStrings(STRINGS);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ kind: 'scanning' });
  const busy = useRef(false);
  // Камера работает только пока вкладка открыта.
  const focused = useIsFocused();

  const onScanned = async (data: string) => {
    if (busy.current) return;
    busy.current = true;
    const token = parseCheckinQr(data);
    if (!token) {
      setState({ kind: 'error', message: s.notOurs });
      return;
    }
    setState({ kind: 'checking' });
    try {
      const results = await qrCheckIn(token);
      setState(results.length === 0 ? { kind: 'error', message: s.nothing } : { kind: 'done', results });
    } catch (e) {
      const text = errorText(e) ?? '';
      setState({
        kind: 'error',
        message: text.includes('expired_code')
          ? s.expired
          : text.includes('invalid_code')
            ? s.invalid
            : `${s.failed}${text ? `: ${text}` : ''}`,
      });
    }
  };

  const again = () => {
    busy.current = false;
    setState({ kind: 'scanning' });
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen scroll>
        <Text style={styles.hint}>{s.needCamera}</Text>
        <Button title={s.allow} onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {state.kind === 'scanning' ? (
        <>
          <Text style={styles.hint}>{s.hint}</Text>
          <View style={styles.cameraBox}>
            {focused ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => onScanned(data)}
              />
            ) : null}
          </View>
        </>
      ) : null}
      {state.kind === 'checking' ? <Text style={styles.hint}>{s.checking}</Text> : null}
      {state.kind === 'done' ? (
        <>
          <Text style={styles.done}>{s.done}</Text>
          {state.results.map((r, i) => (
            <Card key={`${r.student_name}-${r.group_name}-${i}`}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.name}>{r.student_name}</Text>
                  <Text style={styles.group}>{r.group_name}</Text>
                </View>
                <Text style={[styles.status, { color: r.status === 'late' ? colors.warning : colors.success }]}>
                  {r.status === 'late' ? s.late : s.present}
                </Text>
              </View>
            </Card>
          ))}
        </>
      ) : null}
      {state.kind === 'error' ? <Text style={styles.error}>{state.message}</Text> : null}
      {state.kind === 'done' || state.kind === 'error' ? (
        <Button title={s.again} variant="secondary" onPress={again} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md, textAlign: 'center' },
  cameraBox: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.text },
  done: { fontSize: 24, fontWeight: '800', color: colors.success, textAlign: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  group: { color: colors.textMuted, marginTop: 2 },
  status: { fontSize: 15, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
});
