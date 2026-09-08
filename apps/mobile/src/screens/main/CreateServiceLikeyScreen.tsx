import { useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import { api, SERVICE_SUBCATEGORIES, type LikeyTier, type ServiceSubcategory } from "../../lib/api";
import { pickOrCapturePhoto } from "../../lib/pickOrCapturePhoto";
import { colors } from "../../theme/colors";

const TIERS: { value: LikeyTier; label: string }[] = [
  { value: "LIKED", label: "Likey" },
  { value: "FINE", label: "Kinda Likey" },
  { value: "DISLIKED", label: "No Likey" },
];

const COMMENT_MAX = 200;

export default function CreateServiceLikeyScreen({ onDone }: { onDone: () => void }) {
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [subcategory, setSubcategory] = useState<ServiceSubcategory | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<LikeyTier | null>(null);
  const [comment, setComment] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !isSubmitting && name.trim() !== "" && subcategory !== null && tier !== null;

  const pickPhoto = async () => {
    const base64 = await pickOrCapturePhoto();
    if (base64) setPhotoBase64(base64);
  };

  const onSubmit = async () => {
    if (!token || !canSubmit || !subcategory || !tier) return;
    Keyboard.dismiss();
    setError(null);
    setIsSubmitting(true);
    try {
      const { business } = await api.createBusiness(token, {
        name: name.trim(),
        category: "general",
        subcategory,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      await api.createLikey(token, {
        businessId: business.id,
        tier,
        comment: comment.trim() || undefined,
        photoBase64: photoBase64 ?? undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post this recommendation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.section}>Who do you recommend?</Text>
        <TextInput
          style={styles.input}
          placeholder="Business or provider name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.section}>What kind of service?</Text>
        <View style={styles.optionRow}>
          {SERVICE_SUBCATEGORIES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.option, subcategory === s && styles.optionSelected]}
              onPress={() => setSubcategory(s)}
            >
              <Text>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Where (optional)</Text>
        <View style={styles.optionRow}>
          <TextInput
            style={[styles.input, styles.cityInput]}
            placeholder="City"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.stateInput]}
            placeholder="State"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            maxLength={2}
            value={state}
            onChangeText={setState}
          />
        </View>

        <Text style={styles.section}>Contact info (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.section}>How was it?</Text>
        <View style={styles.optionRow}>
          {TIERS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.option, tier === t.value && styles.optionSelected]}
              onPress={() => setTier(t.value)}
            >
              <Text>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Add a note (optional)</Text>
        <TextInput
          style={[styles.input, styles.commentInput]}
          placeholder="What stood out?"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={COMMENT_MAX}
          value={comment}
          onChangeText={setComment}
        />
        <Text style={styles.muted}>
          {comment.length}/{COMMENT_MAX}
        </Text>

        <Text style={styles.section}>Add a photo (optional)</Text>
        {photoBase64 ? (
          <View>
            <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.photoPreview} />
            <Button
              label="Remove photo"
              variant="dangerOutline"
              small
              style={styles.linkButton}
              onPress={() => setPhotoBase64(null)}
            />
          </View>
        ) : (
          <Button label="Choose photo" variant="secondary" small style={styles.linkButton} onPress={pickPhoto} />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={isSubmitting ? "Posting..." : "Post recommendation"}
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  commentInput: { minHeight: 80, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  cityInput: { flex: 2 },
  stateInput: { flex: 1 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  photoPreview: { width: 120, height: 120, borderRadius: 10, marginBottom: 4 },
  submitButton: { marginTop: 24 },
  linkButton: { alignSelf: "flex-start", marginVertical: 8 },
  muted: { color: colors.textMuted },
  error: { color: colors.danger },
});
