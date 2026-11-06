import { PRESET_COLORS } from "@ecclesia/domain/shared";
import { Check } from "lucide-react";

type ColorPickerProps = {
  name: string;
  label: string;
  defaultValue: string;
};

export function ColorPicker({ name, label, defaultValue }: ColorPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <label key={color} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={color}
              defaultChecked={color === defaultValue}
              className="peer sr-only"
              aria-label={color}
            />
            <span
              className="flex size-9 items-center justify-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-ink peer-focus-visible:ring-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
              style={{ background: color }}
            >
              <Check aria-hidden className="size-4 text-white" strokeWidth={3} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
