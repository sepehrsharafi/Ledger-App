import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ColorField, HEX_PATTERN } from '@/components/ui/color-field';
import { TextField } from '@/components/ui/form-field';
import { AppText } from '@/components/ui/text';
import { PROJECT_TYPES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useCreateProject } from '@/hooks/use-projects';
import { OptionPicker } from '@/components/ui/option-picker';

interface CreateProjectSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

const INITIAL = {
  name: '',
  clientName: '',
  type: PROJECT_TYPES[0] as string,
  brandPrimary: '#1F4BC5',
  brandAccent: '#111827',
};

/** New projects default to Active status and get a weekly report config server-side. */
export function CreateProjectSheet({ visible, onClose, onCreated }: CreateProjectSheetProps) {
  const [form, setForm] = useState(INITIAL);
  const [touched, setTouched] = useState(false);
  const createProject = useCreateProject();

  const errors = {
    name: form.name.trim().length === 0 ? 'Project name is required' : undefined,
    clientName: form.clientName.trim().length === 0 ? 'Client name is required' : undefined,
    brandPrimary: HEX_PATTERN.test(form.brandPrimary) ? undefined : 'Enter a hex colour',
    brandAccent: HEX_PATTERN.test(form.brandAccent) ? undefined : 'Enter a hex colour',
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  const close = () => {
    setForm(INITIAL);
    setTouched(false);
    createProject.reset();
    onClose();
  };

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    const project = await createProject.mutateAsync({
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      type: form.type,
      brandPrimary: form.brandPrimary,
      brandAccent: form.brandAccent,
    });
    setForm(INITIAL);
    setTouched(false);
    onCreated(project.id);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="New project"
      footer={
        <>
          <Button label="Cancel" onPress={close} variant="secondary" size="sm" />
          <Button
            label="Create project"
            onPress={submit}
            size="sm"
            disabled={touched && !valid}
            loading={createProject.isPending}
          />
        </>
      }
    >
      <AppText variant="title">New project</AppText>

      <TextField
        label="Project name"
        value={form.name}
        onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
        placeholder="Lumen Skincare"
        error={touched ? errors.name : undefined}
      />
      <TextField
        label="Client name"
        value={form.clientName}
        onChangeText={(clientName) => setForm((prev) => ({ ...prev, clientName }))}
        placeholder="Lumen Labs"
        error={touched ? errors.clientName : undefined}
      />
      <OptionPicker
        label="Type"
        options={PROJECT_TYPES}
        value={form.type as (typeof PROJECT_TYPES)[number]}
        onChange={(type) => setForm((prev) => ({ ...prev, type }))}
      />

      <View style={styles.colorRow}>
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
      </View>

      {createProject.isError ? (
        <AppText variant="small" color={colors.danger}>
          {createProject.error instanceof Error ? createProject.error.message : 'Could not create the project.'}
        </AppText>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  colorRow: { gap: spacing.lg },
});
