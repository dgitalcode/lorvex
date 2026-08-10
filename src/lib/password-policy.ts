import { z } from "zod";

/** Shared production password policy (registration + reset). */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  checks: {
    length: boolean;
    upper: boolean;
    number: boolean;
    special: boolean;
  };
} {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = (Object.values(checks).filter(Boolean).length as 0 | 1 | 2 | 3 | 4);
  return { score, checks };
}
