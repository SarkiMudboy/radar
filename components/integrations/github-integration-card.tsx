"use client";

import { useCallback, useState, useTransition } from "react";
import { signIn, signOut } from "next-auth/react";

import { disconnectGitHub } from "@/app/actions/github-integration";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function statusBadge(connected: boolean) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        connected
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

export function GitHubIntegrationCard({
  connected,
  oauthConfigured,
  oauthError,
}: {
  connected: boolean;
  oauthConfigured: boolean;
  oauthError?: string | null;
}) {
  const [connectPending, startConnect] = useTransition();
  const [disconnectPending, setDisconnectPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const onConnect = useCallback(() => {
    setActionError(null);
    startConnect(async () => {
      try {
        await signIn("github", { callbackUrl: "/integrations" });
      } catch {
        setActionError("Could not start GitHub sign-in. Try again.");
      }
    });
  }, []);

  const onDisconnect = useCallback(async () => {
    setActionError(null);
    setDisconnectPending(true);
    try {
      const result = await disconnectGitHub();
      if (result?.error) {
        setActionError(result.error);
        return;
      }
      await signOut({ callbackUrl: "/integrations", redirect: true });
    } catch {
      setActionError("Could not disconnect.");
    } finally {
      setDisconnectPending(false);
    }
  }, []);

  const banner = oauthError ?? actionError;

  return (
    <IntegrationCard
      name="GitHub"
      description="Connect your GitHub account to work with repositories (e.g. branch creation) using secure OAuth."
      status={statusBadge(connected)}
    >
      <div className="w-full space-y-3">
        {banner ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {banner}
          </p>
        ) : null}
        {!oauthConfigured ? (
          <p className="text-muted-foreground text-sm">
            GitHub OAuth is not configured. Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">GITHUB_ID</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">GITHUB_SECRET</code>{" "}
            in your environment.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!connected ? (
            <Button
              type="button"
              disabled={!oauthConfigured || connectPending}
              onClick={onConnect}
            >
              {connectPending ? "Redirecting…" : "Connect GitHub"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={disconnectPending}
              onClick={() => void onDisconnect()}
            >
              {disconnectPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          )}
        </div>
      </div>
    </IntegrationCard>
  );
}
