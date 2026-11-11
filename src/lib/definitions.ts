
import * as z from "zod";

const passwordSchema = z
  .string()
  .min(8, { error: "Password must contain at least 8 characters." })
  .max(128, { error: "Password must contain at most 128 characters." })
  .regex(/[A-Za-z]/, { error: "Password must contain a letter." })
  .regex(/[0-9]/, { error: "Password must contain a number." })
  .regex(/[^A-Za-z0-9\s]/, {
    error: "Password must contain a special character.",
  });

function isEmailIdentifier(value: string) {
  return value.includes("@");
}

const usernameSchema = z
  .string()
  .trim()
  .min(3, { error: "Enter a valid username." })
  .max(50, { error: "Username is too long." })
  .regex(/^[a-zA-Z0-9._-]+$/, {
    error: "Username can include letters, numbers, dots, hyphens, and underscores.",
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, { error: "Enter your email address or username." })
    .superRefine((value, context) => {
      if (isEmailIdentifier(value)) {
        const email = z.email().safeParse(value);
        if (!email.success) {
          context.addIssue({
            code: "custom",
            message: "Please enter a valid email.",
          });
        }
        return;
      }

      const username = usernameSchema.safeParse(value);
      if (!username.success) {
        context.addIssue({
          code: "custom",
          message:
            username.error.issues[0]?.message ?? "Enter a valid username.",
        });
      }
    }),
  password: z.string().min(1, { error: "Password is required." }),
});

export const credentialsSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});

export function localDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isRealCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

const registerUsernameSchema = z
  .string()
  .trim()
  .min(3, { error: "Username must be at least 3 characters." })
  .max(30, { error: "Username must be at most 30 characters." })
  .regex(/^[a-zA-Z0-9_.]+$/, {
    error: "Username can contain letters, numbers, underscores, and periods.",
  });

const registerFields = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { error: "First name is required." })
    .min(2, { error: "First name must be at least 2 characters." }),

  middleName: z.string().trim().optional(),

  lastName: z
    .string()
    .trim()
    .min(1, { error: "Last name is required." })
    .min(2, { error: "Last name must be at least 2 characters." }),

  dateOfBirth: z
    .string()
    .trim()
    .min(1, { error: "Date of birth is required." })
    .refine(isRealCalendarDate, {
      error: "Enter a valid date of birth.",
    })
    .refine((value) => value <= localDateStamp(), {
      error: "Date of birth cannot be in the future.",
    }),

  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),

  password: passwordSchema,

  confirmPassword: z
    .string()
    .min(1, { error: "Re-enter your password." }),
});

export const registerSchema = registerFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    error: "Passwords do not match.",
    path: ["confirmPassword"] as PropertyKey[],
  },
);

export const registerFormSchema = registerFields
  .extend({
    username: registerUsernameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"] as PropertyKey[],
  });

export type AuthFormState = {
  errors?: {
    identifier?: string[];
    firstName?: string[];
    middleName?: string[];
    lastName?: string[];
    username?: string[];
    dateOfBirth?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string;
  /** Set after a successful sign-up while the email is still unconfirmed. */
  pendingVerification?: { email: string };
  /** Set when login is refused because the email is not confirmed yet. */
  unverifiedEmail?: string;
} | undefined;

export function looksLikeEmail(value: string) {
  return isEmailIdentifier(value.trim());
}

export function formatDisplayName(
  firstName: string,
  lastName: string,
  middleName?: string,
) {
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
}

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getGoogleCredentials() {
  return {
    clientId: readEnv("AUTH_GOOGLE_ID", "AUTH_GOOGLE_CLIENT_ID"),
    clientSecret: readEnv("AUTH_GOOGLE_SECRET", "AUTH_GOOGLE_CLIENT_SECRET"),
  };
}

export function isGoogleAuthConfigured() {
  const { clientId, clientSecret } = getGoogleCredentials();
  return Boolean(clientId && clientSecret);
}

