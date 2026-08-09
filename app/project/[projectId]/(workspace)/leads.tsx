import { useMemo, useRef, useState, useTransition } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View, type LayoutRectangle } from 'react-native';

import { CreateLeadSheet } from '@/components/leads/create-lead-sheet';
import { LeadDetailSheet } from '@/components/leads/lead-detail-sheet';
import { ProjectHeader } from '@/components/project/project-header';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { Screen } from '@/components/ui/screen';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatStrip } from '@/components/ui/stat-strip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { LEAD_STATUSES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useProjectLeads, useUpdateLeadStatus } from '@/hooks/use-leads';
import { useProjectId } from '@/hooks/use-project-context';
import { useRefresh } from '@/hooks/use-refresh';
import { filterLeads, groupLeadsByStatus } from '@/lib/derive';
import { formatCurrency, formatDayMonth, formatPercent } from '@/lib/format';
import { useSessionUser } from '@/state/auth-store';
import type { Lead, LeadStatus } from '@/types/models';

type ViewMode = 'Table' | 'Pipeline';

export default function LeadsScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectLeads(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const user = useSessionUser();
  const [isViewPending, startViewTransition] = useTransition();

  const [mode, setMode] = useState<ViewMode>('Table');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'All'>('All');
  const [source, setSource] = useState<string>('All');
  const [owner, setOwner] = useState<string>('All');
  const [creating, setCreating] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leads = useMemo(() => data?.leads ?? [], [data]);
  const filtered = useMemo(() => filterLeads(leads, { query, status, source, owner }), [leads, query, status, source, owner]);
  const grouped = useMemo(() => groupLeadsByStatus(filtered), [filtered]);
  const statusOptions = useMemo(
    () => [
      { value: 'All' as const, label: 'All', count: leads.length },
      ...LEAD_STATUSES.map((value) => ({
        value,
        label: value,
        count: leads.filter((lead) => lead.status === value).length,
      })),
    ],
    [leads],
  );

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="leads"
        title="Leads"
        subtitle="Project-scoped CRM, pipeline visibility and activity tracking."
        actionLabel="New lead"
        onAction={() => setCreating(true)}
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading leads" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load leads" /> : null}

        {data ? (
          <>
            <StatStrip
              stats={[
                { label: 'Total', value: String(data.summary.total) },
                { label: 'New', value: String(data.summary.new) },
                { label: 'Contacted', value: String(data.summary.contacted) },
                { label: 'Qualified', value: String(data.summary.qualified) },
                { label: 'Won', value: String(data.summary.won) },
                { label: 'Conversion', value: formatPercent(data.summary.conversionRate) },
              ]}
              columns={3}
            />

            <View style={styles.controls}>
              <View style={styles.viewControl}>
                <SegmentedControl
                  options={['Table', 'Pipeline'] as const}
                  value={mode}
                  onChange={(nextMode) => startViewTransition(() => setMode(nextMode))}
                />
              </View>
              <SearchInput value={query} onChangeText={setQuery} placeholder="Search name, company or email" />
              <FilterChips
                title="Status"
                value={status}
                onChange={setStatus}
                options={statusOptions}
              />
              <FilterChips
                title="Source"
                value={source}
                onChange={setSource}
                options={[{ value: 'All', label: 'All sources' }, ...data.sources.map((value) => ({ value, label: value }))]}
              />
              <FilterChips
                title="Owner"
                value={owner}
                onChange={setOwner}
                options={[{ value: 'All', label: 'All owners' }, ...data.owners.map((value) => ({ value, label: value }))]}
              />
            </View>

            <View style={styles.contentArea}>
              {filtered.length === 0 ? (
              <EmptyState
                title={leads.length === 0 ? 'No leads yet' : 'No leads match these filters'}
                message={
                  leads.length === 0
                    ? 'Add your first lead to start tracking the pipeline for this project.'
                    : 'Clear a filter or widen the search to see more leads.'
                }
                actionLabel={leads.length === 0 ? 'New lead' : 'Reset filters'}
                onAction={
                  leads.length === 0
                    ? () => setCreating(true)
                    : () => {
                        setQuery('');
                        setStatus('All');
                        setSource('All');
                        setOwner('All');
                      }
                }
              />
            ) : mode === 'Table' ? (
              <View>
                {filtered.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onPress={() => setSelectedLeadId(lead.id)} />
                ))}
              </View>
            ) : (
              <PipelineBoard
                grouped={grouped}
                onSelect={setSelectedLeadId}
                projectId={projectId}
                author={user?.name ?? 'Alex Morgan'}
              />
              )}
              <LoadingOverlay visible={isViewPending} />
            </View>
          </>
        ) : null}
      </Screen>

      <CreateLeadSheet projectId={projectId} visible={creating} onClose={() => setCreating(false)} />
      <LeadDetailSheet projectId={projectId} leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </View>
  );
}

function LeadRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.leadRow, pressed ? styles.leadRowPressed : null]}>
      <View style={styles.leadIdentity}>
        <Avatar name={lead.assignedTeamMember} size="sm" />
        <View style={styles.leadCopy}>
          <AppText variant="body" numberOfLines={1}>
            {lead.name}
          </AppText>
          <AppText variant="small" numberOfLines={1}>
            {lead.company} · {lead.source}
          </AppText>
        </View>
      </View>
      <View style={styles.leadValue}>
        <AppText variant="body" align="right" numberOfLines={1}>
          {lead.estimatedValue === null ? '-' : formatCurrency(lead.estimatedValue)}
        </AppText>
        <AppText variant="small" align="right" numberOfLines={1}>
          {formatDayMonth(lead.lastContactedAt)}
        </AppText>
      </View>
      <View style={styles.leadStatus}>
        <StatusPill label={lead.status} minWidth={92} />
      </View>
    </Pressable>
  );
}

function PipelineBoard({
  grouped,
  onSelect,
  projectId,
  author,
}: {
  grouped: Record<LeadStatus, Lead[]>;
  onSelect: (leadId: string) => void;
  projectId: string;
  author: string;
}) {
  const updateLeadStatus = useUpdateLeadStatus(projectId, author);
  const [columnLayouts, setColumnLayouts] = useState<Partial<Record<LeadStatus, LayoutRectangle>>>({});
  const [dragging, setDragging] = useState<{
    lead: Lead;
    from: LeadStatus;
    layout: LayoutRectangle;
    hover: LeadStatus;
  } | null>(null);
  const drag = useRef(new Animated.ValueXY()).current;

  const onDragStart = (lead: Lead, from: LeadStatus, layout: LayoutRectangle) => {
    drag.setValue({ x: 0, y: 0 });
    setDragging({ lead, from, layout, hover: from });
  };

  const onDragMove = (dx: number, dy: number) => {
    drag.setValue({ x: dx, y: dy });
    setDragging((current) => {
      if (!current) return current;
      const centerX = current.layout.x + dx + current.layout.width / 2;
      const hover =
        LEAD_STATUSES.find((stage) => {
          const layout = columnLayouts[stage];
          return layout ? centerX >= layout.x && centerX <= layout.x + layout.width : false;
        }) ?? current.from;
      return hover === current.hover ? current : { ...current, hover };
    });
  };

  const onDragEnd = async () => {
    const current = dragging;
    setDragging(null);
    drag.setValue({ x: 0, y: 0 });
    if (!current || current.hover === current.from || updateLeadStatus.isPending) return;
    await updateLeadStatus.mutateAsync({ leadId: current.lead.id, status: current.hover });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={dragging === null}
      contentContainerStyle={styles.board}
    >
      <View style={styles.boardInner}>
        {LEAD_STATUSES.map((stage) => {
          const stageLeads = grouped[stage];
          const stageValue = stageLeads.reduce((total, lead) => total + (lead.estimatedValue ?? 0), 0);
          const highlighted = dragging?.hover === stage;
          return (
            <View
              key={stage}
              style={[styles.column, highlighted ? styles.columnHighlighted : null]}
              onLayout={({ nativeEvent }) => setColumnLayouts((current) => ({ ...current, [stage]: nativeEvent.layout }))}
            >
              <View style={styles.columnHeader}>
                <Label>{stage}</Label>
                <AppText variant="heading">{stageLeads.length}</AppText>
              </View>
              <View style={styles.columnRule} />
              <Label>{formatCurrency(stageValue)}</Label>

              {stageLeads.length === 0 ? (
                <AppText variant="small" style={styles.columnEmpty}>
                  {highlighted ? 'Drop lead here.' : 'Nothing in this stage.'}
                </AppText>
              ) : (
                stageLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    stage={stage}
                    hidden={dragging?.lead.id === lead.id}
                    disabled={updateLeadStatus.isPending}
                    onSelect={() => onSelect(lead.id)}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
            </View>
          );
        })}

        {dragging ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dragCard,
              {
                width: dragging.layout.width,
                left: dragging.layout.x,
                top: dragging.layout.y,
                transform: drag.getTranslateTransform(),
              },
            ]}
          >
            <LeadPipelineCard lead={dragging.lead} />
          </Animated.View>
        ) : null}
      </View>
    </ScrollView>
  );
}

