import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { AssigneePicker, OptionPicker } from '@/components/ui/option-picker';
import { AppText } from '@/components/ui/text';
import { REQUEST_TYPES } from '@/constants/enums';
import { colors } from '@/constants/theme';
import { useCreateApproval } from '@/hooks/use-approvals';
import { useProjectTeam } from '@/hooks/use-team';
import type { RequestType } from '@/types/models';

interface CreateApprovalSheetProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
}

const INITIAL = {
  title: '',
  requestType: 'Creative' as RequestType,
  submittedBy: '',
  summary: '',
  details: '',
  pros: '',
  cons: '',
  recommendation: '',
};

/** New requests always start as Pending, which puts them straight into the global inbox. */
export function CreateApprovalSheet({ projectId, visible, onClose }: CreateApprovalSheetProps) {
  const [form, setForm] = useState(INITIAL);
  const [touched, setTouched] = useState(false);
  const createApproval = useCreateApproval(projectId);
  const { data: team } = useProjectTeam(projectId);

  const errors = {
    title: form.title.trim().length === 0 ? 'Title is required' : undefined,
    submittedBy: form.submittedBy.length === 0 ? 'Pick who is submitting this' : undefined,
    summary: form.summary.trim().length === 0 ? 'Summary is required' : undefined,
    details: form.details.trim().length === 0 ? 'Details are required' : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  const close = () => {
    setForm(INITIAL);
    setTouched(false);
    createApproval.reset();
    onClose();
  };

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    await createApproval.mutateAsync({
      title: form.title.trim(),
      requestType: form.requestType,
      submittedBy: form.submittedBy,
      summary: form.summary.trim(),
      details: form.details.trim(),
      pros: form.pros.trim(),
      cons: form.cons.trim(),
      recommendation: form.recommendation.trim(),
    });
    close();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="Request approval"
      footer={
        <>
          <Button label="Cancel" onPress={close} variant="secondary" size="sm" />
          <Button
            label="Submit request"
            onPress={submit}
            size="sm"
            disabled={touched && !valid}
            loading={createApproval.isPending}
          />
        </>
      }
    >
      <AppText variant="title">Request approval</AppText>

      <TextField
        label="Title"
        value={form.title}
        onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
        placeholder="Hydration Boost hero"
        error={touched ? errors.title : undefined}
      />
      <OptionPicker
        label="Request type"
        options={REQUEST_TYPES}
        value={form.requestType}
        onChange={(requestType) => setForm((prev) => ({ ...prev, requestType }))}
      />
      <AssigneePicker
        label="Submitted by"
        members={team?.assigned ?? []}
        value={form.submittedBy}
        onChange={(submittedBy) => setForm((prev) => ({ ...prev, submittedBy }))}
        error={touched ? errors.submittedBy : undefined}
      />
      <TextField
        label="Summary"
        value={form.summary}
        onChangeText={(summary) => setForm((prev) => ({ ...prev, summary }))}
        placeholder="What decision is needed, in one line."
        multiline
        error={touched ? errors.summary : undefined}
      />
      <TextField
        label="Details"
        value={form.details}
        onChangeText={(details) => setForm((prev) => ({ ...prev, details }))}
        placeholder="Context the reviewer needs before deciding."
        multiline
        error={touched ? errors.details : undefined}
      />
      <TextField
        label="For"
        value={form.pros}
        onChangeText={(pros) => setForm((prev) => ({ ...prev, pros }))}
        placeholder="Arguments in favour"
        multiline
      />
      <TextField
        label="Against"
        value={form.cons}
        onChangeText={(cons) => setForm((prev) => ({ ...prev, cons }))}
        placeholder="Risks or trade-offs"
        multiline
      />
      <TextField
        label="Recommendation"
        value={form.recommendation}
        onChangeText={(recommendation) => setForm((prev) => ({ ...prev, recommendation }))}
        placeholder="What you would do"
        multiline
      />

      {createApproval.isError ? (
        <AppText variant="small" color={colors.danger}>
          {createApproval.error instanceof Error ? createApproval.error.message : 'Could not submit the request.'}
        </AppText>
      ) : null}
      <View />
    </BottomSheet>
  );
}
