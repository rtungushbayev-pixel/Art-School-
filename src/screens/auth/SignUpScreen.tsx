import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth, type SignUpAccountType } from '../../hooks/useAuth';
import { fetchSignupGroups, type SignupGroup } from '../../lib/schedule';
import { checkSignupCode, isValidPhone, normalizePhone } from '../../lib/signupCodes';
import { useStrings } from '../../i18n';
import { colors, radius, spacing } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const ACCOUNT_TYPES: SignUpAccountType[] = ['student', 'parent'];
const MIN_PASSWORD = 8;

const STRINGS = {
  ru: {
    student: 'Ученик',
    parent: 'Родитель',
    staffTitle: 'Регистрация сотрудника',
    imStaff: 'Я сотрудник школы',
    backToStudent: 'Я ученик или родитель',
    fillAll: 'Заполните все поля',
    passwordShort: `Пароль должен быть не короче ${MIN_PASSWORD} символов`,
    badPhone: 'Укажите номер телефона полностью, например +7 701 234 56 78',
    chooseGroup: 'Выберите свою группу',
    badStudentCode: 'Код не подходит. Проверьте код и группу: они должны совпадать с данными, которые выдала школа. Каждый код можно использовать только один раз.',
    badParentCode: 'Код ребёнка не найден, или к ребёнку уже привязано слишком много аккаунтов. Уточните код в школе.',
    badStaffCode: 'Приглашение не найдено или уже использовано. Попросите администрацию выдать новое.',
    checkFailed: 'Не удалось проверить код. Проверьте интернет и попробуйте ещё раз.',
    signUpFailed: 'Не удалось зарегистрироваться',
    confirmEmail: 'Подтвердите почту',
    confirmEmailText: (email: string) =>
      `Мы отправили письмо на ${email}. Откройте ссылку из письма на этом телефоне. Если письма нет, проверьте папку «Спам».`,
    title: 'Регистрация',
    signUpAs: 'Зарегистрироваться как',
    yourFullName: 'Ваше полное имя',
    namePlaceholder: 'Иванов Иван',
    password: 'Пароль',
    passwordHint: `Не короче ${MIN_PASSWORD} символов`,
    phone: 'Номер телефона',
    yourGroup: 'Ваша группа',
    noGroups: 'Группы пока не созданы. Обратитесь в администрацию школы.',
    studentCode: 'Код ученика из школы',
    childCode: 'Код ребёнка из школы',
    staffCode: 'Код приглашения',
    codePlaceholder: 'Например, A1B2C-3D4E5',
    studentHint: 'Код и группу выдаёт школа. Имя возьмётся из списка школы, а расписание вашей группы появится автоматически.',
    parentHint: 'Код ребёнка выдаёт школа. После регистрации вы сразу увидите расписание, успехи и работы ребёнка. Других детей можно добавить в «Мои дети».',
    staffHint: 'Код приглашения выдаёт администрация школы.',
    signUp: 'Зарегистрироваться',
    haveAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
  },
  kk: {
    student: 'Оқушы',
    parent: 'Ата-ана',
    staffTitle: 'Қызметкерді тіркеу',
    imStaff: 'Мен мектеп қызметкерімін',
    backToStudent: 'Мен оқушымын немесе ата-анамын',
    fillAll: 'Барлық өрістерді толтырыңыз',
    passwordShort: `Құпиясөз кемінде ${MIN_PASSWORD} таңбадан тұруы керек`,
    badPhone: 'Телефон нөмірін толық көрсетіңіз, мысалы +7 701 234 56 78',
    chooseGroup: 'Өз тобыңызды таңдаңыз',
    badStudentCode: 'Код сәйкес келмейді. Код пен топты тексеріңіз: олар мектеп берген деректерге сәйкес болуы керек. Әр кодты тек бір рет қолдануға болады.',
    badParentCode: 'Баланың коды табылмады немесе балаға тым көп аккаунт тіркелген. Кодты мектептен нақтылаңыз.',
    badStaffCode: 'Шақыру табылмады немесе бұрын қолданылған. Әкімшіліктен жаңасын сұраңыз.',
    checkFailed: 'Кодты тексеру мүмкін болмады. Интернетті тексеріп, қайталап көріңіз.',
    signUpFailed: 'Тіркелу мүмкін болмады',
    confirmEmail: 'Поштаңызды растаңыз',
    confirmEmailText: (email: string) =>
      `Біз ${email} мекенжайына хат жібердік. Хаттағы сілтемені осы телефонда ашыңыз. Хат келмесе, «Спам» қалтасын тексеріңіз.`,
    title: 'Тіркелу',
    signUpAs: 'Кім ретінде тіркелесіз',
    yourFullName: 'Толық аты-жөніңіз',
    namePlaceholder: 'Асанов Асан',
    password: 'Құпиясөз',
    passwordHint: `Кемінде ${MIN_PASSWORD} таңба`,
    phone: 'Телефон нөмірі',
    yourGroup: 'Сіздің тобыңыз',
    noGroups: 'Топтар әлі құрылмаған. Мектеп әкімшілігіне хабарласыңыз.',
    studentCode: 'Мектеп берген оқушы коды',
    childCode: 'Мектеп берген бала коды',
    staffCode: 'Шақыру коды',
    codePlaceholder: 'Мысалы, A1B2C-3D4E5',
    studentHint: 'Код пен топты мектеп береді. Аты-жөніңіз мектеп тізімінен алынады, ал тобыңыздың кестесі автоматты түрде пайда болады.',
    parentHint: 'Баланың кодын мектеп береді. Тіркелгеннен кейін баланың кестесін, жетістіктері мен жұмыстарын бірден көресіз. Басқа балаларды «Менің балаларым» бөлімінде қосуға болады.',
    staffHint: 'Шақыру кодын мектеп әкімшілігі береді.',
    signUp: 'Тіркелу',
    haveAccount: 'Аккаунтыңыз бар ма?',
    signIn: 'Кіру',
  },
  en: {
    student: 'Student',
    parent: 'Parent',
    staffTitle: 'Staff sign-up',
    imStaff: "I'm school staff",
    backToStudent: "I'm a student or parent",
    fillAll: 'Please fill in all fields',
    passwordShort: `Password must be at least ${MIN_PASSWORD} characters`,
    badPhone: 'Enter your full phone number, for example +7 701 234 56 78',
    chooseGroup: 'Choose your group',
    badStudentCode: 'The code does not match. Check the code and group: they must match what the school gave you. Each code can be used only once.',
    badParentCode: "The child's code was not found, or too many accounts are already linked to this child. Please check the code with the school.",
    badStaffCode: 'Invitation not found or already used. Ask the administration for a new one.',
    checkFailed: 'Could not check the code. Check your internet connection and try again.',
    signUpFailed: 'Could not sign up',
    confirmEmail: 'Confirm your email',
    confirmEmailText: (email: string) =>
      `We sent an email to ${email}. Open the link from the email on this phone. If you don't see it, check your Spam folder.`,
    title: 'Sign up',
    signUpAs: 'Sign up as',
    yourFullName: 'Your full name',
    namePlaceholder: 'John Smith',
    password: 'Password',
    passwordHint: `At least ${MIN_PASSWORD} characters`,
    phone: 'Phone number',
    yourGroup: 'Your group',
    noGroups: 'No groups have been created yet. Please contact the school administration.',
    studentCode: 'Student code from the school',
    childCode: "Child's code from the school",
    staffCode: 'Invitation code',
    codePlaceholder: 'For example, A1B2C-3D4E5',
    studentHint: "The school gives you the code and group. Your name will be taken from the school list, and your group's schedule will appear automatically.",
    parentHint: "The school gives you your child's code. After signing up you will immediately see your child's schedule, progress and artworks. You can add other children in \"My children\".",
    staffHint: 'The invitation code is given by the school administration.',
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
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
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

  const isStudent = accountType === 'student';
  const isStaff = accountType === 'staff';

  const onSubmit = async () => {
    // У ученика имя берётся из списка школы, поэтому поля имени нет.
    if ((!isStudent && !fullName.trim()) || !email.trim() || !password || !phone.trim() || !code.trim()) {
      Alert.alert(s.fillAll);
      return;
    }
    if (isStudent && !groupId) {
      Alert.alert(s.chooseGroup);
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert(s.badPhone);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      Alert.alert(s.passwordShort);
      return;
    }
    setLoading(true);
    try {
      const ok = await checkSignupCode(accountType, code, isStudent ? groupId : null);
      if (!ok) {
        setLoading(false);
        Alert.alert(s.signUpFailed, isStudent ? s.badStudentCode : isStaff ? s.badStaffCode : s.badParentCode);
        return;
      }
    } catch {
      setLoading(false);
      Alert.alert(s.signUpFailed, s.checkFailed);
      return;
    }
    const { error, needsConfirmation } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      accountType,
      groupId: isStudent ? groupId : null,
      code: code.trim(),
      phone: normalizePhone(phone),
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
      <Text style={styles.title}>{isStaff ? s.staffTitle : s.title}</Text>

      {isStaff ? null : (
        <>
          <Text style={styles.label}>{s.signUpAs}</Text>
          <View style={styles.segment}>
            {ACCOUNT_TYPES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setAccountType(value)}
                style={[styles.segmentItem, accountType === value && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, accountType === value && styles.segmentTextActive]}>
                  {value === 'student' ? s.student : s.parent}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {isStudent ? (
        <>
          <Text style={styles.label}>{s.yourGroup}</Text>
          {groupsLoading ? (
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
        </>
      ) : (
        <TextField label={s.yourFullName} value={fullName} onChangeText={setFullName} placeholder={s.namePlaceholder} />
      )}

      <TextField
        label={isStudent ? s.studentCode : isStaff ? s.staffCode : s.childCode}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={s.codePlaceholder}
      />
      <TextField
        label={s.phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+7 701 234 56 78"
        textContentType="telephoneNumber"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField
        label={s.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={s.passwordHint}
      />

      <Text style={styles.hint}>{isStudent ? s.studentHint : isStaff ? s.staffHint : s.parentHint}</Text>

      <Button title={s.signUp} onPress={onSubmit} loading={loading} />

      <Text style={styles.switchType} onPress={() => setAccountType(isStaff ? 'student' : 'staff')}>
        {isStaff ? s.backToStudent : s.imStaff}
      </Text>

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
  switchType: { color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
