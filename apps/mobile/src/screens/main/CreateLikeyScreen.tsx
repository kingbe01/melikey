import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import {
  api,
  PLACE_SUGGESTION_PREFIX,
  type Business,
  type BusinessCategory,
  type LikeyTier,
} from "../../lib/api";
import { pickOrCapturePhoto } from "../../lib/pickOrCapturePhoto";
import { useCurrentLocation } from "../../lib/useCurrentLocation";
import { colors } from "../../theme/colors";

const TIERS: { value: LikeyTier; label: string }[] = [
  { value: "LIKED", label: "Likey" },
  { value: "FINE", label: "Kinda Likey" },
  { value: "DISLIKED", label: "No Likey" },
];

const CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "entertainment", label: "Entertainment" },
];

const COMMENT_MAX = 200;

export default function CreateLikeyScreen() {
  const { token, user } = useAuth();
  const { coords, error: locationError, isLoading: isLoadingLocation } = useCurrentLocation();

  const [nearby, setNearby] = useState<Business[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  const [mode, setMode] = useState<"select" | "manual">("select");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLocationExpanded, setIsLocationExpanded] = useState(true);
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<BusinessCategory | null>(null);
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");

  const [tier, setTier] = useState<LikeyTier | null>(null);
  const [comment, setComment] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!token || !coords) return;
    setIsLoadingNearby(true);
    api
      .nearbyBusinesses(token, coords.lat, coords.lng, user?.defaultRadiusMiles)
      .then((res) => setNearby(res.businesses))
      .catch(() => setNearby([]))
      .finally(() => setIsLoadingNearby(false));
  }, [token, coords, user?.defaultRadiusMiles]);

  const pickPhoto = async () => {
    const base64 = await pickOrCapturePhoto();
    if (base64) setPhotoBase64(base64);
  };

  const canSubmit =
    !isSubmitting &&
    tier !== null &&
    (mode === "select" ? selectedBusinessId !== null : manualName.trim() !== "" && manualCategory !== null);

  const onSubmit = async () => {
    if (!token || !coords || !tier) return;
    Keyboard.dismiss();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let businessId = selectedBusinessId;
      if (mode === "manual") {
        const { business } = await api.createBusiness(token, {
          name: manualName.trim(),
          category: manualCategory as BusinessCategory,
          city: manualCity.trim() || undefined,
          state: manualState.trim() || undefined,
          latitude: coords.lat,
          longitude: coords.lng,
        });
        businessId = business.id;
      } else if (selectedBusinessId?.startsWith(PLACE_SUGGESTION_PREFIX)) {
        const selected = nearby.find((b) => b.id === selectedBusinessId);
        if (!selected) return;
        const { business } = await api.createBusiness(token, {
          name: selected.name,
          category: selected.category,
          address: selected.address ?? undefined,
          city: selected.city ?? undefined,
          state: selected.state ?? undefined,
          latitude: selected.latitude,
          longitude: selected.longitude,
          externalPlaceId: selected.externalPlaceId,
        });
        businessId = business.id;
      }
      if (!businessId) return;

      await api.createLikey(token, {
        businessId,
        tier,
        comment: comment.trim() || undefined,
        photoBase64: photoBase64 ?? undefined,
      });

      setSubmitSuccess(true);
      setMode("select");
      setSelectedBusinessId(null);
      setIsLocationExpanded(true);
      setManualName("");
      setManualCategory(null);
      setManualCity("");
      setManualState("");
      setTier(null);
      setComment("");
      setPhotoBase64(null);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't post this Likey");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text>Finding nearby places...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{locationError}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Where are you?</Text>
      {!isLocationExpanded ? (
        <View style={styles.row}>
          <Text style={styles.confirmedPlaceName}>
            {mode === "select" ? nearby.find((b) => b.id === selectedBusinessId)?.name : manualName}
          </Text>
          <Button label="Change" variant="secondary" small onPress={() => setIsLocationExpanded(true)} />
        </View>
      ) : mode === "select" ? (
        <>
          {isLoadingNearby ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={nearby}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, selectedBusinessId === item.id && styles.rowSelected]}
                  onPress={() => {
                    setSelectedBusinessId(item.id);
                    setIsLocationExpanded(false);
                  }}
                >
                  <View>
                    <Text>{item.name}</Text>
                    {item.id.startsWith(PLACE_SUGGESTION_PREFIX) ? (
                      <Text style={styles.suggestedTag}>Suggested nearby</Text>
                    ) : null}
                  </View>
                  <Text style={styles.muted}>
                    {item.distanceMiles !== undefined ? `${item.distanceMiles.toFixed(1)} mi` : ""}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.muted}>No logged places near you yet</Text>}
            />
          )}
          <Button
            label="Can't find it? Add a new place"
            variant="secondary"
            small
            style={styles.linkButton}
            onPress={() => setMode("manual")}
          />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Place name"
            value={manualName}
            onChangeText={setManualName}
          />
          <View style={styles.optionRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[styles.option, manualCategory === c.value && styles.optionSelected]}
                onPress={() => setManualCategory(c.value)}
              >
                <Text>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.cityInput]}
              placeholder="City (optional)"
              value={manualCity}
              onChangeText={setManualCity}
            />
            <TextInput
              style={[styles.input, styles.stateInput]}
              placeholder="State"
              autoCapitalize="characters"
              maxLength={2}
              value={manualState}
              onChangeText={setManualState}
            />
          </View>
          {manualName.trim() !== "" && manualCategory !== null ? (
            <Button
              label="Use this place"
              small
              style={styles.linkButton}
              onPress={() => setIsLocationExpanded(false)}
            />
          ) : null}
          <Button
            label="Pick from nearby places instead"
            variant="secondary"
            small
            style={styles.linkButton}
            onPress={() => setMode("select")}
          />
        </>
      )}

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
          <Image
            source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
            style={styles.photoPreview}
          />
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

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      {submitSuccess ? <Text style={styles.success}>Likey posted!</Text> : null}

      <Button
        label={isSubmitting ? "Posting..." : "Post Likey"}
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
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.background },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16, color: colors.text },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  confirmedPlaceName: { fontWeight: "600", color: colors.text },
  suggestedTag: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  commentInput: { minHeight: 80, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", gap: 8 },
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
  success: { color: colors.success },
});
