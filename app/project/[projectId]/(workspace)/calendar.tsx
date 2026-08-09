import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CalendarEventSheet } from '@/components/calendar/calendar-event-sheet';
import { ProjectHeader } from '@/components/project/project-header';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { MONTH_LABELS, WEEKDAY_LABELS } from '@/constants/enums';
import { channelColors, colors, spacing } from '@/constants/theme';
import { useProjectCalendar } from '@/hooks/use-calendar';
import { useProjectId } from '@/hooks/use-project-context';
import { useRefresh } from '@/hooks/use-refresh';
import { buildMonthGrid, isEventOverdue } from '@/lib/derive';
import { formatFullDate } from '@/lib/format';
import type { CalendarEvent } from '@/types/models';

type ViewMode = 'Calendar' | 'Agenda';

const MAX_CHIPS_PER_DAY = 2;

export default function CalendarScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectCalendar(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [mode, setMode] = useState<ViewMode>('Agenda');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>(undefined);

  const events = useMemo(() => data?.events ?? [], [data]);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthEvents = useMemo(() => events.filter((event) => event.date.startsWith(monthPrefix)), [events, monthPrefix]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of monthEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [monthEvents]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor.month, cursor.year]);

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const openCreate = (date?: string) => {
    setEditingEvent(null);
    setCreateDate(date);
    setSheetOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setSelectedDay(null);
    setEditingEvent(event);
    setCreateDate(undefined);
    setSheetOpen(true);
  };

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="calendar"
        title="Content calendar"
        subtitle="Scheduled content moments across the month."
        actionLabel="Add item"
        onAction={() => openCreate()}
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading calendar" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load the calendar" /> : null}

        {data ? (
          <>
            <View style={styles.monthBar}>
              <AppText variant="title">
                {MONTH_LABELS[cursor.month]} {cursor.year}
              </AppText>
              <View style={styles.monthNav}>
                <Button label="‹" onPress={() => shiftMonth(-1)} variant="secondary" size="sm" />
                <Button label="›" onPress={() => shiftMonth(1)} variant="secondary" size="sm" />
              </View>
            </View>

            <View style={styles.legend}>
              {(Object.keys(channelColors) as (keyof typeof channelColors)[]).map((channel) => (
                <View key={channel} style={styles.legendItem}>
                  <View style={[styles.swatch, { backgroundColor: channelColors[channel] }]} />
                  <Label>{channel}</Label>
                </View>
              ))}
            </View>

            <SegmentedControl options={['Calendar', 'Agenda'] as const} value={mode} onChange={setMode} />

            {monthEvents.length === 0 ? (
              <EmptyState
                title="Nothing scheduled this month"
                message="Add a content item to start filling the calendar."
                actionLabel="Add item"
                onAction={() => openCreate()}
              />
            ) : mode === 'Calendar' ? (
              <View style={styles.grid}>
                <View style={styles.weekRow}>
                  {WEEKDAY_LABELS.map((day) => (
                    <View key={day} style={styles.weekHead}>
                      <Label>{day}</Label>
                    </View>
                  ))}
                </View>
                <View style={styles.cells}>
                  {grid.map((cell) => {
                    const dayEvents = cell.inMonth ? (byDay.get(cell.key) ?? []) : [];
                    return (
                      <Pressable
                        key={cell.key}
                        disabled={!cell.inMonth}
                        onPress={() => setSelectedDay(cell.key)}
                        style={[styles.cell, cell.inMonth ? null : styles.cellMuted, cell.isToday ? styles.cellToday : null]}
                      >
                        {cell.inMonth ? <Label color={cell.isToday ? colors.accent : colors.inkMuted}>{cell.day}</Label> : null}
                        {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                          <View key={event.id} style={[styles.chip, { borderLeftColor: channelColors[event.channel] }]}>
                            <AppText variant="small" numberOfLines={1} style={styles.chipText}>
                              {event.title}
                            </AppText>
                          </View>
                        ))}
                        {dayEvents.length > MAX_CHIPS_PER_DAY ? (
                          <Label color={colors.accent}>+{dayEvents.length - MAX_CHIPS_PER_DAY} more</Label>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                {monthEvents.map((event) => (
                  <EventRow key={event.id} event={event} onPress={() => openEdit(event)} />
                ))}
              </View>
            )}
          </>
        ) : null}
      </Screen>

      <BottomSheet
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatFullDate(selectedDay) : 'Day'}
        footer={
          <Button
            label="Add item"
            onPress={() => {
              const date = selectedDay ?? undefined;
              setSelectedDay(null);
              openCreate(date);
            }}
            size="sm"
          />
        }
      >
        {selectedDay && (byDay.get(selectedDay) ?? []).length === 0 ? (
          <EmptyState title="Nothing scheduled" message="This day is free - add a content item to fill it." />
        ) : (
          (byDay.get(selectedDay ?? '') ?? []).map((event) => (
            <EventRow key={event.id} event={event} onPress={() => openEdit(event)} />
          ))
        )}
      </BottomSheet>

      <CalendarEventSheet
        projectId={projectId}
        visible={sheetOpen}
        event={editingEvent}
        defaultDate={createDate}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function EventRow({ event, onPress }: { event: CalendarEvent; onPress: () => void }) {
  const overdue = isEventOverdue(event);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.eventRow, pressed ? styles.eventRowPressed : null]}
    >
      <View style={[styles.rowBar, { backgroundColor: channelColors[event.channel] }]} />
      <View style={styles.eventCopy}>
        <AppText variant="body" numberOfLines={1}>
          {event.title}
        </AppText>
        <AppText variant="small" numberOfLines={1}>
          {event.channel} · {event.assignee}
        </AppText>
      </View>
      <View style={styles.eventMeta}>
        <AppText variant="body" align="right">
          {formatFullDate(event.date)}
        </AppText>
        {overdue ? (
          <AppText variant="small" color={colors.danger} align="right">
            Past due - not published
          </AppText>
        ) : null}
      </View>
      <View style={styles.eventStatus}>
        <StatusPill label={event.status} tone={overdue ? 'danger' : undefined} minWidth={92} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNav: { flexDirection: 'row', gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 8, height: 8 },
  grid: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  weekRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt },
  weekHead: { width: `${100 / 7}%`, paddingVertical: spacing.sm, alignItems: 'center' },
  cells: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 74,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 2,
  },
  cellMuted: { backgroundColor: colors.surfaceAlt },
  cellToday: { backgroundColor: colors.accentSoft },
  chip: { borderLeftWidth: 2, paddingLeft: 2, backgroundColor: colors.surfaceAlt },
  chipText: { fontSize: 9, lineHeight: 12, color: colors.ink },
  rowBar: { width: 3, height: 34, borderRadius: 2 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  eventRowPressed: { backgroundColor: colors.surfaceAlt },
  eventCopy: { flex: 1, minWidth: 0, gap: 2 },
  eventMeta: { width: 108, alignItems: 'flex-end', gap: 2 },
  eventStatus: { width: 92, alignItems: 'flex-end' },
});