interface DraggableLeadCardProps {
  lead: Lead;
  stage: LeadStatus;
  hidden: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDragStart: (lead: Lead, stage: LeadStatus, layout: LayoutRectangle) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => Promise<void>;
}

function DraggableLeadCard({
  lead,
  stage,
  hidden,
  disabled,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DraggableLeadCardProps) {
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled && layout !== null && (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
      onPanResponderGrant: () => {
        if (layout) onDragStart(lead, stage, layout);
      },
      onPanResponderMove: (_, gestureState) => onDragMove(gestureState.dx, gestureState.dy),
      onPanResponderRelease: () => {
        void onDragEnd();
      },
      onPanResponderTerminate: () => {
        void onDragEnd();
      },
    }),
  ).current;

  return (
    <View onLayout={({ nativeEvent }) => setLayout(nativeEvent.layout)} style={hidden ? styles.pipelineCardHidden : undefined} {...responder.panHandlers}>
      <LeadPipelineCard lead={lead} onPress={onSelect} />
    </View>
  );
}

function LeadPipelineCard({ lead, onPress }: { lead: Lead; onPress?: () => void }) {
  return (
    <Card onPress={onPress}>
      <AppText variant="body" numberOfLines={1}>
        {lead.name}
      </AppText>
      <AppText variant="small" numberOfLines={1}>
        {lead.source}
      </AppText>
      <View style={styles.pipelineCardFooter}>
        <Avatar name={lead.assignedTeamMember} size="sm" />
        <AppText variant="small">{lead.estimatedValue === null ? '-' : formatCurrency(lead.estimatedValue)}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  controls: { gap: spacing.md },
  viewControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contentArea: { position: 'relative', minHeight: 220 },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  leadRowPressed: { backgroundColor: colors.surfaceAlt },
  leadIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  leadCopy: { flex: 1, minWidth: 0, gap: 2 },
  leadValue: { width: 112, alignItems: 'flex-end', gap: 2 },
  leadStatus: { width: 92, alignItems: 'flex-end' },
  board: { paddingRight: spacing.lg },
  boardInner: { flexDirection: 'row', gap: spacing.md, position: 'relative' },
  column: { width: 220, gap: spacing.sm, padding: spacing.sm, borderRadius: 12 },
  columnHighlighted: { backgroundColor: colors.accentSoft },
  columnHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  columnRule: { height: 1, backgroundColor: colors.ink },
  columnEmpty: { paddingVertical: spacing.md },
  pipelineCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  pipelineCardHidden: { opacity: 0.18 },
  dragCard: { position: 'absolute', zIndex: 20, opacity: 0.96 },
});
