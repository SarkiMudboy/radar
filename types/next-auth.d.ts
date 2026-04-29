import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    github?: { connected: boolean };
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** GitHub user id (numeric string). */
    githubId?: string;
  }
}
