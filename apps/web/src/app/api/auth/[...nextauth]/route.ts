import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const GET = async (req: Request) => {
  return NextAuth(req, authOptions);
};

export const POST = async (req: Request) => {
  return NextAuth(req, authOptions);
};
