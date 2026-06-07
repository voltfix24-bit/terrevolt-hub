import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/terrevolt-logo.png.asset.json";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function safeRedirectTarget(input?: string): string {
  if (!input) return "/";
  // Only same-origin paths starting with a single slash.
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  if (input.startsWith("/auth")) return "/";
  return input;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const target = safeRedirectTarget(search.redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already signed in, leave /auth immediately.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
  }, [navigate, target]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError("Onjuiste gegevens. Controleer je e-mailadres en wachtwoord.");
      return;
    }
    navigate({ to: target, replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel/40 via-background to-lime-soft/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <img src={logo.url} alt="TerreVolt" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="font-semibold text-navy">TerreVolt</div>
            <div className="text-xs text-muted-foreground">Intranet</div>
          </div>
        </Link>

        <h1 className="text-2xl font-semibold text-navy">Inloggen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in met je TerreVolt account om toegang te krijgen tot het intranet.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy" htmlFor="email">E-mailadres</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="naam@terrevolt.nl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-navy" htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Bezig met inloggen..." : "Inloggen"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Geen toegang? Neem contact op met een beheerder.
        </div>
      </div>
    </div>
  );
}
