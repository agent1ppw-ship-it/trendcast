import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  mobileCancelMailCampaign,
  mobileCreateMailCampaign,
  mobileGetDirectMailData,
  mobileSaveSenderProfile,
  mobileSendMailCampaign,
} from '../api/mobile';
import type { Lead, MailCampaignSummary, MailSenderProfile, MailTemplateSummary } from '../api/types';
import { useAuth } from '../context/AuthContext';

const MAX_SELECTABLE_LEADS = 12;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function isSenderProfileComplete(profile: MailSenderProfile) {
  return Boolean(
    (profile.mailFromName.trim() || profile.mailFromCompany.trim()) &&
    profile.mailAddressLine1.trim() &&
    profile.mailCity.trim() &&
    profile.mailState.trim() &&
    profile.mailZip.trim(),
  );
}

export function DirectMailScreen() {
  const { token } = useAuth();
  const [mailMode, setMailMode] = useState<'demo' | 'live'>('demo');
  const [senderProfile, setSenderProfile] = useState<MailSenderProfile>({
    mailFromName: '',
    mailFromCompany: '',
    mailAddressLine1: '',
    mailAddressLine2: '',
    mailCity: '',
    mailState: '',
    mailZip: '',
  });
  const [templates, setTemplates] = useState<MailTemplateSummary[]>([]);
  const [campaigns, setCampaigns] = useState<MailCampaignSummary[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState('Neighborhood Postcard Drop');
  const [postageClass, setPostageClass] = useState<'MARKETING' | 'FIRST_CLASS'>('MARKETING');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await mobileGetDirectMailData(token);
      setMailMode(response.mailMode);
      setSenderProfile(response.senderProfile);
      setTemplates(response.templates);
      setCampaigns(response.campaigns);
      setLeads(response.leads);
      setSelectedTemplateId((current) => current || response.templates[0]?.id || '');
      setSelectedLeadIds((current) => current.filter((id) => response.leads.some((lead) => lead.id === id)).slice(0, MAX_SELECTABLE_LEADS));
    } catch (error) {
      Alert.alert('Direct Mail', error instanceof Error ? error.message : 'Failed to load direct mail data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || templates[0] || null,
    [selectedTemplateId, templates],
  );

  const selectableLeads = useMemo(() => leads.slice(0, 24), [leads]);

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((current) => {
      if (current.includes(leadId)) {
        return current.filter((id) => id !== leadId);
      }

      if (current.length >= MAX_SELECTABLE_LEADS) {
        Alert.alert('Selection limit', `Select up to ${MAX_SELECTABLE_LEADS} leads per mobile campaign draft.`);
        return current;
      }

      return [...current, leadId];
    });
  };

  const saveProfile = async () => {
    if (!token) return;

    setSavingProfile(true);
    try {
      await mobileSaveSenderProfile(token, senderProfile);
      Alert.alert('Saved', 'Sender profile updated.');
    } catch (error) {
      Alert.alert('Sender profile', error instanceof Error ? error.message : 'Failed to save sender profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const createCampaign = async () => {
    if (!token || !selectedTemplate) return;

    setCreatingCampaign(true);
    try {
      await mobileCreateMailCampaign(token, {
        name: campaignName,
        templateId: selectedTemplate.id,
        leadIds: selectedLeadIds,
        postageClass,
      });
      Alert.alert('Campaign created', 'Direct mail draft created successfully.');
      setSelectedLeadIds([]);
      await loadData();
    } catch (error) {
      Alert.alert('Create campaign', error instanceof Error ? error.message : 'Failed to create campaign.');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    if (!token) return;

    setActiveCampaignId(campaignId);
    try {
      const response = await mobileSendMailCampaign(token, campaignId);
      if (response.requiresCheckout && response.checkoutUrl) {
        await Linking.openURL(response.checkoutUrl);
        Alert.alert('Checkout opened', 'Complete payment in the browser to continue sending your campaign.');
      } else if (response.success) {
        Alert.alert('Campaign queued', response.message || 'Direct mail campaign submitted.');
      } else {
        Alert.alert('Send failed', response.error || 'Failed to send direct mail campaign.');
      }
      await loadData();
    } catch (error) {
      Alert.alert('Send campaign', error instanceof Error ? error.message : 'Failed to send campaign.');
    } finally {
      setActiveCampaignId(null);
    }
  };

  const cancelCampaign = async (campaignId: string) => {
    if (!token) return;

    setActiveCampaignId(campaignId);
    try {
      await mobileCancelMailCampaign(token, campaignId);
      await loadData();
    } catch (error) {
      Alert.alert('Cancel campaign', error instanceof Error ? error.message : 'Failed to cancel campaign.');
    } finally {
      setActiveCampaignId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#4ade80" />}
    >
      <Text style={styles.title}>Direct Mail</Text>
      <Text style={styles.subtitle}>Manage sender info, build postcard drafts, and launch campaigns from your phone.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{mailMode === 'live' ? 'Live mail mode' : 'Demo mail mode'}</Text>
        <Text style={styles.summaryText}>
          {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} • {templates.length} template{templates.length === 1 ? '' : 's'} • {leads.length} mail-ready lead{leads.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sender Profile</Text>
        <View style={styles.inputGrid}>
          <TextInput
            value={senderProfile.mailFromName}
            onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailFromName: value }))}
            placeholder="Sender name"
            placeholderTextColor="#6b819e"
            style={styles.input}
          />
          <TextInput
            value={senderProfile.mailFromCompany}
            onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailFromCompany: value }))}
            placeholder="Company"
            placeholderTextColor="#6b819e"
            style={styles.input}
          />
          <TextInput
            value={senderProfile.mailAddressLine1}
            onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailAddressLine1: value }))}
            placeholder="Address line 1"
            placeholderTextColor="#6b819e"
            style={styles.input}
          />
          <TextInput
            value={senderProfile.mailAddressLine2}
            onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailAddressLine2: value }))}
            placeholder="Address line 2"
            placeholderTextColor="#6b819e"
            style={styles.input}
          />
          <TextInput
            value={senderProfile.mailCity}
            onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailCity: value }))}
            placeholder="City"
            placeholderTextColor="#6b819e"
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={senderProfile.mailState}
              onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailState: value }))}
              placeholder="State"
              placeholderTextColor="#6b819e"
              autoCapitalize="characters"
              style={[styles.input, styles.rowInput]}
            />
            <TextInput
              value={senderProfile.mailZip}
              onChangeText={(value) => setSenderProfile((current) => ({ ...current, mailZip: value }))}
              placeholder="ZIP"
              placeholderTextColor="#6b819e"
              keyboardType="number-pad"
              style={[styles.input, styles.rowInput]}
            />
          </View>
        </View>
        <Pressable style={[styles.outlineButton, savingProfile && styles.disabled]} onPress={saveProfile} disabled={savingProfile}>
          <Text style={styles.outlineButtonText}>{savingProfile ? 'Saving...' : 'Save Sender Profile'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Builder</Text>
        <TextInput
          value={campaignName}
          onChangeText={setCampaignName}
          placeholder="Campaign name"
          placeholderTextColor="#6b819e"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Template</Text>
        <View style={styles.chipWrap}>
          {templates.map((template) => {
            const selected = template.id === selectedTemplateId;
            return (
              <Pressable
                key={template.id}
                onPress={() => setSelectedTemplateId(template.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {template.name} • {template.size}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedTemplate && (
          <View style={styles.templatePreview}>
            <Text style={styles.templateTitle}>{selectedTemplate.frontHeadline}</Text>
            <Text style={styles.templateBody}>{selectedTemplate.frontBody}</Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>Postage</Text>
        <View style={styles.row}>
          {(['MARKETING', 'FIRST_CLASS'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setPostageClass(option)}
              style={[styles.rowOption, postageClass === option && styles.rowOptionSelected]}
            >
              <Text style={[styles.rowOptionText, postageClass === option && styles.rowOptionTextSelected]}>
                {option === 'MARKETING' ? 'Marketing Mail' : 'First Class'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Recipients ({selectedLeadIds.length}/{MAX_SELECTABLE_LEADS})</Text>
        <View style={styles.chipWrap}>
          {selectableLeads.map((lead) => {
            const selected = selectedLeadIds.includes(lead.id);
            return (
              <Pressable
                key={lead.id}
                onPress={() => toggleLead(lead.id)}
                style={[styles.leadChip, selected && styles.leadChipSelected]}
              >
                <Text style={[styles.leadChipTitle, selected && styles.chipTextSelected]}>{lead.name}</Text>
                <Text style={[styles.leadChipAddress, selected && styles.chipTextSelected]} numberOfLines={2}>
                  {lead.address || 'No address'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            (!selectedTemplate || selectedLeadIds.length === 0 || !isSenderProfileComplete(senderProfile) || creatingCampaign) && styles.disabled,
          ]}
          onPress={createCampaign}
          disabled={!selectedTemplate || selectedLeadIds.length === 0 || !isSenderProfileComplete(senderProfile) || creatingCampaign}
        >
          <Text style={styles.primaryButtonText}>{creatingCampaign ? 'Creating...' : 'Create Mail Campaign'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Campaigns</Text>
        {campaigns.length === 0 ? (
          <Text style={styles.emptyText}>No direct mail campaigns yet.</Text>
        ) : campaigns.map((campaign) => (
          <View key={campaign.id} style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignName}>{campaign.name}</Text>
              <Text style={styles.campaignStatus}>{campaign.status}</Text>
            </View>
            <Text style={styles.campaignMeta}>{campaign.template.name} • {campaign.template.size} • {formatCurrency(campaign.costCents)}</Text>
            <Text style={styles.campaignMeta}>
              Sent {campaign.sentCount} • Failed {campaign.failedCount} • Orders {campaign.orderCount}
            </Text>

            <View style={styles.actionsRow}>
              {(campaign.status === 'DRAFT' || campaign.status === 'READY_TO_SEND') && (
                <Pressable
                  style={[styles.outlineButtonSmall, activeCampaignId === campaign.id && styles.disabled]}
                  onPress={() => sendCampaign(campaign.id)}
                  disabled={activeCampaignId === campaign.id}
                >
                  <Text style={styles.outlineButtonText}>
                    {activeCampaignId === campaign.id ? 'Working...' : mailMode === 'live' ? 'Checkout / Send' : 'Send'}
                  </Text>
                </Pressable>
              )}
              {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' || campaign.status === 'READY_TO_SEND') && (
                <Pressable
                  style={[styles.dangerButtonSmall, activeCampaignId === campaign.id && styles.disabled]}
                  onPress={() => cancelCampaign(campaign.id)}
                  disabled={activeCampaignId === campaign.id}
                >
                  <Text style={styles.dangerButtonText}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050b14' },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { color: '#e5edf8', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#96aac4', lineHeight: 20 },
  summaryCard: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  summaryTitle: { color: '#4ade80', fontWeight: '700' },
  summaryText: { color: '#c7d6e9', lineHeight: 20 },
  section: {
    backgroundColor: '#0b1422',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  sectionTitle: { color: '#e5edf8', fontSize: 18, fontWeight: '700' },
  inputGrid: { gap: 10 },
  input: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    color: '#e5edf8',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1 },
  fieldLabel: { color: '#b5c6dc', fontWeight: '600', marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#294261',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f1b2b',
  },
  chipSelected: {
    backgroundColor: '#183527',
    borderColor: '#4ade80',
  },
  chipText: { color: '#dce7f5', fontWeight: '600', fontSize: 12 },
  chipTextSelected: { color: '#e9fff2' },
  templatePreview: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24354d',
    backgroundColor: '#101b2b',
    padding: 12,
    gap: 6,
  },
  templateTitle: { color: '#f0f7ff', fontWeight: '700' },
  templateBody: { color: '#b5c6dc', lineHeight: 19 },
  rowOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#294261',
    backgroundColor: '#0f1b2b',
    paddingVertical: 10,
    alignItems: 'center',
  },
  rowOptionSelected: {
    backgroundColor: '#183527',
    borderColor: '#4ade80',
  },
  rowOptionText: { color: '#dce7f5', fontWeight: '600', fontSize: 12 },
  rowOptionTextSelected: { color: '#e9fff2' },
  leadChip: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#24354d',
    backgroundColor: '#0f1b2b',
    padding: 10,
    gap: 4,
  },
  leadChipSelected: {
    backgroundColor: '#183527',
    borderColor: '#4ade80',
  },
  leadChipTitle: { color: '#e5edf8', fontWeight: '700' },
  leadChipAddress: { color: '#aebfd5', fontSize: 12, lineHeight: 17 },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#4ade80',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  primaryButtonText: { color: '#071020', fontWeight: '700' },
  outlineButton: {
    borderColor: '#4ade80',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  outlineButtonSmall: {
    flex: 1,
    borderColor: '#4ade80',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  outlineButtonText: { color: '#4ade80', fontWeight: '700' },
  dangerButtonSmall: {
    flex: 1,
    borderColor: '#d35b75',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#2b1118',
  },
  dangerButtonText: { color: '#ffbfd0', fontWeight: '700' },
  campaignCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24354d',
    backgroundColor: '#101b2b',
    padding: 12,
    gap: 6,
  },
  campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  campaignName: { flex: 1, color: '#e5edf8', fontWeight: '700' },
  campaignStatus: { color: '#4ade80', fontWeight: '700', fontSize: 12 },
  campaignMeta: { color: '#aebfd5', fontSize: 12, lineHeight: 18 },
  actionsRow: { marginTop: 6, flexDirection: 'row', gap: 10 },
  emptyText: { color: '#7f93ad' },
  disabled: { opacity: 0.55 },
});
