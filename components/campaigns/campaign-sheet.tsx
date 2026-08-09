import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PairedBars } from '@/components/charts/paired-bars';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DateInput, isValidDate } from '@/components/ui/date-input';
import { TextField } from '@/components/ui/form-field';
import { Meter } from '@/components/ui/meter';
import { AssigneePicker, OptionPicker } from '@/components/ui/option-picker';
import { Section } from '@/components/ui/section';
import { StatStrip } from '@/components/ui/stat-strip';
import { AppText } from '@/components/ui/text';
import { CAMPAIGN_STATUSES, CHANNELS } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useCampaign, useCreateCampaign, useDeleteCampaign, useUpdateCampaign } from '@/hooks/use-campaigns';
import { useProjectTeam } from '@/hooks/use-team';
import { campaignCtr, campaignPacing } from '@/lib/derive';
import { formatCurrency, formatNumber, formatPercent, todayKey } from '@/lib/format';
import type { Campaign, CampaignStatus, Channel } from '@/types/models';

interface CampaignSheetProps {
  projectId: string;
  visible: boolean;
  campaign: Campaign | null;
  onClose: () => void;
}

interface FormState {
  name: string;
  channel: Channel;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: string;
  spent: string;
  impressions: string;
  clicks: string;
  conversions: string;
  owner: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  name: '',
  channel: 'Paid',
  status: 'Scheduled',
  startDate: todayKey(),
  endDate: todayKey(),
  budget: '',
  spent: '0',
  impressions: '0',
  clicks: '0',
  conversions: '0',
  owner: '',
  notes: '',
});

const numeric = (value: string) => (value.trim().length === 0 ? 0 : Number(value));
const isNumeric = (value: string) => value.trim().length === 0 || Number.isFinite(Number(value));

