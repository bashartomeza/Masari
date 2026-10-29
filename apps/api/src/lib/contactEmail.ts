import { z } from "zod";

/** Canonical form of an email address used for one-time-code delivery and abuse counters. */
export const contactEmailSchema = z.string().trim().toLowerCase().email().max(191);

/** `a***@example.com`: enough for an operator to recognise the address, never the whole mailbox. */
export function maskEmail(email: string | null | undefined) {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  return `${email[0]}***${email.slice(at)}`;
}
