import { AuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import SpotifyProvider from "next-auth/providers/spotify";

// Extend the built-in session type
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string | null;
    expires?: string | null;
    provider?: string | null;
  }
}

// Extend the built-in token type
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: number | null;
    provider?: string | null;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'https://www.googleapis.com/auth/youtube'
        }
      }
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'playlist-modify-public playlist-modify-private'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      return session;
    }
  },
  pages: {
    signIn: "/"
  }
};
