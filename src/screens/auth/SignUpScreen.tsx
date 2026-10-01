import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth, type SignUpAccountType } from '../../hooks/useAuth';
import { fetchSignupGroups, type SignupGroup } from '../../lib/schedule';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const ACCOUNT_TYPES: SignUpAccountType[] = ['student', 'parent'];

const STRINGS = {
  ru: {
    student: 'Ученик',
    parent: 'Родитель',
    fillAll: 'Заполните все поля',
    passwordShort: 'Пароль должен быть не короче 6 символов',
    chooseGroup: 'Выберите свою группу',
    signUpFailed: 'Не удалось зарегистрироваться',
    confirmEmail: 'Подтвердите почту',
    confirmEmailText: (email: string) =>
      `Мы отправили письмо на ${email}. Откройте ссылку из письма на этом телефоне. Если письма нет, проверьте папку «Спам».`,
    title: 'Регистрация',
    signUpAs: 'Зарегистрироваться как',
    yourFullName: 'Ваше полное имя',
    fullName: 'Полное имя',
    namePlaceholder: 'Иванов Иван',
    password: 'Пароль',
    yourGroup: 'Ваша группа',
    noGroups: 'Группы пока не созданы. Группу назначит администрация школы.',
    parentHint: 'После регистрации добавьте ребёнка в Профиль → «Мои дети»: появятся его расписание, успехи и работы.',
    studentHint: 'Расписание вашей группы появится автоматически.',
    staffHint: 'Преподавателей и сотрудников добавляет администрация школы.',
    signUp: 'Зарегистрироваться',
    haveAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
  },
  kk: {
    student: 'Оқушы',
    parent: 'Ата-ана',
    fillAll: 'Барлық өрістерді толтырыңыз',
    passwordShort: 'Құпиясөз кемінде 6 таңбадан тұруы керек',
    chooseGroup: 'Өз тобыңызды таңдаңыз',
    signUpFailed: 'Тіркелу мүмкін болмады',
    confirmEmail: 'Поштаңызды растаңыз',
    confirmEmailText: (email: string) =>
      `Біз ${email} мекенжайына хат жібердік. Хаттағы сілтемені осы телефонда ашыңыз. Хат келмесе, «Спам» қалтасын тексеріңіз.`,
    title: 'Тіркелу',
    signUpAs: 'Кім ретінде тіркелесіз',
    yourFullName: 'Толық аты-жөніңіз',
    fullName: 'Толық аты-жөні',
    namePlaceholder: 'Асанов Асан',
    password: 'Құпиясөз',
    yourGroup: 'Сіздің тобыңыз',
    noGroups: 'Топтар әлі құрылмаған. Топты мектеп әкімшілігі тағайындайды.',
    parentHint: 'Тіркелгеннен кейін баланы Профиль → «Менің балаларым» бөліміне қосыңыз: оның кестесі, жетістіктері мен жұмыстары пайда болады.',
    studentHint: 'Тобыңыздың кестесі автоматты түрде пайда болады.',
    staffHint: 'Мұғалімдер мен қызметкерлерді мектеп әкімшілігі қосады.',
    signUp: 'Тіркелу',
    haveAccount: 'Аккаунтыңыз бар ма?',
    signIn: 'Кіру',
  },
  en: {
    student: 'Student',
    parent: 'Parent',
    fillAll: 'Please fill in all fields',
    passwordShort: 'Password must be at least 6 characters',
    chooseGroup: 'Choose your group',
    signUpFailed: 'Could not sign up',
    confirmEmail: 'Confirm your email',
    confirmEmailText: (email: string) =>
      `We sent an email to ${email}. Open the link from the email on this phone. If you don't see it, check your Spam folder.`,
    title: 'Sign up',
    signUpAs: 'Sign up as',
    yourFullName: 'Your full name',
    fullName: 'Full name',
    namePlaceholder: 'John Smith',
    password: 'Password',
    yourGroup: 'Your group',
    noGroups: 'No groups have been created yet. The school administration will assign your group.',
    parentHint: 'After signing up, add your child in Profile → "My children" to see their schedule, progress and artworks.',
    studentHint: "Your group's schedule will appear automatically.",
    staffHint: 'Teachers and staff are added by the school administration.',
    signUp: 'Sign up',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
};

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const s = useStrings(STRINGS);
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
      Alert.alert(s.fillAll);
      return;
    }
    if (password.length < 6) {
      Alert.alert(s.passwordShort);
      return;
    }
    if (!isParent && groups.length > 0 && !groupId) {
      Alert.alert(s.chooseGroup);
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      accountType,
      // Родитель группу не выбирает: она берётся из групп ребёнка.
      groupId: isParent ? null : groupId,
    });
    setLoading(false);
    if (error) {
      Alert.alert(s.signUpFailed, error);
    } else if (needsConfirmation) {
      Alert.alert(s.confirmEmail, s.confirmEmailText(email.trim()));
      navigation.navigate('Login');
    }
    // Иначе пользователь уже вошёл, и приложение само откроет главный экран.
  };

  return (
    <Screen scroll>
      <LanguageSwitcher compact />
      <Text style={styles.title}>{s.title}</Text>

      <Text style={styles.label}>{s.signUpAs}</Text>
      <View style={styles.segment}>
        {ACCOUNT_TYPES.map((value) => (
          <Pressable
            key={value}
            onPress={() => setAccountType(value)}
            style={[styles.segmentItem, accountType === value && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, accountType === value && styles.segmentTextActive]}>{s[value]}</Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label={isParent ? s.yourFullName : s.fullName}
        value={fullName}
        onChangeText={setFullName}
        placeholder={s.namePlaceholder}
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField label={s.password} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

      {isParent ? null : <Text style={styles.label}>{s.yourGroup}</Text>}
      {isParent ? null : groupsLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.groupsLoading} />
      ) : groups.length === 0 ? (
        <Text style={styles.hint}>{s.noGroups}</Text>
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
          ? s.parentHint
          : s.studentHint}{' '}
        {s.staffHint}
      </Text>

      <Button title={s.signUp} onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{s.haveAccount}</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          {' '}
          {s.signIn}
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
