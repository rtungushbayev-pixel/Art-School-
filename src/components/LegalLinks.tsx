import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LEGAL_BY_LANG } from '../lib/legal';
import { useLanguage } from '../i18n';
import { colors, spacing } from '../theme/colors';

// Ссылки на соглашение и политику: мелким неярким шрифтом внизу экрана.
// Экран Legal есть в стеке каждой роли и на экранах входа.
export function LegalLinks({ prefix }: { prefix?: string }) {
  const navigation = useNavigation<any>();
  const { lang } = useLanguage();
  const LEGAL = LEGAL_BY_LANG[lang];
  return (
    <View style={styles.wrap}>
      {prefix ? <Text style={styles.text}>{prefix}</Text> : null}
      <Text style={styles.text}>
        <Text onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>{LEGAL.terms.title}</Text>
        {'  ·  '}
        <Text onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>{LEGAL.privacy.title}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, alignItems: 'center' },
  text: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
