import { CreateAccommodationForm } from "./CreateAccommodationForm";

interface EditAccommodationFormProps {
  initialData: any;
  initialContact: string;
  accommodationId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function EditAccommodationForm({
  initialData,
  initialContact,
  accommodationId,
  onSuccess,
  onCancel,
}: EditAccommodationFormProps) {
  return (
    <CreateAccommodationForm
      mode="edit"
      initialData={initialData}
      initialContact={initialContact}
      accommodationId={accommodationId}
      onSuccess={onSuccess}
    />
  );
}
