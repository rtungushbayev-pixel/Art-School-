import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { linkChildByCode } from '../../lib/signupCodes';
import { errorText } from '../../lib/errors';
import { useStrings } from '../../i18n';
import { colors, spacing } from '../../theme/colors';
import type { ParentStackParamList } from '../../navigation/types';

const STRINGS = {
  ru: {
    hint: 'Введите код ребёнка, который выдала школа. После этого вы увидите его расписание, успехи и работы.',
    code: 'Код ребёнка',
    placeholder: 'Например, A1B2C-3D4E5',
    add: 'Добавить ребёнка',
    enterCode: 'Введите код ребёнка',
    notFound: 'Код не найден. Проверьте его или уточните в школе.',
    tooMany: 'К этому ребёнку уже привязано слишком много аккаунтов. Обратитесь в школу.',
    failed: 'Не получилось',
    added: 'Ребёнок добавлен',
    addedText: 'Если ребёнок ещё не зарегистрировался в приложении, его данные появятся сразу после регистрации.',
  },
  kk: {
    hint: 'Мектеп берген бала кодын енгізіңіз. Осыдан кейін оның кестесін, жетістіктері мен жұмыстарын көресіз.',
    code: 'Бала коды',
    placeholder: 'Мысалы, A1B2C-3D4E5',
    add: 'Баланы қосу',
    enterCode: 'Бала кодын енгізіңіз',
    notFound: 'Код табылмады. Оны тексеріңіз немесе мектептен нақтылаңыз.',
    tooMany: 'Бұл балаға тым көп аккаунт тіркелген. Мектепке хабарласыңыз.',
    failed: 'Сәтсіз аяқталды',
    added: 'Бала қосылды',
    addedText: 'Егер бала қолданбаға әлі тіркелмесе, оның деректері тіркелгеннен кейін бірден пайда болады.',
  },
  en: {
    hint: "Enter the child's code given by the school. You will then see their schedule, progress and artworks.",
    code: "Child's code",
    placeholder: 'For example, A1B2C-3D4E5',
    add: 'Add child',
    enterCode: "Enter the child's code",
    notFound: 'Code not found. Check it or ask the school.',
    tooMany: 'Too many accounts are already linked to this child. Please contact the school.',
    failed: 'Something went wrong',
    added: 'Child added',
    addedText: "If your child hasn't signed up in the app yet, their information will appear as soon as they do.",
  },
};

// Родитель добавляет ребёнка по коду из школы: код подтверждает родство,
// поэтому привязка происходит сразу, без заявки.
export function AddChildScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const s = useStrings(STRINGS);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onAdd = async () => {
    if (!code.trim()) {
      Alert.alert(s.enterCode);
      return;
    }
    setLoading(true);
    try {
      const ok = await linkChildByCode(code.trim());
      if (!ok) {
        Alert.alert(s.failed, s.notFound);
      } else {
        Alert.alert(s.added, s.addedText);
        navigation.goBack();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      Alert.alert(
        s.failed,
        message === 'too_many_parents' ? s.tooMany : message === 'rate_limited' ? errorText(e) : s.notFound
      );
    }
    setLoading(false);
  };

  return (
    <Screen scroll>
      <Text style={styles.hint}>{s.hint}</Text>
      <TextField
        label={s.code}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={s.placeholder}
        autoFocus
      />
      <Button title={s.add} onPress={onAdd} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, marginBottom: spacing.md },
});
