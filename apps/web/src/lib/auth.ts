import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@studyroom/shared';

// Kenyan university student profiles for collaborative assignment testing
const UNIVERSITY_PRESETS: Record<
  string,
  { name: string; university: string; color: string }
> = {
  'amina@usiu.ac.ke': {
    name: 'Amina Odhiambo',
    university: 'USIU-Africa',
    color: '#8b5cf6', // Violet
  },
  'brian@uonbi.ac.ke': {
    name: 'Brian Kiprop',
    university: 'University of Nairobi',
    color: '#0284c7', // Sky Blue
  },
  'wanjiku@strathmore.edu': {
    name: 'Faith Wanjiku',
    university: 'Strathmore University',
    color: '#059669', // Emerald
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'University Email', type: 'email', placeholder: 'student@usiu.ac.ke' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const preset = UNIVERSITY_PRESETS[email];

        let userName = preset?.name || email.split('@')[0];
        userName = userName.charAt(0).toUpperCase() + userName.slice(1);
        const avatarColor =
          preset?.color ||
          `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0')}`;

        try {
          // Find or create user in PostgreSQL via Prisma
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: userName,
                avatarColor,
              },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || userName,
            image: avatarColor,
            avatarColor: user.avatarColor || avatarColor,
            university: preset?.university || 'University Student',
          } as any;
        } catch (error) {
          // Fallback in-memory identity if DB is offline during quick tests
          console.warn('[Auth] Database user query failed, fallback in-memory user:', error);
          return {
            id: `usr-${email.replace(/[^a-z0-9]/g, '')}`,
            email,
            name: userName,
            avatarColor,
            university: preset?.university || 'University Student',
          } as any;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.avatarColor = (user as any).avatarColor;
        token.university = (user as any).university;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).avatarColor = token.avatarColor;
        (session.user as any).university = token.university;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'studyroom-live-secret-super-secure-key-32chars',
};

export default NextAuth(authOptions);
