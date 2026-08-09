import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CampaignSheet } from '@/components/campaigns/campaign-sheet';
import { ProjectHeader } from '@/components/project/project-header';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { Meter } from '@/components/ui/meter';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatStrip } from '@/components/ui/stat-strip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { CAMPAIGN_STATUSES, CHANNELS } from '@/constants/enums';
import { channelColors, colors, spacing } from '@/constants/theme';
import { useProjectCampaigns } from '@/hooks/use-campaigns';
import { useProjectId } from '@/hooks/use-project-context';
import { useRefresh } from '@/hooks/use-refresh';
import { campaignCtr, campaignPacing, sortCampaigns, type CampaignSort } from '@/lib/derive';
import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import type { Campaign, CampaignStatus, Channel } from '@/types/models';

export default function CampaignsScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectCampaigns(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const [status, setStatus] = useState<CampaignStatus | 'All'>('All');
  const [channel, setChannel] = useState<Channel | 'All'>('All');
  const [sort, setSort] = useState<CampaignSort>('spend');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const campaigns = useMemo(() => data?.campaigns ?? [], [data]);
  const visible = useMemo(() => {
    const filtered = campaigns.filter(
      (campaign) =>
        (status === 'All' || campaign.status === status) && (channel === 'All' || campaign.channel === channel),
    );
    return sortCampaigns(filtered, sort);
  }, [campaigns, channel, sort, status]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="campaigns"
        title="Campaigns"
        subtitle="Channel performance, pacing and drill-down stats."
        actionLabel="New campaign"
        onAction={openCreate}
        showBack
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading campaigns" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load campaigns" /> : null}

        {data ? (
          <>
            <StatStrip
              stats={[
                { label: 'Campaigns', value: String(data.totals.count) },
                { label: 'Budget', value: formatCompactCurrency(data.totals.budget) },
                { label: 'Spent', value: formatCompactCurrency(data.totals.spent) },
                { label: 'Conversions', value: formatNumber(data.totals.conversions) },
              ]}
            />

            <FilterChips
              title="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'All' as const, label: 'All', count: campaigns.length },
                ...CAMPAIGN_STATUSES.map((value) => ({
                  value,
                  label: value,
                  count: campaigns.filter((campaign) => campaign.status === value).length,
                })),
              ]}
            />
            <FilterChips
              title="Channel"
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'All' as const, label: 'All' },
                ...CHANNELS.map((value) => ({
                  value,
                  label: value,
                  count: campaigns.filter((campaign) => campaign.channel === value).length,
                })),
              ]}
            />

            <View style={styles.sortRow}>
              <Label>{visible.length} of {campaigns.length} shown</Label>
              <SegmentedControl
                options={['spend', 'conversions', 'name'] as const}
                value={sort}
                onChange={setSort}
                labels={{ spend: 'Spend', conversions: 'Conv.', name: 'Name' }}
              />
            </View>

            {visible.length === 0 ? (
              <EmptyState
                title={campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match these filters'}
                message={
                  campaigns.length === 0
                    ? 'Add a campaign to start tracking spend, clicks and conversions.'
                    : 'Try a different status or channel filter.'
                }
                actionLabel={campaigns.length === 0 ? 'New campaign' : undefined}
                onAction={campaigns.length === 0 ? openCreate : undefined}
              />
            ) : (
              <View style={styles.list}>
                {visible.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onPress={() => {
                      setEditing(campaign);
                      setSheetOpen(true);
                    }}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}
      </Screen>

      <CampaignSheet
        projectId={projectId}
        visible={sheetOpen}
        campaign={editing}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function CampaignCard({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  const pacing = campaignPacing(campaign);
  return (
    <Card onPress={onPress} accentColor={channelColors[campaign.channel]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <AppText variant="heading" numberOfLines={1}>
            {campaign.name}
          </AppText>
          <Label>{campaign.channel}</Label>
        </View>
        <StatusPill label={campaign.status} />
      </View>

      <View style={styles.pacingBlock}>
        <Meter progress={pacing} color={channelColors[campaign.channel]} />
        <View style={styles.pacingRow}>
          <Label>{formatPercent(pacing, 0)} of budget</Label>
          <Label>
            {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
          </Label>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Impr." value={formatNumber(campaign.impressions)} />
        <Metric label="Clicks" value={formatNumber(campaign.clicks)} />
        <Metric label="CTR" value={campaign.impressions > 0 ? formatPercent(campaignCtr(campaign), 2) : '—'} />
        <Metric label="Conv." value={formatNumber(campaign.conversions)} />
      </View>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Label>{label}</Label>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  list: { gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  cardTitle: { flex: 1, gap: 2 },
  pacingBlock: { marginTop: spacing.lg, gap: spacing.xs },
  pacingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  metricsRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md },
  metric: { flex: 1, gap: 2 },
});
