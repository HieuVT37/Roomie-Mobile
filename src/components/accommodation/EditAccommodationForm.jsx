import { CreateAccommodationForm } from "./CreateAccommodationForm";
export function EditAccommodationForm({
  initialData,
  initialContact,
  accommodationId,
  onSuccess,
  onCancel,
}) {
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
