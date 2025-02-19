import NextAuth, { AuthOptions, DefaultSession, Account } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";

// Extend the built-in session type
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string | null;
    expires?: string | null;
  }
}

// Extend the built-in token type
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: number | null;
  }
}

// Define the OAuth account type
interface GoogleOAuthAccount extends Account {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/youtube'
          ].join(' '),
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  },
  callbacks: {
    async jwt({ token, account }): Promise<JWT> {
      if (account) {
        const oauthAccount = account as GoogleOAuthAccount;
        return {
          ...token,
          accessToken: oauthAccount.access_token || null,
          refreshToken: oauthAccount.refresh_token || null,
          expiresAt: oauthAccount.expires_at || null
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        expires: token.expiresAt 
          ? new Date(token.expiresAt * 1000).toISOString()
          : null
      };
    }
  },
  pages: {
    signIn: "/"
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
