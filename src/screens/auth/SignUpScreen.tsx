import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { useAuth, type SignUpAccountType } from '../../hooks/useAuth';
import { fetchSignupGroups, type SignupGroup } from '../../lib/schedule';
import { colors, radius, spacing } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const ACCOUNT_TYPES: { value: SignUpAccountType; label: string }[] = [
  { value: 'student', label: 'Ученик' },
  { value: 'parent', label: 'Родитель' },
];

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [accountType, setAccountType] = useState<SignUpAccountType>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groups, setGroups] = useState<SignupGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSignupGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoading(false));
  }, []);

  const isParent = accountType === 'parent';

  const onSubmit = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Пароль должен быть не короче 6 символов');
      return;
    }
    if (groups.length > 0 && !groupId) {
      Alert.alert(isParent ? 'Выберите группу ребёнка' : 'Выберите свою группу');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      accountType,
      groupId,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Не удалось зарегистрироваться', error);
    } else if (needsConfirmation) {
      Alert.alert(
        'Подтвердите почту',
        `Мы отправили письмо на ${email.trim()}. Откройте ссылку из письма на этом телефоне. Если письма нет, проверьте папку «Спам».`
      );
      navigation.navigate('Login');
    }
    // Иначе пользователь уже вошёл, и приложение само откроет главный экран.
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Регистрация</Text>

      <Text style={styles.label}>Зарегистрироваться как</Text>
      <View style={styles.segment}>
        {ACCOUNT_TYPES.map(({ value, label }) => (
          <Pressable
            key={value}
            onPress={() => setAccountType(value)}
            style={[styles.segmentItem, accountType === value && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, accountType === value && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label={isParent ? 'Ваше полное имя' : 'Полное имя'}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Иванов Иван"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField label="Пароль" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

      <Text style={styles.label}>{isParent ? 'Группа, в которой учится ребёнок' : 'Ваша группа'}</Text>
      {groupsLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.groupsLoading} />
      ) : groups.length === 0 ? (
        <Text style={styles.hint}>Группы пока не созданы. Группу назначит администрация школы.</Text>
      ) : (
        <View style={styles.groups}>
          {groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => setGroupId(group.id)}
              style={[styles.groupChip, groupId === group.id && styles.groupChipActive]}
            >
              <Text style={[styles.groupText, groupId === group.id && styles.groupTextActive]}>{group.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        {isParent
          ? 'Вы увидите расписание и сообщения группы. Успехи и работы ребёнка станут доступны, когда администрация привяжет его к вашему профилю.'
          : 'Расписание вашей группы появится автоматически.'}{' '}
        Преподавателей и сотрудников добавляет администрация школы.
      </Text>

      <Button title="Зарегистрироваться" onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Уже есть аккаунт?</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          {' '}
          Войти
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md - 2, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  groupsLoading: { marginBottom: spacing.md },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  groupChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  groupText: { color: colors.text, fontWeight: '600' },
  groupTextActive: { color: colors.white },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
