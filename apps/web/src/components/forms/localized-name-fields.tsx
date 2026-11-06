import { Field, Input } from "@/components/ui/field";

type LocalizedNameFieldsProps = {
  name: string;
  labels: { en: string; fr: string; optional: string };
  defaultValue?: { en: string; fr: string };
  error?: string;
  maxLength?: number;
};

export function LocalizedNameFields({
  name,
  labels,
  defaultValue,
  error,
  maxLength = 60,
}: LocalizedNameFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${name}-en`} label={labels.en} error={error}>
        <Input
          id={`${name}-en`}
          name={`${name}.en`}
          defaultValue={defaultValue?.en ?? ""}
          required
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          lang="en"
        />
      </Field>
      <Field id={`${name}-fr`} label={labels.fr} optionalLabel={labels.optional}>
        <Input
          id={`${name}-fr`}
          name={`${name}.fr`}
          defaultValue={defaultValue?.fr ?? ""}
          maxLength={maxLength}
          lang="fr"
        />
      </Field>
    </div>
  );
}
