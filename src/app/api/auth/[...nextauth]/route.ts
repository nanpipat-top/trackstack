import NextAuth, { AuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";

interface ExtendedSession extends Session {
  accessToken?: string;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtubepartner",
          access_type: "offline",
          prompt: "consent",
          response_type: "code"
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: JWT }) {
      session.accessToken = token.accessToken as string;
      return session;
    }
  },
  pages: {
    signIn: "/",
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
