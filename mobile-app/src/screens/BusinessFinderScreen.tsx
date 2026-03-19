import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { mobileCreateLead, mobileGetBusinessSearchStatus, mobileStartBusinessSearch } from '../api/mobile';
import type { BusinessLead } from '../api/types';
import { useAuth } from '../context/AuthContext';

export function BusinessFinderScreen() {
  const { token } = useAuth();
  const [zipCode, setZipCode] = useState('54401');
  const [industry, setIndustry] = useState('Landscaping');
  const [batchSize, setBatchSize] = useState('25');
  const [radiusMiles, setRadiusMiles] = useState('50');
  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState('Idle');
  const [results, setResults] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingLeadId, setAddingLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !jobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await mobileGetBusinessSearchStatus(token, jobId);
        if (status.progress?.phase) setPhase(status.progress.phase);

        if (status.state === 'completed') {
          setResults(status.results || []);
          setLoading(false);
          setJobId(null);
          clearInterval(interval);
        }

        if (status.state === 'failed') {
          setLoading(false);
          setJobId(null);
          clearInterval(interval);
          Alert.alert('Business Finder', status.blockReason || 'Search job failed.');
        }
      } catch (error) {
        setLoading(false);
        setJobId(null);
        clearInterval(interval);
        Alert.alert('Business Finder Error', error instanceof Error ? error.message : 'Unexpected error');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, token]);

  const runSearch = async () => {
    if (!token) return;

    setLoading(true);
    setPhase('Queueing business search...');
    setResults([]);

    try {
      const response = await mobileStartBusinessSearch(token, {
        zipCode,
        industry,
        batchSize: Number(batchSize),
        radiusMiles: Number(radiusMiles),
      });

      setJobId(response.jobId);
    } catch (error) {
      setLoading(false);
      Alert.alert('Search failed', error instanceof Error ? error.message : 'Unexpected error');
    }
  };

  const addToCrm = async (lead: BusinessLead) => {
    if (!token) return;

    setAddingLeadId(lead.id);
    try {
      await mobileCreateLead(token, {
        name: lead.name,
        phone: lead.phone,
        address: lead.address,
        source: 'BUSINESS_SCRAPER_MOBILE',
      });
      Alert.alert('Added', `${lead.name} added to CRM.`);
    } catch (error) {
      Alert.alert('Failed to add lead', error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setAddingLeadId(null);
    }
  };

  const summary = useMemo(() => {
    if (loading) return phase;
    if (results.length > 0) return `Loaded ${results.length} businesses`;
    return 'No results yet';
  }, [loading, phase, results.length]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Business Finder</Text>
      <Text style={styles.subtitle}>Run live local search and push leads to CRM.</Text>

      <View style={styles.gridTwo}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>ZIP</Text>
          <TextInput value={zipCode} onChangeText={setZipCode} style={styles.input} keyboardType="number-pad" />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Batch</Text>
          <TextInput value={batchSize} onChangeText={setBatchSize} style={styles.input} keyboardType="number-pad" />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Industry</Text>
        <TextInput value={industry} onChangeText={setIndustry} style={styles.input} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Radius Miles</Text>
        <TextInput value={radiusMiles} onChangeText={setRadiusMiles} style={styles.input} keyboardType="number-pad" />
      </View>

      <Pressable style={[styles.button, loading && styles.disabled]} onPress={runSearch} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Searching...' : 'Run Search'}</Text>
      </Pressable>

      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>{summary}</Text>
      </View>

      {results.map((lead) => (
        <View key={lead.id} style={styles.leadCard}>
          <Text style={styles.leadName}>{lead.name}</Text>
          <Text style={styles.leadMeta}>{lead.phone || 'No phone'} • {lead.industry}</Text>
          <Text style={styles.leadMeta}>{lead.address}</Text>
          <Pressable
            style={[styles.addButton, addingLeadId === lead.id && styles.disabled]}
            onPress={() => addToCrm(lead)}
            disabled={addingLeadId === lead.id}
          >
            <Text style={styles.addButtonText}>{addingLeadId === lead.id ? 'Adding...' : 'Add to CRM'}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050b14' },
  content: { padding: 20, gap: 12, paddingBottom: 24 },
  title: { color: '#e5edf8', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#96aac4', marginBottom: 4 },
  gridTwo: { flexDirection: 'row', gap: 10 },
  formGroup: { flex: 1, gap: 6 },
  label: { color: '#b5c6dc', fontWeight: '600' },
  input: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    color: '#e5edf8',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#4ade80',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 4,
  },
  buttonText: { color: '#071020', fontWeight: '700' },
  resultCard: {
    marginTop: 8,
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  resultTitle: { color: '#e5edf8', fontWeight: '700' },
  leadCard: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  leadName: { color: '#e5edf8', fontWeight: '700' },
  leadMeta: { color: '#b4c5db', fontSize: 12, lineHeight: 18 },
  addButton: {
    marginTop: 4,
    borderColor: '#4ade80',
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    paddingVertical: 8,
  },
  addButtonText: { color: '#4ade80', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
