"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, Sparkles } from "lucide-react";

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:5000/api`;
  return "http://localhost:5000/api";
}

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`${getApiUrl()}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to authenticate.");
      localStorage.setItem("orbit_token", data.token);
      window.location.href = "/";
    } catch (requestError) {
      setError(requestError.message === "Failed to fetch"
        ? "Unable to reach the API. Make sure the backend is running on port 5000."
        : requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark"><Sparkles size={18} /></span>orbit<span className="brand-dot">.</span></div><div className="auth-copy"><p className="eyebrow">Neostats HQ</p><h1>{mode === "login" ? "Welcome back." : "Build better, together."}</h1><p>{mode === "login" ? "Sign in to pick up where your team left off." : "Create the first workspace account to get started."}</p></div><form onSubmit={submit}>{mode === "register" && <label>Full name<input name="name" placeholder="Jamie Davis" required /></label>}<label>Email address<div className="auth-input"><Mail size={16} /><input name="email" type="email" placeholder="you@company.com" required /></div></label><label>Password<div className="auth-input"><LockKeyhole size={16} /><input name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></div></label>{error && <p className="auth-error">{error}</p>}<button className="button primary auth-submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button></form><button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New to Orbit? Create an account" : "Already have an account? Sign in"}</button></section></main>;
}
