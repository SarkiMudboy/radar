import type { Metadata } from "next";
import Link from "next/link";

import { GitHubIntegrationCard } from "@/components/integrations/github-integration-card";
import { getAppSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Integrations · Radar",
  description: "Connect third-party services to Radar.",
};

const oauthErrorMessages: Record<string, string> = {
  AccessDenied: "Access was denied. Try again if you want to connect GitHub.",
  Configuration: "OAuth is misconfigured. Check server environment variables.",
  Verification: "The sign-in token could not be verified. Try again.",
  Default: "Something went wrong during sign-in. Try again.",
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function IntegrationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAppSession();

  const oauthConfigured = Boolean(
    process.env.GITHUB_ID && process.env.GITHUB_SECRET,
  );

  const rawError = params.error;
  const oauthError =
    typeof rawError === "string"
      ? (oauthErrorMessages[rawError] ?? oauthErrorMessages.Default)
      : null;

  const githubConnected = session?.github?.connected === true;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-muted-foreground text-sm hover:underline">
        ← Home
      </Link>

      <header className="mt-8">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Connect external services to extend Radar. Tokens are stored on the server
          only and are never exposed to the browser.
        </p>
      </header>

      <section className="mt-10 grid gap-6">
        <GitHubIntegrationCard
          connected={githubConnected}
          oauthConfigured={oauthConfigured}
          oauthError={oauthError}
        />
      </section>
    </div>
  );
}
