import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { colors } from "../../theme/colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation, route }: Props) {
  const { signup } = useAuth();
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !isSubmitting && !!email && !!username && password.length >= 8 && hasAgreedToTerms;

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(email.trim(), username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Image source={require("../../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Sign up</Text>
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
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setHasAgreedToTerms((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={hasAgreedToTerms ? "checkbox" : "square-outline"}
            size={20}
            color={hasAgreedToTerms ? colors.primary : colors.textMuted}
          />
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(`${API_URL}/terms`)}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(`${API_URL}/privacy`)}>
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSubmitting ? "Creating account..." : "Sign up"}
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
        <Button
          label="Already have an account? Log in"
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
  linkButton: { alignSelf: "center", marginTop: 8 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  termsText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  termsLink: { color: colors.primary, fontWeight: "600" },
});
