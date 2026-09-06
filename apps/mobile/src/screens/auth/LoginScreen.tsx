import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !isSubmitting && !!email && !!password;

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require("../../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Log in</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? "Logging in..." : "Log in"}
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
        <View style={styles.linkRow}>
          <Button label="Forgot password?" variant="secondary" small onPress={() => navigation.navigate("ForgotPassword")} />
          <Button label="Need an account? Sign up" variant="secondary" small onPress={() => navigation.navigate("Signup")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  logo: { width: 220, height: 126, alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 12, color: colors.text, textAlign: "center" },
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
  linkRow: { gap: 8, marginTop: 8, alignItems: "center" },
});
