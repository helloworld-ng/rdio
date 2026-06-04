import type { FastifyReply } from "fastify";
import type { z } from "zod";
import { parseJsonBody } from "./station-store.js";

type ValidationErrorLabel =
  | "Invalid request body"
  | "Invalid request headers"
  | "Invalid request params";

function validationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.join("."),
  }));
}

function sendValidationError(
  reply: FastifyReply,
  error: z.ZodError,
  label: ValidationErrorLabel
) {
  reply.status(400).send({
    error: label,
    details: validationDetails(error),
  });
}

/** Validates an arbitrary value and sends a 400 response when it fails. */
export function validateValue<T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  value: unknown,
  label: ValidationErrorLabel
) {
  const result = schema.safeParse(value);

  if (!result.success) {
    sendValidationError(reply, result.error, label);
    return;
  }

  return result.data;
}

/** Parses a JSON body, validates it, and returns undefined after any 400 response. */
export function validateJsonBody<T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  body: unknown
) {
  let parsedBody: unknown;

  try {
    parsedBody = parseJsonBody(body);
  } catch (error) {
    reply.status(400).send({
      error: "Invalid JSON",
      details: error instanceof Error ? error.message : undefined,
    });
    return;
  }

  return validateValue(reply, schema, parsedBody, "Invalid request body");
}

/** Validates route params and sends a 400 response when they fail. */
export function validateParams<T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  params: unknown
) {
  return validateValue(reply, schema, params, "Invalid request params");
}

/** Validates request headers and sends a 400 response when they fail. */
export function validateHeaders<T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  headers: unknown
) {
  return validateValue(reply, schema, headers, "Invalid request headers");
}
