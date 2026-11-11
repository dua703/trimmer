import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getGoogleCredentials } from "@/lib/definitions";

const google = getGoogleCredentials();

const providers: NextAuthConfig["providers"] = [];

if (google.clientId && google.clientSecret) {
  providers.push(
    Google({
      clientId: google.clientId,
      clientSecret: google.clientSecret,
    }),
  );
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
