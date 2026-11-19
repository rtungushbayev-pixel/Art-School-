import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  // Меняется — экран прокручивается к началу (нажатие на значок вкладки).
  scrollToTopSignal?: number;
  children: React.ReactNode;
}

// Отступ над клавиатурой для поля, в котором печатают.
const FIELD_MARGIN = 24;

// TextField сообщает экрану, что фокус перешёл на другое поле при открытой клавиатуре.
const FocusContext = createContext<() => void>(() => {});
export const useRevealFocusedField = () => useContext(FocusContext);

export function Screen({ scroll, refreshing, onRefresh, scrollToTopSignal, style, children, ...props }: ScreenProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollToTopSignal) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollToTopSignal]);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const revealFocused = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput() as {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    } | null;
    const scrollNode = scrollRef.current;
    if (top === null || !input?.measureInWindow || !scrollNode) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + FIELD_MARGIN - top;
      if (overlap > 0) scrollNode.scrollTo({ y: scrollY.current + overlap, animated: true });
    });
  }, []);

  // Формы: когда открывается клавиатура, поле ввода прокручивается так,
  // чтобы его было видно (на Android экран сам не сжимается).
  useEffect(() => {
    if (!scroll) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      keyboardTop.current = e.endCoordinates.screenY;
      // Даём разметке обновить отступ, потом докручиваем к полю.
      setTimeout(revealFocused, Platform.OS === 'ios' ? 50 : 120);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scroll, revealFocused]);

  if (scroll) {
    return (
      <FocusContext.Provider value={revealFocused}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={32}
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
            }}
            contentContainerStyle={[
              styles.scrollContent,
              style,
              keyboardHeight ? { paddingBottom: keyboardHeight + spacing.md } : null,
            ]}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              ) : undefined
            }
            {...props}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </FocusContext.Provider>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.content, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.md },
  scrollContent: { padding: spacing.md, flexGrow: 1 },
});
