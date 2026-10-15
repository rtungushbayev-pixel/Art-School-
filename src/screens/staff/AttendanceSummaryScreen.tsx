import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { errorText } from '../../lib/errors';
import { isValidRange, PERIOD_PRESETS, presetRange, type PeriodPreset } from '../../lib/periods';
import {
  attendanceRate,
  fetchAttendanceSummary,
  type AttendanceSummary,
  type Counts,
} from '../../lib/attendanceSummary';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';

type View_ = 'branches' | 'groups' | 'absentees';

const STRINGS = {
  ru: {
    intro: 'Посещаемость по отметкам преподавателей и терминала за период.',
    presets: { month: 'Этот месяц', half1: '1 полугодие', half2: '2 полугодие', year: 'Учебный год', custom: 'Свои даты' },
    views: { branches: 'Филиалы', groups: 'Группы', absentees: 'Чаще пропускают' },
    from: 'С (ГГГГ-ММ-ДД)',
    to: 'По (ГГГГ-ММ-ДД)',
    show: 'Показать',
    badDates: 'Даты в формате 2026-09-01, и «С» не позже «По»',
    empty: 'За этот период отметок нет',
    failed: 'Не удалось загрузить сводку',
    noBranch: 'Филиал не указан',
    overall: 'Посещаемость',
    line: (c: Counts) => `был ${c.present} · опоздал ${c.late} · нет ${c.absent} · уваж. ${c.excused}`,
    absences: (n: number) => `пропусков: ${n}`,
  },
  kk: {
    intro: 'Кезеңдегі мұғалімдер мен терминал белгілері бойынша қатысу.',
    presets: { month: 'Осы ай', half1: '1 жартыжылдық', half2: '2 жартыжылдық', year: 'Оқу жылы', custom: 'Өз күндерім' },
    views: { branches: 'Филиалдар', groups: 'Топтар', absentees: 'Жиі келмейтіндер' },
    from: 'Бастап (ЖЖЖЖ-АА-КК)',
    to: 'Дейін (ЖЖЖЖ-АА-КК)',
    show: 'Көрсету',
    badDates: 'Күндер 2026-09-01 пішімінде, «Бастап» «Дейін»-нен кеш болмауы керек',
    empty: 'Бұл кезеңде белгілер жоқ',
    failed: 'Жиынтықты жүктеу мүмкін болмады',
    noBranch: 'Филиал көрсетілмеген',
    overall: 'Қатысу',
    line: (c: Counts) => `келді ${c.present} · кешікті ${c.late} · жоқ ${c.absent} · себепті ${c.excused}`,
    absences: (n: number) => `жіберілген: ${n}`,
  },
  en: {
    intro: 'Attendance from teacher and terminal check-ins for the period.',
    presets: { month: 'This month', half1: '1st half-year', half2: '2nd half-year', year: 'School year', custom: 'Custom dates' },
    views: { branches: 'Branches', groups: 'Groups', absentees: 'Most absences' },
    from: 'From (YYYY-MM-DD)',
    to: 'To (YYYY-MM-DD)',
    show: 'Show',
    badDates: 'Use dates like 2026-09-01; “From” must not be after “To”',
    empty: 'No check-ins during this period',
    failed: 'Could not load the summary',
    noBranch: 'No branch set',
    overall: 'Attendance',
    line: (c: Counts) => `here ${c.present} · late ${c.late} · absent ${c.absent} · excused ${c.excused}`,
    absences: (n: number) => `absences: ${n}`,
  },
};

function rateColor(rate: number) {
  return rate >= 85 ? colors.success : rate >= 70 ? colors.warning : colors.danger;
}

