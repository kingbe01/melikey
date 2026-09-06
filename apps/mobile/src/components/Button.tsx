import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

export type ButtonVariant = "primary" | "secondary" | "danger" | "dangerOutline";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Single source of truth for every tappable action in the app — no more
// plain colored Text standing in for a button. Pick the variant that
// matches intent: primary for the main action, secondary for a neutral/
// cancel action, danger for a destructive one, dangerOutline for a
// lighter-weight destructive action (e.g. "Remove photo") that shouldn't
// compete visually with a real "Delete" button on the same screen.
export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  small,
  fullWidth,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        small && styles.small,
        fullWidth && styles.fullWidth,
        v.container,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.indicatorColor} />
      ) : (
        <Text style={[styles.text, small && styles.smallText, v.text]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  small: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, minWidth: 0 },
  fullWidth: { width: "100%" },
  text: { fontWeight: "600", fontSize: 15 },
  smallText: { fontSize: 13 },
  disabled: { opacity: 0.5 },
});

const VARIANTS: Record<ButtonVariant, { container: ViewStyle; text: { color: string }; indicatorColor: string }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.surface },
    indicatorColor: colors.surface,
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.text },
    indicatorColor: colors.text,
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: colors.surface },
    indicatorColor: colors.surface,
  },
  dangerOutline: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
    text: { color: colors.danger },
    indicatorColor: colors.danger,
  },
};
