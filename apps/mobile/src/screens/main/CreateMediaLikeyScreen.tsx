import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import { api, MEDIA_TYPES, type LikeyTier, type MediaType } from "../../lib/api";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { colors } from "../../theme/colors";

const TIERS: { value: LikeyTier; label: string }[] = [
  { value: "LIKED", label: "Likey" },
  { value: "FINE", label: "Kinda Likey" },
  { value: "DISLIKED", label: "No Likey" },
];

const COMMENT_MAX = 200;

export default function CreateMediaLikeyScreen({ onDone }: { onDone: () => void }) {
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<MediaType | null>(null);
  const [creator, setCreator] = useState("");
  const [year, setYear] = useState("");
  const [tier, setTier] = useState<LikeyTier | null>(null);
  const [comment, setComment] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !isSubmitting && title.trim() !== "" && type !== null && tier !== null;

  const { pickPhoto: openPhotoPicker, modal: photoPickerModal } = usePhotoPicker();

  const pickPhoto = async () => {
    const base64 = await openPhotoPicker();
    if (base64) setPhotoBase64(base64);
  };

  const onSubmit = async () => {
    if (!token || !canSubmit || !type || !tier) return;
    Keyboard.dismiss();
    setError(null);
    setIsSubmitting(true);
    try {
      const { mediaItem } = await api.createMediaItem(token, {
        title: title.trim(),
        type,
        creator: creator.trim() || undefined,
        year: year.trim() || undefined,
      });
      await api.createLikey(token, {
        mediaItemId: mediaItem.id,
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
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
        <TouchableOpacity style={styles.backRow} onPress={onDone}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.section}>What do you recommend?</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.section}>What kind?</Text>
        <View style={styles.optionRow}>
          {MEDIA_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.option, type === t && styles.optionSelected]}
              onPress={() => setType(t)}
            >
              <Text>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Details (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Author, director, or creator"
          placeholderTextColor={colors.textMuted}
          value={creator}
          onChangeText={setCreator}
        />
        <TextInput
          style={styles.input}
          placeholder="Year"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={10}
          value={year}
          onChangeText={setYear}
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
    {photoPickerModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  backText: { color: colors.primary, fontWeight: "600" },
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
