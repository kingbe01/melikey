import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CreateLikeyScreen from "../screens/main/CreateLikeyScreen";
import HomeFeedScreen from "../screens/main/HomeFeedScreen";
import PeopleScreen from "../screens/main/PeopleScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

export type MainTabParamList = {
  Feed: undefined;
  CreateLikey: undefined;
  People: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={HomeFeedScreen} />
      <Tab.Screen name="CreateLikey" component={CreateLikeyScreen} options={{ title: "Post a Likey" }} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
