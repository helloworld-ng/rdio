import { z } from "zod";

const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const requiredString = z.string().trim().min(1);
const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.email()
);
const optionalId = z
  .union([requiredString, z.literal("")])
  .transform((value) => value || undefined)
  .optional();

export const idParamsSchema = z.object({
  id: requiredString,
});

export const dayParamsSchema = z.object({
  day: z.string().regex(dayKeyPattern, "day must be in YYYY-MM-DD format"),
});

export const hostNameParamsSchema = z.object({
  name: requiredString.transform((name) => decodeURIComponent(name)),
});

export const mediaParamsSchema = z.object({
  mediaId: requiredString,
});

export const hostBodySchema = z.object({
  name: requiredString,
  colorId: requiredString,
});

export const programBodySchema = z.object({
  title: requiredString,
  description: z.string().trim(),
  host: requiredString,
});

export const createMemberBodySchema = z.object({
  name: requiredString,
  email: emailSchema,
  password: z.string().min(8),
});

export const updateMemberRoleBodySchema = z.object({
  role: z.enum(["admin", "user"]),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const uploadedFileSchema = z.object({
  name: requiredString,
  size: z.number().int().nonnegative(),
  duration: z.number().nonnegative().optional(),
});

export const scheduleBlockSchema = z
  .object({
    id: requiredString,
    kind: z.enum(["recording", "broadcast"]),
    title: requiredString,
    description: z.string().trim().default(""),
    dateKey: z.string().regex(dayKeyPattern, "dateKey must be YYYY-MM-DD"),
    startMinutes: z.number().int().min(0).max(1439),
    endMinutes: z.number().int().min(1).max(1440),
    hosts: z.array(requiredString),
    programId: optionalId,
    mediaId: optionalId,
    file: uploadedFileSchema.optional(),
  })
  .refine((block) => block.endMinutes > block.startMinutes, {
    message: "endMinutes must be greater than startMinutes",
    path: ["endMinutes"],
  });

export const scheduleBlocksBodySchema = z.union([
  z.array(scheduleBlockSchema).transform((blocks) => ({
    blocks,
    version: undefined as string | undefined,
  })),
  z.object({
    blocks: z.array(scheduleBlockSchema),
    version: z.string().optional(),
  }),
]);

export const mediaUploadBodySchema = z
  .instanceof(Buffer)
  .refine((body) => body.length > 0, "Expected a non-empty file body.");

export const mediaUploadHeadersSchema = z
  .object({
    "content-type": z.union([z.string(), z.array(z.string())]).optional(),
    "x-file-name": z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
