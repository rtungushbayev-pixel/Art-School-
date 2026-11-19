import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { LEGAL_BY_LANG, type LegalDoc } from '../../lib/legal';
import { useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme/colors';

// Пользовательское соглашение или Политика конфиденциальности на языке приложения (текст — lib/legal*).
export function LegalScreen() {
  const route = useRoute<RouteProp<{ Legal: { doc: LegalDoc } }, 'Legal'>>();
  const { lang } = useLanguage();
  const doc = LEGAL_BY_LANG[lang][route.params.doc];
  return (
    <Screen scroll>
      <Text style={styles.title}>{doc.title}</Text>
      <Text style={styles.updated}>{doc.updated}</Text>
      {doc.sections.map((section) => (
        <React.Fragment key={section.title}>
          <Text style={styles.section}>{section.title}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </React.Fragment>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  updated: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.md },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  paragraph: { fontSize: 14, lineHeight: 21, color: colors.text, marginBottom: spacing.sm },
});
