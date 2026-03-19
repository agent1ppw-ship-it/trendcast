import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LeadsScreen } from '../screens/LeadsScreen';
import { BusinessFinderScreen } from '../screens/BusinessFinderScreen';
import { DirectMailScreen } from '../screens/DirectMailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0b1422' },
        headerTintColor: '#e5edf8',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: '#0b1422', borderTopColor: '#1f2d43' },
        tabBarActiveTintColor: '#4ade80',
        tabBarInactiveTintColor: '#8aa0bd',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Leads: focused ? 'funnel' : 'funnel-outline',
            'Business Finder': focused ? 'business' : 'business-outline',
            'Direct Mail': focused ? 'mail' : 'mail-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };

          return <Ionicons name={iconMap[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Dashboard" component={HomeScreen} />
      <Tabs.Screen name="Leads" component={LeadsScreen} />
      <Tabs.Screen name="Business Finder" component={BusinessFinderScreen} />
      <Tabs.Screen name="Direct Mail" component={DirectMailScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050b14' }}>
        <ActivityIndicator color="#4ade80" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
