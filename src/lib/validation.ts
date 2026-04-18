// Zod schemas for every API handler that accepts user input.
//
// All handlers use `parseBody(req, schema)` so we get one code path for
// validation errors — 400 with a machine-readable payload.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const StartPartySchema = z.object({
  issueUrl: z
    .string()
    .trim()
    .url()
    .refine(
      (v) => /https?:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/.test(v),
      'Must be a GitHub issue URL (github.com/owner/repo/issues/N).',
    ),
})

export const PreviewPartySchema = z.object({
  title: z.string().trim().min(1).max(400),
  body: z.string().max(40_000).optional().default(''),
})

export const PickPatchSchema = z.object({
  personaId: z.string().trim().min(1).max(64),
})

export const RetryAgentSchema = z.object({
  personaId: z.string().trim().min(1).max(64),
})

export async function parseBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<
  { ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }
> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'invalid_json', message: 'Request body must be JSON.' } },
        { status: 400 },
      ),
    }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: 'invalid_input',
            message: first?.message ?? 'Invalid input.',
            path: first?.path,
          },
        },
        { status: 400 },
      ),
    }
  }

  return { ok: true, data: parsed.data }
}
