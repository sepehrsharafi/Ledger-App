import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { AssigneePicker, OptionPicker } from '@/components/ui/option-picker';
import { AppText } from '@/components/ui/text';
import { LEAD_SOURCES, LEAD_STATUSES } from '@/constants/enums';
import { colors } from '@/constants/theme';
import { useCreateLead } from '@/hooks/use-leads';
import { useProjectTeam } from '@/hooks/use-team';
import type { LeadStatus } from '@/types/models';

interface CreateLeadSheetProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INITIAL = {
  name: '',
  email: '',
  company: '',
  phone: '',
  source: LEAD_SOURCES[0] as string,
  status: 'New' as LeadStatus,
  estimatedValue: '',
  capturedFrom: '',
  assignedTeamMember: '',
};

export function CreateLeadSheet({ projectId, visible, onClose }: CreateLeadSheetProps) {
  const [form, setForm] = useState(INITIAL);
  const [touched, setTouched] = useState(false);
  const createLead = useCreateLead(projectId);
  const { data: team } = useProjectTeam(projectId);
  const members = team?.assigned ?? [];

  const errors = {
    name: form.name.trim().length === 0 ? 'Name is required' : undefined,
    email: EMAIL_PATTERN.test(form.email.trim()) ? undefined : 'Enter a valid email address',
    capturedFrom: form.capturedFrom.trim().length === 0 ? 'Tell us where this lead came from' : undefined,
    assignedTeamMember: form.assignedTeamMember.length === 0 ? 'Pick an owner' : undefined,
    estimatedValue:
      form.estimatedValue.length > 0 && !Number.isFinite(Number(form.estimatedValue))
        ? 'Enter a number'
        : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  const close = () => {
    setForm(INITIAL);
    setTouched(false);
    createLead.reset();
    onClose();
  };

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    await createLead.mutateAsync({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim().length > 0 ? form.company.trim() : 'Individual customer',
      phone: form.phone.trim(),
      source: form.source,
      status: form.status,
      estimatedValue: form.estimatedValue.length > 0 ? Number(form.estimatedValue) : null,
      capturedFrom: form.capturedFrom.trim(),
      assignedTeamMember: form.assignedTeamMember,
    });
    close();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="New lead"
      footer={
        <>
          <Button label="Cancel" onPress={close} variant="secondary" size="sm" />
          <Button label="Create lead" onPress={submit} size="sm" disabled={touched && !valid} loading={createLead.isPending} />
        </>
      }
    >
      <AppText variant="title">New lead</AppText>

      <TextField
        label="Name"
        value={form.name}
        onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
        placeholder="Mila Carter"
        error={touched ? errors.name : undefined}
      />
      <TextField
        label="Email"
        value={form.email}
        onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
        placeholder="mila.carter@mail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={touched ? errors.email : undefined}
      />
      <TextField
        label="Company"
        value={form.company}
        onChangeText={(company) => setForm((prev) => ({ ...prev, company }))}
        placeholder="Individual customer"
        hint="Leave blank for direct consumers."
      />
      <TextField
        label="Phone"
        value={form.phone}
        onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
        placeholder="+1-555-2107"
        keyboardType="phone-pad"
      />
      <TextField
        label="Captured from"
        value={form.capturedFrom}
        onChangeText={(capturedFrom) => setForm((prev) => ({ ...prev, capturedFrom }))}
        placeholder="Serum launch landing page"
        error={touched ? errors.capturedFrom : undefined}
      />
      <TextField
        label="Estimated value"
        value={form.estimatedValue}
        onChangeText={(estimatedValue) => setForm((prev) => ({ ...prev, estimatedValue }))}
        placeholder="130"
        keyboardType="numeric"
        error={touched ? errors.estimatedValue : undefined}
      />

      <OptionPicker
        label="Source"
        options={LEAD_SOURCES}
        value={form.source as (typeof LEAD_SOURCES)[number]}
        onChange={(source) => setForm((prev) => ({ ...prev, source }))}
      />
      <OptionPicker
        label="Status"
        options={LEAD_STATUSES}
        value={form.status}
        onChange={(status) => setForm((prev) => ({ ...prev, status }))}
      />
      <AssigneePicker
        label="Owner"
        members={members}
        value={form.assignedTeamMember}
        onChange={(assignedTeamMember) => setForm((prev) => ({ ...prev, assignedTeamMember }))}
        error={touched ? errors.assignedTeamMember : undefined}
      />

      {createLead.isError ? (
        <AppText variant="small" color={colors.danger}>
          {createLead.error instanceof Error ? createLead.error.message : 'Could not create the lead.'}
        </AppText>
      ) : null}
      <View />
    </BottomSheet>
  );
}
