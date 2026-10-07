"use client";

import { FormEvent, useState } from "react";
import { api, User } from "@/lib/api";

type AuthCardProps = {
  user: User | null;
  onLoginSuccess: (user: User) => void;
  onLogoutSuccess: () => void;
  onError: (message: string) => void;
};

export function AuthCard({ user, onLoginSuccess, onLogoutSuccess, onError }: AuthCardProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      onError("Bitte Benutzername und Passwort eingeben.");
      return;
    }
    setLoading(true);
    try {
      const nextUser =
        authMode === "login"
          ? await api.login(username.trim(), password)
          : await api.register(username.trim(), password);
      onLoginSuccess(nextUser);
      setPassword("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
      onLogoutSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Abmeldung fehlgeschlagen.");
    }
  }

  return (
    <aside className="h-fit rounded-lg border border-secondary/60 bg-surface p-5">
      <h2 className="text-xl font-semibold text-text">
        {user ? `Hallo, ${user.username}` : "Dein Konto"}
      </h2>
      {user ? (
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-4 text-sm text-accent transition-colors hover:text-primary-hover"
        >
          Abmelden
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Benutzername"
            required
            className="min-h-10 w-full rounded-md border border-secondary bg-background px-3 text-text outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Passwort"
            required
            className="min-h-10 w-full rounded-md border border-secondary bg-background px-3 text-text outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-10 w-full rounded-md bg-primary px-4 font-semibold text-background transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "Bitte warten..." : authMode === "login" ? "Anmelden" : "Konto erstellen"}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            className="text-sm text-accent transition-colors hover:text-primary-hover"
          >
            {authMode === "login" ? "Neues Konto erstellen" : "Zum Login wechseln"}
          </button>
        </form>
      )}
    </aside>
  );
}
