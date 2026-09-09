import { createNavigationContainerRef } from "@react-navigation/native";
import type { MainStackParamList } from "./MainNavigator";

// A ref to the root NavigationContainer, usable from outside the component
// tree (e.g. a push-notification response listener that lives above it).
// Typed against the (logged-in) main stack — a push notification only ever
// makes sense to navigate for a signed-in user.
export const navigationRef = createNavigationContainerRef<MainStackParamList>();
