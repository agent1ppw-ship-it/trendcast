import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function SettingsScreen() {
  const { user, organization, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email || 'Unknown'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Organization</Text>
        <Text style={styles.value}>{organization?.name || 'Unknown org'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Plan</Text>
        <Text style={styles.value}>{organization?.tier || 'N/A'}</Text>
      </View>

      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050b14', padding: 20, gap: 10 },
  title: { color: '#e5edf8', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  card: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  label: { color: '#8fa4bf', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { color: '#e5edf8', fontSize: 16, fontWeight: '600' },
  button: {
    marginTop: 18,
    borderColor: '#c43f5a',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#2a1017',
  },
  buttonText: { color: '#ffb8c7', fontWeight: '700' },
});
