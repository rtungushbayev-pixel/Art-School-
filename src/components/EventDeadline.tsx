import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { daysUntil, eventDeadline, formatEventDate, type SchoolEvent } from '../lib/events';
import { localISODate } from '../lib/attendance';
import { useStrings } from '../i18n';
import { colors, paint, radius, spacing } from '../theme/colors';

const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const KK_MONTHS = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ruDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

const STRINGS = {
  ru: {
    months: RU_MONTHS,
    deadline: 'Дедлайн',
    worksUntil: (d: string) => `Приём работ до ${d}`,
    signupUntil: (d: string) => `Запись до ${d}`,
    left: (n: number) => (n === 0 ? 'Сегодня последний день!' : n === 1 ? 'Остался 1 день' : `Осталось ${ruDays(n)}`),
    closed: 'Приём закрыт',
  },
  kk: {
    months: KK_MONTHS,
    deadline: 'Мерзімі',
    worksUntil: (d: string) => `Жұмыстар ${d} дейін қабылданады`,
    signupUntil: (d: string) => `${d} дейін жазылу`,
    left: (n: number) => (n === 0 ? 'Бүгін соңғы күн!' : `${n} күн қалды`),
    closed: 'Қабылдау жабылды',
  },
  en: {
    months: EN_MONTHS,
    deadline: 'Deadline',
    worksUntil: (d: string) => `Submissions until ${d}`,
    signupUntil: (d: string) => `Sign-up until ${d}`,
    left: (n: number) => (n === 0 ? 'Today is the last day!' : n === 1 ? '1 day left' : `${n} days left`),
    closed: 'Closed',
  },
};

// Работы сдают на конкурсы и выставки, на мастер-класс — только записываются.
function takesWorks(e: SchoolEvent): boolean {
  return e.kind === 'competition' || e.kind === 'exhibition';
}

function tone(daysLeft: number) {
  if (daysLeft < 0) return { color: colors.textMuted, bg: 'rgba(0, 0, 0, 0.05)' };
  if (daysLeft <= 3) return { color: paint.coral, bg: 'rgba(228, 102, 79, 0.12)' };
  return { color: paint.ochre, bg: 'rgba(217, 164, 65, 0.14)' };
}

// Крупный «календарный листок» с датой дедлайна — ставится справа от названия.
export function DeadlineBadge({ event }: { event: SchoolEvent }) {
  const s = useStrings(STRINGS);
  const deadline = eventDeadline(event);
  const left = daysUntil(deadline, localISODate(new Date()));
  const t = tone(left);
  const [, m, d] = deadline.split('-');
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.color }]}>
      <Text style={[styles.badgeCaption, { color: t.color }]} numberOfLines={1}>
        {s.deadline}
      </Text>
      <Text style={[styles.badgeDay, { color: t.color }]}>{Number(d)}</Text>
      <Text style={[styles.badgeMonth, { color: t.color }]}>{s.months[Number(m) - 1]}</Text>
    </View>
  );
}

// Строка под названием: до какого числа принимают работы и сколько осталось.
export function DeadlineLine({ event }: { event: SchoolEvent }) {
  const s = useStrings(STRINGS);
  const deadline = eventDeadline(event);
  const left = daysUntil(deadline, localISODate(new Date()));
  const t = tone(left);
  const date = formatEventDate(deadline);
  return (
    <View style={styles.line}>
      <Text style={[styles.lineMain, { color: left < 0 ? colors.textMuted : colors.text }]}>
        {takesWorks(event) ? s.worksUntil(date) : s.signupUntil(date)}
      </Text>
      <Text style={[styles.lineLeft, { color: t.color }]}>{left < 0 ? s.closed : s.left(left)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 76,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badgeCaption: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  badgeDay: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  badgeMonth: { fontSize: 13, fontWeight: '700' },
  line: { marginTop: spacing.xs },
  lineMain: { fontSize: 14, fontWeight: '600' },
  lineLeft: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
