import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useStrings } from '../i18n';
import { colors, radius, spacing } from '../theme/colors';

export interface ChildHit {
  id: string;
  full_name: string;
  group_id: string;
  student_id: string | null;
  groups: { name: string } | null;
}

const STRINGS = {
  ru: {
    placeholder: 'Поиск ребёнка: фамилия или имя',
    nothing: 'Никого не нашли. Проверьте буквы или поищите по имени.',
    registered: 'зарегистрирован',
    waiting: 'ещё не зарегистрирован',
  },
  kk: {
    placeholder: 'Баланы іздеу: тегі немесе аты',
    nothing: 'Ешкім табылмады. Әріптерді тексеріңіз.',
    registered: 'тіркелген',
    waiting: 'әлі тіркелмеген',
  },
  en: {
    placeholder: 'Find a child: surname or first name',
    nothing: 'No one found. Check the spelling or try the first name.',
    registered: 'signed up',
    waiting: 'not signed up yet',
  },
};

const MIN_LETTERS = 2;

// Символы, которые в фильтре PostgREST что-то значат, из запроса убираем.
function words(query: string): string[] {
  return query
    .replace(/[%_,()*\\]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 4);
}

// Ё и Е в базе могут быть записаны по-разному: на их месте ставим «_»
// (в ilike это «любая одна буква»), тогда «Алена» найдёт и «Алёна».
function pattern(word: string): string {
  return `%${word.replace(/[её]/gi, '_')}%`;
}

// Поиск детей по всем группам, к которым у сотрудника есть доступ
// (администратор — все, преподаватель — свои; ограничивает RLS
// school_roster_manager). Подсказки появляются с двух букв.
export function ChildSearch({ onPick }: { onPick: (hit: ChildHit) => void }) {
  const s = useStrings(STRINGS);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ChildHit[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const parts = words(query);
    if (parts.join('').length < MIN_LETTERS) {
      setHits([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      let request = supabase
        .from('school_roster')
        .select('id, full_name, group_id, student_id, groups ( name )')
        .order('full_name')
        .limit(20);
      for (const w of parts) request = request.ilike('full_name', pattern(w));
      const { data } = await request;
      if (id !== requestId.current) return; // пришёл ответ на старый запрос
      setHits((data as unknown as ChildHit[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (hit: ChildHit) => {
    setQuery('');
    setHits([]);
    onPick(hit);
  };

  const showResults = words(query).join('').length >= MIN_LETTERS;

  return (
    <View style={styles.wrapper}>
      <View style={styles.field}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={s.placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {loading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        {query ? (
          <Pressable hitSlop={8} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {showResults ? (
        <View style={styles.results}>
          {!loading && hits.length === 0 ? <Text style={styles.nothing}>{s.nothing}</Text> : null}
          {hits.map((hit) => (
            <Pressable key={hit.id} onPress={() => pick(hit)} style={styles.hit}>
              <View style={styles.hitText}>
                <Text style={styles.name}>{hit.full_name}</Text>
                <Text style={styles.group} numberOfLines={1}>
                  {hit.groups?.name ?? ''}
                </Text>
              </View>
              <Text style={[styles.status, hit.student_id ? styles.statusDone : null]}>
                {hit.student_id ? s.registered : s.waiting}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, paddingVertical: spacing.sm + 2, color: colors.text, fontSize: 15 },
  results: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  nothing: { color: colors.textMuted, padding: spacing.md, fontSize: 13 },
  hit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hitText: { flex: 1, minWidth: 0 },
  name: { fontWeight: '700', color: colors.text },
  group: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  status: { color: colors.warning, fontSize: 11 },
  statusDone: { color: colors.success },
});
