import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function HomeScreen() {
  const { user, organization, refreshMe } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trendcast Overview</Text>
      <Text style={styles.body}>Welcome back {user?.name || user?.email}.</Text>

      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Organization</Text>
        <Text style={styles.metricValue}>{organization?.name || 'Unknown org'}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.metricCardSmall}>
          <Text style={styles.metricLabel}>API Credits</Text>
          <Text style={styles.metricValue}>{organization?.credits ?? 0}</Text>
        </View>
        <View style={styles.metricCardSmall}>
          <Text style={styles.metricLabel}>Extracts</Text>
          <Text style={styles.metricValue}>{organization?.extracts ?? 0}</Text>
        </View>
      </View>

      <Pressable style={styles.refreshButton} onPress={refreshMe}>
        <Text style={styles.refreshText}>Refresh Account Data</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050b14', padding: 20, gap: 12 },
  title: { color: '#e5edf8', fontSize: 26, fontWeight: '700' },
  body: { color: '#9cb0c9', fontSize: 16, lineHeight: 23 },
  row: { flexDirection: 'row', gap: 10 },
  metricCard: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  metricCardSmall: {
    flex: 1,
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  metricLabel: { color: '#8fa4bf', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  metricValue: { color: '#e5edf8', fontSize: 18, fontWeight: '700' },
  refreshButton: {
    marginTop: 8,
    borderColor: '#4ade80',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  refreshText: { color: '#4ade80', fontWeight: '700' },
});
