import { Ionicons } from "@expo/vector-icons";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors } from "../../theme/colors";

export interface PlaceInfo {
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
}

// Apple's Maps Server API only exposes address + coordinates — no phone,
// hours, ratings, or photos (unlike Google Places). "Open in Apple Maps"
// is the path to that richer info, which lives in the consumer Maps app's
// own backend, not the public API.
export default function PlaceDetailView({ place, onBack }: { place: PlaceInfo; onBack: () => void }) {
  const location = place.city && place.state ? `${place.city}, ${place.state}` : place.city || place.state || null;

  const openInAppleMaps = () => {
    const query = encodeURIComponent(place.name);
    Linking.openURL(`https://maps.apple.com/?ll=${place.latitude},${place.longitude}&q=${query}`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker coordinate={{ latitude: place.latitude, longitude: place.longitude }} />
      </MapView>

      <View style={styles.details}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.category}>{place.category}</Text>
        {place.address ? (
          <Text style={styles.address}>{place.address}</Text>
        ) : location ? (
          <Text style={styles.address}>{location}</Text>
        ) : null}

        <TouchableOpacity style={styles.mapsButton} onPress={openInAppleMaps}>
          <Ionicons name="map-outline" size={18} color={colors.surface} />
          <Text style={styles.mapsButtonText}>Open in Apple Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  map: { width: "100%", height: 220 },
  details: { padding: 16, gap: 6 },
  name: { fontSize: 20, fontWeight: "600", color: colors.text },
  category: { color: colors.textMuted, textTransform: "capitalize" },
  address: { fontSize: 15, color: colors.text, marginTop: 4 },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  mapsButtonText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
});
