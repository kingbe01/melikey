import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !isSubmitting && !!email && !!username && password.length >= 8;

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
    <View style={styles.container}>
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Creating account..." : "Sign up"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: colors.background },
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
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonDisabled: { backgroundColor: colors.primaryLight },
  buttonText: { color: colors.surface, fontWeight: "600" },
  link: { color: colors.primary, marginTop: 12, textAlign: "center" },
});
