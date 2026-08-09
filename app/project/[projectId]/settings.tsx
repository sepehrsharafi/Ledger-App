import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProjectHeader } from '@/components/project/project-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColorField, HEX_PATTERN } from '@/components/ui/color-field';
import { DataRow } from '@/components/ui/data-row';
import { TextField } from '@/components/ui/form-field';
import { OptionPicker } from '@/components/ui/option-picker';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { useProjectTeam } from '@/hooks/use-team';
import { formatFullDate } from '@/lib/format';
import { useCan } from '@/state/permissions';

export default function ProjectSettingsScreen() {
  const projectId = useProjectId();
  const { data: project, isPending, isError, error, refetch } = useProject(projectId);
  const { data: team } = useProjectTeam(projectId);
  const updateProject = useUpdateProject(projectId);
  const canEdit = useCan('editProjectSettings');

  const [form, setForm] = useState({
    name: '',
    clientName: '',
    type: '',
    status: 'Active',
    brandPrimary: '#1F4BC5',
    brandAccent: '#111827',
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name,
      clientName: project.clientName,
      type: project.type,
      status: project.status,
      brandPrimary: project.brandPrimary,
      brandAccent: project.brandAccent,
    });
  }, [project]);

  const errors = {
    name: form.name.trim().length === 0 ? 'Project name is required' : undefined,
    clientName: form.clientName.trim().length === 0 ? 'Client name is required' : undefined,
    type: form.type.trim().length === 0 ? 'Type is required' : undefined,
    brandPrimary: HEX_PATTERN.test(form.brandPrimary) ? undefined : 'Enter a hex colour',
    brandAccent: HEX_PATTERN.test(form.brandAccent) ? undefined : 'Enter a hex colour',
  };
  const valid = Object.values(errors).every((entry) => entry === undefined);

  const save = () => {
    setTouched(true);
    if (!valid) return;
    updateProject.mutate({
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      type: form.type.trim(),
      status: form.status,
      brandPrimary: form.brandPrimary,
      brandAccent: form.brandAccent,
    });
  };

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="settings"
        title="Project settings"
        subtitle="Identity, status and brand colours."
        showBack
      />

      <Screen>
        {isPending ? <LoadingState label="Loading project" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load this project" /> : null}

        {project ? (
          <>
            <Card accentColor={form.brandAccent}>
              <Label>Brand preview</Label>
              <AppText variant="title">{form.name || project.name}</AppText>
              <AppText variant="small">{form.clientName || project.clientName}</AppText>
              <View style={styles.swatchRow}>
                <View style={[styles.swatch, { backgroundColor: form.brandPrimary }]}>
                  <Label color={colors.accentInk}>Primary</Label>
                </View>
                <View style={[styles.swatch, { backgroundColor: form.brandAccent }]}>
                  <Label color={colors.accentInk}>Accent</Label>
                </View>
              </View>
              <Label>Active since {formatFullDate(project.createdAt)}</Label>
            </Card>

            <Section title="Identity">
              <TextField
                label="Project name"
                value={form.name}
                onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
                error={touched ? errors.name : undefined}
                editable={canEdit}
              />
              <TextField
                label="Client name"
                value={form.clientName}
                onChangeText={(clientName) => setForm((prev) => ({ ...prev, clientName }))}
                error={touched ? errors.clientName : undefined}
                editable={canEdit}
              />
              <TextField
                label="Type"
                value={form.type}
                onChangeText={(type) => setForm((prev) => ({ ...prev, type }))}
                error={touched ? errors.type : undefined}
                hint={`Common types: ${PROJECT_TYPES.slice(0, 2).join(', ')}`}
                editable={canEdit}
              />
              <OptionPicker
                label="Status"
                options={PROJECT_STATUSES}
                value={form.status as (typeof PROJECT_STATUSES)[number]}
                onChange={(status) => setForm((prev) => ({ ...prev, status }))}
              />
            </Section>

            <Section title="Brand">
              <ColorField
                label="Primary colour"
                value={form.brandPrimary}
                onChange={(brandPrimary) => setForm((prev) => ({ ...prev, brandPrimary }))}
                error={touched ? errors.brandPrimary : undefined}
              />
              <ColorField
                label="Accent colour"
                value={form.brandAccent}
                onChange={(brandAccent) => setForm((prev) => ({ ...prev, brandAccent }))}
                error={touched ? errors.brandAccent : undefined}
              />
            </Section>

            {canEdit ? (
              <Button
                label={updateProject.isSuccess ? 'Saved' : 'Save changes'}
                onPress={save}
                disabled={touched && !valid}
                loading={updateProject.isPending}
                fullWidth
              />
            ) : (
              <AppText variant="small">Your role can view these settings but not change them.</AppText>
            )}

            {updateProject.isError ? (
              <AppText variant="small" color={colors.danger}>
                {updateProject.error instanceof Error ? updateProject.error.message : 'Could not save the project.'}
              </AppText>
            ) : null}

            <Section title="Assigned team">
              {(team?.assigned.length ?? 0) === 0 ? (
                <EmptyState title="Nobody assigned" message="Assign members from the project team screen." />
              ) : (
                team?.assigned.map((member) => (
                  <DataRow
                    key={member.id}
                    title={member.name}
                    subtitle={member.email}
                    leading={<Avatar name={member.name} color={member.avatarColor} />}
                    trailing={<StatusPill label={member.role} />}
                  />
                ))
              )}
            </Section>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  swatchRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  swatch: { flex: 1, height: 52, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
