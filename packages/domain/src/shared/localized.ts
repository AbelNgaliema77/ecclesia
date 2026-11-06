import { z } from "zod";

export const localizedTextSchema = (max = 80) =>
  z
    .object({
      en: z.string().trim().min(1, "required").max(max),
      fr: z.string().trim().max(max).default(""),
    })
    .transform((value) => ({ en: value.en, fr: value.fr === "" ? value.en : value.fr }));

export type LocalizedTextInput = z.input<ReturnType<typeof localizedTextSchema>>;
