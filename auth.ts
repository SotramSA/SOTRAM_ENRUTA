import NextAuth from "next-auth"
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from "@/src/lib/prisma"
import authConfig from "@/auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  }
})