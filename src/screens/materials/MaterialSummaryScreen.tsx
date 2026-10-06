import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { errorText } from '../../lib/errors';
import { fetchMaterialUsage, formatQuantity, materialUnitLabel, type MaterialUsageItem } from '../../lib/materials';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';

const STRINGS = {
  ru: {
    intro: 'Сколько материалов выдано преподавателям за период (по дате выдачи).',
    presets: { month: 'Этот месяц', half1: '1 полугодие', half2: '2 полугодие', year: 'Учебный год', custom: 'Свои даты' },
    from: 'С (ГГГГ-ММ-ДД)',
    to: 'По (ГГГГ-ММ-ДД)',
    show: 'Показать',
    badDates: 'Даты в формате 2026-09-01, и «С» не позже «По»',
    empty: 'За этот период ничего не выдано',
    requests: (n: number) => `заявок: ${n}`,
    positions: (n: number) => `Позиций: ${n}`,
    failed: 'Не удалось загрузить сводку',
  },
  kk: {
    intro: 'Кезең ішінде мұғалімдерге қанша материал берілді (берілген күні бойынша).',
    presets: { month: 'Осы ай', half1: '1 жартыжылдық', half2: '2 жартыжылдық', year: 'Оқу жылы', custom: 'Өз күндерім' },
    from: 'Бастап (ЖЖЖЖ-АА-КК)',
    to: 'Дейін (ЖЖЖЖ-АА-КК)',
    show: 'Көрсету',
    badDates: 'Күндер 2026-09-01 пішімінде, «Бастап» «Дейін»-нен кеш болмауы керек',
    empty: 'Бұл кезеңде ештеңе берілмеген',
    requests: (n: number) => `өтінімдер: ${n}`,
    positions: (n: number) => `Позициялар: ${n}`,
    failed: 'Жиынтықты жүктеу мүмкін болмады',
  },
  en: {
    intro: 'How many supplies were issued to teachers during the period (by issue date).',
    presets: { month: 'This month', half1: '1st half-year', half2: '2nd half-year', year: 'School year', custom: 'Custom dates' },
    from: 'From (YYYY-MM-DD)',
    to: 'To (YYYY-MM-DD)',
    show: 'Show',
    badDates: 'Use dates like 2026-09-01; “From” must not be after “To”',
    empty: 'Nothing was issued during this period',
    requests: (n: number) => `requests: ${n}`,
    positions: (n: number) => `Items: ${n}`,
    failed: 'Could not load the summary',
  },
};

type Preset = 'month' | 'half1' | 'half2' | 'year' | 'custom';

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Учебный год: 1 сентября — 31 мая. 1 полугодие: сентябрь—декабрь, 2: январь—май.
function presetRange(preset: Exclude<Preset, 'custom'>, now = new Date()): [string, string] {
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  switch (preset) {
    case 'month':
      return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
    case 'half1':
      return [`${startYear}-09-01`, `${startYear}-12-31`];
    case 'half2':
      return [`${startYear + 1}-01-01`, `${startYear + 1}-05-31`];
    case 'year':
      return [`${startYear}-09-01`, `${startYear + 1}-05-31`];
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function MaterialSummaryScreen() {
  const s = useStrings(STRINGS);
  const [preset, setPreset] = useState<Preset>('year');
  const initial = useMemo(() => presetRange('year'), []);
  const [from, setFrom] = useState(initial[0]);
  const [to, setTo] = useState(initial[1]);
  const [items, setItems] = useState<MaterialUsageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    if (!DATE_RE.test(f) || !DATE_RE.test(t) || f > t || Number.isNaN(Date.parse(f)) || Number.isNaN(Date.parse(t))) {
      setError(s.badDates);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchMaterialUsage(f, t));
    } catch (e) {
      setError(`${s.failed}${errorText(e) ? `: ${errorText(e)}` : ''}`);
    }
    setLoading(false);
  }, [s]);

  useEffect(() => {
    load(initial[0], initial[1]);
  }, [load, initial]);

  const choose = (p: Preset) => {
    setPreset(p);
    if (p === 'custom') return;
    const [f, t] = presetRange(p);
    setFrom(f);
    setTo(t);
    load(f, t);
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={() => load(from, to)}>
      <Text style={styles.intro}>{s.intro}</Text>
      <View style={styles.filterRow}>
        {(['month', 'half1', 'half2', 'year', 'custom'] as Preset[]).map((p) => (
          <Pressable key={p} onPress={() => choose(p)} style={[styles.filterOption, preset === p && styles.filterOptionActive]}>
            <Text style={[styles.filterText, preset === p && styles.filterTextActive]}>{s.presets[p]}</Text>
          </Pressable>
        ))}
      </View>
      {preset === 'custom' ? (
        <>
          <TextField label={s.from} value={from} onChangeText={setFrom} placeholder="2026-09-01" maxLength={10} />
          <TextField label={s.to} value={to} onChangeText={setTo} placeholder="2027-05-31" maxLength={10} />
          <Button title={s.show} onPress={() => load(from.trim(), to.trim())} loading={loading} />
          <View style={{ height: spacing.md }} />
        </>
      ) : (
        <Text style={styles.period}>
          {from} — {to}
        </Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && !loading && items.length === 0 ? <Text style={styles.empty}>{s.empty}</Text> : null}
      {items.length > 0 ? <Text style={styles.count}>{s.positions(items.length)}</Text> : null}

      {items.map((item) => {
        const key = `${item.material}|${item.unit}`;
        const open = expanded === key;
        const unit = materialUnitLabel(item.unit);
        return (
          <Pressable key={key} onPress={() => setExpanded(open ? null : key)}>
            <Card>
              <View style={styles.titleRow}>
                <Text style={styles.material}>{item.material}</Text>
                <Text style={styles.total}>
                  {formatQuantity(item.total)} {unit}
                </Text>
              </View>
              <Text style={styles.meta}>{s.requests(item.requests)}</Text>
              {open
                ? item.teachers.map((t) => (
                    <View key={t.id} style={styles.teacherRow}>
                      <Text style={styles.teacher} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={styles.teacherTotal}>
                        {formatQuantity(t.total)} {unit}
                      </Text>
                    </View>
                  ))
                : null}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: colors.white },
  period: { color: colors.text, fontWeight: '600', marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  count: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  material: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  total: { fontSize: 16, fontWeight: '700', color: colors.primary },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  teacherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  teacher: { flex: 1, color: colors.text },
  teacherTotal: { color: colors.text, fontWeight: '600' },
});
