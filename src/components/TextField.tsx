import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/colors";
import { useRevealFocusedField } from "./Screen";

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({
  label,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  // Поле пароля: глазок справа показывает введённый текст.
  const [revealed, setRevealed] = useState(false);
  const revealFocused = useRevealFocusedField();

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            focused && styles.inputFocused,
            secureTextEntry ? styles.inputWithEye : null,
            style,
          ]}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={(e) => {
            setFocused(true);
            // Переход на другое поле при открытой клавиатуре — докрутить к нему.
            setTimeout(revealFocused, 80);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Скрыть пароль" : "Показать пароль"}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    marginBottom: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWithEye: { paddingRight: 48 },
  eye: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  inputFocused: {
    borderColor: colors.primary,
  },
});
