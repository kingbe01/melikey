import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import {
  api,
  MEDIA_TYPES,
  SERVICE_SUBCATEGORIES,
  type LikeyTier,
  type LikeyWithAuthor,
  type MediaType,
  type ServiceSubcategory,
} from "../../lib/api";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { colors } from "../../theme/colors";

const TIERS: { value: LikeyTier; label: string }[] = [
  { value: "LIKED", label: "Likey" },
  { value: "FINE", label: "Kinda Likey" },
  { value: "DISLIKED", label: "No Likey" },
];

const COMMENT_MAX = 200;

// "Copy to my Likeys" — a shared restaurant/entertainment place is reused
// as-is (same real place, so nothing about it is editable here), but a
// General recommendation or a media item isn't deduped, so copying one
// creates your own independent row and lets you edit it first — same
// reasoning as CreateServiceLikeyScreen / CreateMediaLikeyScreen. The
// photo isn't carried over; that's the original poster's, not yours.
export default function CopyLikeyScreen({
  source,
  onDone,
  onCancel,
}: {
  source: LikeyWithAuthor;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();

  const isGeneral = source.business?.category === "general";
  const isMedia = !!source.mediaItem;

  const [draftName, setDraftName] = useState(source.business?.name ?? "");
  const [draftSubcategory, setDraftSubcategory] = useState<ServiceSubcategory | null>(
    source.business?.subcategory ?? null
  );
  const [draftCity, setDraftCity] = useState(source.business?.city ?? "");
  const [draftState, setDraftState] = useState(source.business?.state ?? "");
  const [draftPhone, setDraftPhone] = useState(source.business?.phone ?? "");
  const [draftEmail, setDraftEmail] = useState(source.business?.email ?? "");

  const [draftTitle, setDraftTitle] = useState(source.mediaItem?.title ?? "");
  const [draftType, setDraftType] = useState<MediaType | null>(source.mediaItem?.type ?? null);
  const [draftCreator, setDraftCreator] = useState(source.mediaItem?.creator ?? "");
  const [draftYear, setDraftYear] = useState(source.mediaItem?.year ?? "");

  const [tier, setTier] = useState<LikeyTier>(source.tier);
  const [comment, setComment] = useState(source.comment ?? "");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { pickPhoto: openPhotoPicker, modal: photoPickerModal } = usePhotoPicker();

  const pickPhoto = async () => {
    const base64 = await openPhotoPicker();
    if (base64) setPhotoBase64(base64);
  };

  const canSubmit =
    !isSubmitting &&
    !(isGeneral && (draftName.trim() === "" || draftSubcategory === null)) &&
    !(isMedia && (draftTitle.trim() === "" || draftType === null));

  const onSubmit = async () => {
    if (!token || !canSubmit) return;
    Keyboard.dismiss();
    setError(null);
    setIsSubmitting(true);
    try {
      let businessId: string | undefined;
      let mediaItemId: string | undefined;

      if (source.business) {
        if (isGeneral) {
          const { business } = await api.createBusiness(token, {
            name: draftName.trim(),
            category: "general",
            subcategory: draftSubcategory ?? undefined,
            city: draftCity.trim() || undefined,
            state: draftState.trim() || undefined,
            phone: draftPhone.trim() || undefined,
            email: draftEmail.trim() || undefined,
          });
          businessId = business.id;
        } else {
          businessId = source.business.id;
        }
      } else if (source.mediaItem && draftType) {
        const { mediaItem } = await api.createMediaItem(token, {
          title: draftTitle.trim(),
          type: draftType,
          creator: draftCreator.trim() || undefined,
          year: draftYear.trim() || undefined,
        });
        mediaItemId = mediaItem.id;
      }

      await api.createLikey(token, {
        businessId,
        mediaItemId,
        tier,
        comment: comment.trim() || undefined,
        photoBase64: photoBase64 ?? undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post this Likey");
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
      <TouchableOpacity style={styles.backRow} onPress={onCancel}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {isGeneral ? (
        <>
          <Text style={styles.section}>Who do you recommend?</Text>
          <TextInput style={styles.input} placeholder="Business or provider name" value={draftName} onChangeText={setDraftName} />
          <Text style={styles.sectionSmall}>What kind of service?</Text>
          <View style={styles.optionRow}>
            {SERVICE_SUBCATEGORIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.option, draftSubcategory === s && styles.optionSelected]}
                onPress={() => setDraftSubcategory(s)}
              >
                <Text>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionSmall}>Where (optional)</Text>
          <View style={styles.optionRow}>
            <TextInput style={[styles.input, styles.cityInput]} placeholder="City" value={draftCity} onChangeText={setDraftCity} />
            <TextInput
              style={[styles.input, styles.stateInput]}
              placeholder="State"
              autoCapitalize="characters"
              maxLength={2}
              value={draftState}
              onChangeText={setDraftState}
            />
          </View>
          <Text style={styles.sectionSmall}>Contact info (optional)</Text>
          <TextInput style={styles.input} placeholder="Phone number" keyboardType="phone-pad" value={draftPhone} onChangeText={setDraftPhone} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={draftEmail}
            onChangeText={setDraftEmail}
          />
        </>
      ) : isMedia ? (
        <>
          <Text style={styles.section}>What do you recommend?</Text>
          <TextInput style={styles.input} placeholder="Title" value={draftTitle} onChangeText={setDraftTitle} />
          <Text style={styles.sectionSmall}>What kind?</Text>
          <View style={styles.optionRow}>
            {MEDIA_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.option, draftType === t && styles.optionSelected]} onPress={() => setDraftType(t)}>
                <Text>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionSmall}>Details (optional)</Text>
          <TextInput style={styles.input} placeholder="Author, director, or creator" value={draftCreator} onChangeText={setDraftCreator} />
          <TextInput style={styles.input} placeholder="Year" keyboardType="number-pad" maxLength={10} value={draftYear} onChangeText={setDraftYear} />
        </>
      ) : (
        <>
          <Text style={styles.section}>{source.business?.name}</Text>
          <Text style={styles.hint}>
            {source.business?.category}
            {source.business?.city ? ` · ${source.business.city}` : ""}
          </Text>
        </>
      )}

      <Text style={styles.section}>How was it?</Text>
      <View style={styles.optionRow}>
        {TIERS.map((t) => (
          <TouchableOpacity key={t.value} style={[styles.option, tier === t.value && styles.optionSelected]} onPress={() => setTier(t.value)}>
            <Text>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Add a note (optional)</Text>
      <TextInput
        style={[styles.input, styles.commentInput]}
        placeholder="What stood out?"
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
          <Button label="Remove photo" variant="dangerOutline" small style={styles.linkButton} onPress={() => setPhotoBase64(null)} />
        </View>
      ) : (
        <Button label="Choose photo" variant="secondary" small style={styles.linkButton} onPress={pickPhoto} />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={isSubmitting ? "Posting..." : "Post to my Likeys"}
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
  sectionSmall: { fontSize: 14, fontWeight: "600", marginTop: 12, color: colors.text },
  hint: { color: colors.textMuted, marginTop: 4 },
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