export function AttendanceSummaryScreen() {
  const s = useStrings(STRINGS);
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const initial = useMemo(() => presetRange('month'), []);
  const [from, setFrom] = useState(initial[0]);
  const [to, setTo] = useState(initial[1]);
  const [view, setView] = useState<View_>('branches');
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (f: string, t: string) => {
      if (!isValidRange(f, t)) {
        setError(s.badDates);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setSummary(await fetchAttendanceSummary(f, t, s.noBranch));
      } catch (e) {
        setError(`${s.failed}${errorText(e) ? `: ${errorText(e)}` : ''}`);
      }
      setLoading(false);
    },
    [s]
  );

  useEffect(() => {
    load(initial[0], initial[1]);
  }, [load, initial]);

  const choose = (p: PeriodPreset) => {
    setPreset(p);
    if (p === 'custom') return;
    const [f, t] = presetRange(p);
    setFrom(f);
    setTo(t);
    load(f, t);
  };

  const chip = (key: string, label: string, active: boolean, onPress: () => void) => (
    <Pressable key={key} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const rate = (c: Counts) => {
    const r = attendanceRate(c);
    return <Text style={[styles.rate, { color: rateColor(r) }]}>{r}%</Text>;
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={() => load(from, to)}>
      <Text style={styles.intro}>{s.intro}</Text>
      <View style={styles.row}>{PERIOD_PRESETS.map((p) => chip(p, s.presets[p], preset === p, () => choose(p)))}</View>
      {preset === 'custom' ? (
        <>
          <TextField label={s.from} value={from} onChangeText={setFrom} placeholder="2026-09-01" maxLength={10} />
          <TextField label={s.to} value={to} onChangeText={setTo} placeholder="2026-12-31" maxLength={10} />
          <Button title={s.show} onPress={() => load(from.trim(), to.trim())} loading={loading} />
          <View style={{ height: spacing.md }} />
        </>
      ) : (
        <Text style={styles.period}>
          {from} — {to}
        </Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && !loading && summary && summary.totals.total === 0 ? <Text style={styles.empty}>{s.empty}</Text> : null}

      {summary && summary.totals.total > 0 ? (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{s.overall}</Text>
              {rate(summary.totals)}
            </View>
            <Text style={styles.meta}>{s.line(summary.totals)}</Text>
          </Card>
          <View style={styles.row}>
            {(['branches', 'groups', 'absentees'] as View_[]).map((v) =>
              chip(v, s.views[v], view === v, () => {
                setView(v);
                setExpanded(null);
              })
            )}
          </View>

          {view === 'branches'
            ? summary.branches.map((b) => {
                const open = expanded === b.id;
                return (
                  <Pressable key={b.id} onPress={() => setExpanded(open ? null : b.id)}>
                    <Card>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>{b.name}</Text>
                        {rate(b)}
                      </View>
                      <Text style={styles.meta}>{s.line(b)}</Text>
                      {open
                        ? b.groups.map((g) => (
                            <View key={g.id} style={styles.subRow}>
                              <Text style={styles.subName} numberOfLines={1}>
                                {g.name}
                              </Text>
                              <Text style={styles.subMeta}>{s.absences(g.absent)}</Text>
                              {rate(g)}
                            </View>
                          ))
                        : null}
                    </Card>
                  </Pressable>
                );
              })
            : null}

          {view === 'groups'
            ? summary.groups.map((g) => {
                const open = expanded === g.id;
                return (
                  <Pressable key={g.id} onPress={() => setExpanded(open ? null : g.id)}>
                    <Card>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>{g.name}</Text>
                        {rate(g)}
                      </View>
                      <Text style={styles.meta}>
                        {g.branchName} · {s.line(g)}
                      </Text>
                      {open
                        ? g.students.map((st) => (
                            <View key={st.id} style={styles.subRow}>
                              <Text style={styles.subName} numberOfLines={1}>
                                {st.name}
                              </Text>
                              <Text style={styles.subMeta}>{s.absences(st.absent)}</Text>
                              {rate(st)}
                            </View>
                          ))
                        : null}
                    </Card>
                  </Pressable>
                );
              })
            : null}

          {view === 'absentees'
            ? summary.absentees.map((st) => (
                <Card key={st.id}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{st.name}</Text>
                    <Text style={[styles.rate, { color: colors.danger }]}>{st.absent}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {st.groupName} · {s.line(st)}
                  </Text>
                </Card>
              ))
            : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  period: { color: colors.text, fontWeight: '600', marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  rate: { fontSize: 18, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  subName: { flex: 1, color: colors.text },
  subMeta: { color: colors.textMuted, fontSize: 12 },
});