export function CampaignSheet({ projectId, visible, campaign, onClose }: CampaignSheetProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const createCampaign = useCreateCampaign(projectId);
  const updateCampaign = useUpdateCampaign(projectId);
  const deleteCampaign = useDeleteCampaign(projectId);
  const { data: team } = useProjectTeam(projectId);
  const { data: detail } = useCampaign(campaign?.id);

  useEffect(() => {
    if (!visible) return;
    setTouched(false);
    setForm(
      campaign
        ? {
            name: campaign.name,
            channel: campaign.channel,
            status: campaign.status,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            budget: String(campaign.budget),
            spent: String(campaign.spent),
            impressions: String(campaign.impressions),
            clicks: String(campaign.clicks),
            conversions: String(campaign.conversions),
            owner: campaign.owner,
            notes: campaign.notes,
          }
        : emptyForm(),
    );
  }, [campaign, visible]);

  const errors = {
    name: form.name.trim().length === 0 ? 'Campaign name is required' : undefined,
    owner: form.owner.length === 0 ? 'Pick an owner' : undefined,
    startDate: isValidDate(form.startDate) ? undefined : 'Enter a valid date',
    endDate: isValidDate(form.endDate)
      ? form.endDate < form.startDate
        ? 'End date must be after the start date'
        : undefined
      : 'Enter a valid date',
    budget: isNumeric(form.budget) ? undefined : 'Enter a number',
    spent: isNumeric(form.spent) ? undefined : 'Enter a number',
    impressions: isNumeric(form.impressions) ? undefined : 'Enter a number',
    clicks: isNumeric(form.clicks) ? undefined : 'Enter a number',
    conversions: isNumeric(form.conversions) ? undefined : 'Enter a number',
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      channel: form.channel,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: numeric(form.budget),
      spent: numeric(form.spent),
      impressions: numeric(form.impressions),
      clicks: numeric(form.clicks),
      conversions: numeric(form.conversions),
      owner: form.owner,
      notes: form.notes.trim(),
    };
    if (campaign) await updateCampaign.mutateAsync({ campaignId: campaign.id, input: payload });
    else await createCampaign.mutateAsync(payload);
    onClose();
  };

  const onDelete = async () => {
    if (!campaign) return;
    await deleteCampaign.mutateAsync(campaign.id);
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={campaign ? 'Campaign' : 'New campaign'}
        footer={
          <>
            {campaign ? (
              <Button label="Delete" onPress={() => setConfirmingDelete(true)} variant="secondary" size="sm" />
            ) : null}
            <Button
              label={campaign ? 'Save campaign' : 'Create campaign'}
              onPress={submit}
              size="sm"
              disabled={touched && !valid}
              loading={createCampaign.isPending || updateCampaign.isPending}
            />
          </>
        }
      >
        <AppText variant="title">{campaign ? campaign.name : 'New campaign'}</AppText>

        {campaign ? (
          <>
            <StatStrip
              stats={[
                { label: 'Spent', value: formatCurrency(campaign.spent) },
                { label: 'Clicks', value: formatNumber(campaign.clicks) },
                { label: 'CTR', value: formatPercent(campaignCtr(campaign), 2) },
                { label: 'Pace', value: formatPercent(campaignPacing(campaign), 0) },
              ]}
            />
            <View style={styles.meterBlock}>
              <Meter progress={campaignPacing(campaign)} height={6} />
            </View>
            {detail ? (
              <Section title="Clicks vs conversions">
                <PairedBars
                  groups={detail.weeklyPerformance.map((week) => ({
                    label: week.label,
                    primary: week.clicks,
                    secondary: week.conversions,
                  }))}
                  primaryLabel="Clicks"
                  secondaryLabel="Conversions"
                />
              </Section>
            ) : null}
          </>
        ) : null}

        <TextField
          label="Campaign name"
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder="Hydration Boost"
          error={touched ? errors.name : undefined}
        />
        <OptionPicker
          label="Channel"
          options={CHANNELS}
          value={form.channel}
          onChange={(channel) => setForm((prev) => ({ ...prev, channel }))}
        />
        <OptionPicker
          label="Status"
          options={CAMPAIGN_STATUSES}
          value={form.status}
          onChange={(status) => setForm((prev) => ({ ...prev, status }))}
        />
        <DateInput
          label="Start date"
          value={form.startDate}
          onChange={(startDate) => setForm((prev) => ({ ...prev, startDate }))}
          error={touched ? errors.startDate : undefined}
        />
        <DateInput
          label="End date"
          value={form.endDate}
          onChange={(endDate) => setForm((prev) => ({ ...prev, endDate }))}
          error={touched ? errors.endDate : undefined}
        />
        <TextField
          label="Budget"
          value={form.budget}
          onChangeText={(budget) => setForm((prev) => ({ ...prev, budget }))}
          placeholder="2800"
          keyboardType="numeric"
          error={touched ? errors.budget : undefined}
        />
        <TextField
          label="Spent"
          value={form.spent}
          onChangeText={(spent) => setForm((prev) => ({ ...prev, spent }))}
          keyboardType="numeric"
          error={touched ? errors.spent : undefined}
        />
        <TextField
          label="Impressions"
          value={form.impressions}
          onChangeText={(impressions) => setForm((prev) => ({ ...prev, impressions }))}
          keyboardType="numeric"
          error={touched ? errors.impressions : undefined}
        />
        <TextField
          label="Clicks"
          value={form.clicks}
          onChangeText={(clicks) => setForm((prev) => ({ ...prev, clicks }))}
          keyboardType="numeric"
          error={touched ? errors.clicks : undefined}
        />
        <TextField
          label="Conversions"
          value={form.conversions}
          onChangeText={(conversions) => setForm((prev) => ({ ...prev, conversions }))}
          keyboardType="numeric"
          error={touched ? errors.conversions : undefined}
        />
        <AssigneePicker
          label="Owner"
          members={team?.assigned ?? []}
          value={form.owner}
          onChange={(owner) => setForm((prev) => ({ ...prev, owner }))}
          error={touched ? errors.owner : undefined}
        />
        <TextField
          label="Notes"
          value={form.notes}
          onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
          placeholder="What is working and what to watch."
          multiline
        />

        {createCampaign.isError || updateCampaign.isError ? (
          <AppText variant="small" color={colors.danger}>
            Could not save the campaign.
          </AppText>
        ) : null}
        <View />
      </BottomSheet>

      <ConfirmModal
        visible={confirmingDelete}
        title="Delete this campaign?"
        message="Spend and conversions from this campaign will no longer count towards project performance."
        confirmLabel="Delete"
        destructive
        loading={deleteCampaign.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  meterBlock: { marginTop: -spacing.sm },
});
