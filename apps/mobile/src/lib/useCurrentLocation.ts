import * as Location from "expo-location";
import { useEffect, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to show nearby places.");
        setIsLoading(false);
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({});
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch {
        setError("Couldn't get your current location.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { coords, error, isLoading };
}
