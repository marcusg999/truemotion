"use client";

import { useState, FormEvent } from "react";

const STYLE_TAG_SUGGESTIONS = [
  "Hip-Hop", "Trap", "Drill", "R&B", "Afrobeats", "Conscious",
  "Melodic Rap", "Boom Bap", "Alternative", "Experimental",
];

export default function SubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [region, setRegion] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [trackUrl, setTrackUrl] = useState("");
  const [narrative, setNarrative] = useState("");

  function addTag(tag: string) {
    const cleaned = tag.trim().replace(/,/g, "");
    if (cleaned && !tags.includes(cleaned)) {
      setTags((prev) => [...prev, cleaned]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (tagInput.trim()) addTag(tagInput);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          instagram_handle: instagram.trim() || null,
          region: region.trim() || null,
          style_tags: tags,
          track_url: trackUrl.trim() || null,
          narrative: narrative.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center space-y-6">
          <div
            className="inline-flex h-16 w-16 rounded-2xl items-center justify-center text-2xl font-bold text-white mx-auto"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            T
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Thank you for your submission.
            </h1>
            <p className="text-[var(--muted)] leading-relaxed">
              Thank you for submitting to be a TRP.L artist. The label is eager
              to review your submission. We will be in contact with you after
              your application has been processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex h-12 w-12 rounded-2xl items-center justify-center text-xl font-bold text-white mb-5"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            T
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Artist Submission</h1>
          <p className="text-[var(--muted)] text-sm leading-relaxed max-w-sm mx-auto">
            Submit your information to be considered for TRP.L. Fill out as much
            as you can — the more we know, the better we can evaluate your fit.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Identity */}
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              About you
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Artist name <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your artist name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  type="email"
                  className="input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Instagram handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">@</span>
                  <input
                    className="input w-full pl-7"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                    placeholder="yourhandle"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Region / city</label>
                <input
                  className="input w-full"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Atlanta, GA"
                />
              </div>
            </div>
          </div>

          {/* Style */}
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Your sound
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1.5">Style tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-[var(--muted)] hover:text-[var(--foreground)] ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                className="input w-full"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder="Type a tag and press comma or enter"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STYLE_TAG_SUGGESTIONS.filter((s) => !tags.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className="text-xs rounded-full px-2 py-0.5 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Track link</label>
              <input
                type="url"
                className="input w-full"
                value={trackUrl}
                onChange={(e) => setTrackUrl(e.target.value)}
                placeholder="Spotify, Apple Music, SoundCloud, YouTube…"
              />
            </div>
          </div>

          {/* Narrative */}
          <div className="surface-card p-5 space-y-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-0.5">
                Your story
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Tell us about yourself — your background, influences, what drives your music,
                and where you see yourself going. This is the most important part of your submission.
              </p>
            </div>
            <textarea
              className="input w-full h-36 resize-none"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Write freely — who you are, where you're from, what your music means to you, and what you're building toward…"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim()}
            className="btn btn-primary w-full"
            style={{ height: "48px", fontSize: "15px" }}
          >
            {loading ? "Submitting…" : "Submit application"}
          </button>

          <p className="text-xs text-center text-[var(--muted)]">
            Your information is only used to evaluate your fit for TRP.L.
            We will never share or sell your data.
          </p>
        </form>
      </div>
    </div>
  );
}
