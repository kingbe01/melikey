import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import Button from "../../components/Button";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { api } from "../../lib/api";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !isSubmitting && !!email;

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      navigation.navigate("ResetPassword", { email: email.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send reset code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Enter your account email and we'll send you a 6-digit code to reset your password.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? "Sending..." : "Send reset code"}
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
        <Button
          label="Back to log in"
          variant="secondary"
          small
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "600", color: colors.text, textAlign: "center" },
  subtitle: { color: colors.textMuted, textAlign: "center", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  error: { color: colors.danger },
  submitButton: { marginTop: 4 },
  linkButton: { alignSelf: "center", marginTop: 8 },
});
