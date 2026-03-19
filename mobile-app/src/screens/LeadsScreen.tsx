import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { mobileGetLeads, mobileUpdateLeadStatus } from '../api/mobile';
import type { Lead } from '../api/types';
import { useAuth } from '../context/AuthContext';

const PIPELINE = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

export function LeadsScreen() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeads = useCallback(async () => {
    if (!token) return;

    setRefreshing(true);
    try {
      const response = await mobileGetLeads(token, 100);
      setLeads(response.leads);
    } catch (error) {
      Alert.alert('Failed to load leads', error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadLeads();
    }, [loadLeads]),
  );

  const leadsByStatus = useMemo(() => {
    return PIPELINE.reduce<Record<string, Lead[]>>((acc, status) => {
      acc[status] = leads.filter((lead) => lead.status === status);
      return acc;
    }, {});
  }, [leads]);

  const moveLead = useCallback(async (lead: Lead, direction: -1 | 1) => {
    if (!token) return;

    const currentIndex = PIPELINE.indexOf(lead.status);
    if (currentIndex < 0) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= PIPELINE.length) return;

    const nextStatus = PIPELINE[nextIndex];

    try {
      await mobileUpdateLeadStatus(token, lead.id, nextStatus);
      setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, status: nextStatus } : item)));
    } catch (error) {
      Alert.alert('Failed to update lead', error instanceof Error ? error.message : 'Unexpected error');
    }
  }, [token]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLeads} tintColor="#4ade80" />}
    >
      <Text style={styles.title}>Pipeline CRM</Text>
      <Text style={styles.subtitle}>Live leads synced from your Trendcast organization.</Text>

      {PIPELINE.map((status) => (
        <View key={status} style={styles.column}>
          <View style={styles.columnHeaderRow}>
            <Text style={styles.columnTitle}>{status}</Text>
            <Text style={styles.columnCount}>{leadsByStatus[status]?.length || 0}</Text>
          </View>

          {leadsByStatus[status]?.length ? leadsByStatus[status].map((lead) => (
            <View key={lead.id} style={styles.card}>
              <Text style={styles.cardName}>{lead.name}</Text>
              <Text style={styles.cardMeta}>{lead.phone || 'No phone'} • {lead.source}</Text>
              <Text style={styles.cardAddress}>{lead.address || 'No address'}</Text>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.moveButton, PIPELINE.indexOf(lead.status) === 0 && styles.disabled]}
                  disabled={PIPELINE.indexOf(lead.status) === 0}
                  onPress={() => moveLead(lead, -1)}
                >
                  <Text style={styles.moveButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.moveButton, PIPELINE.indexOf(lead.status) === PIPELINE.length - 1 && styles.disabled]}
                  disabled={PIPELINE.indexOf(lead.status) === PIPELINE.length - 1}
                  onPress={() => moveLead(lead, 1)}
                >
                  <Text style={styles.moveButtonText}>Forward</Text>
                </Pressable>
              </View>
            </View>
          )) : (
            <Text style={styles.emptyText}>No leads in {status.toLowerCase()}.</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050b14' },
  content: { padding: 20, gap: 12, paddingBottom: 24 },
  title: { color: '#e5edf8', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#96aac4', marginBottom: 6 },
  column: {
    backgroundColor: '#0a1320',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  columnHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  columnTitle: { color: '#4ade80', fontWeight: '700' },
  columnCount: {
    color: '#c9d7e9',
    backgroundColor: '#142235',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
  },
  card: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  cardName: { color: '#e5edf8', fontWeight: '700' },
  cardMeta: { color: '#9db1cb', fontSize: 12 },
  cardAddress: { color: '#b9c9dd', fontSize: 12 },
  actionsRow: { marginTop: 6, flexDirection: 'row', gap: 8 },
  moveButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b3f5e',
    borderRadius: 8,
    paddingVertical: 8,
  },
  moveButtonText: { color: '#d8e4f3', fontWeight: '600' },
  disabled: { opacity: 0.35 },
  emptyText: { color: '#7f93ad', fontSize: 12 },
});
