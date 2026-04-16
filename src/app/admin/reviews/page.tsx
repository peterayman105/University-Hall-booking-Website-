"use client";

import { useCallback, useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { name: string; email: string };
  hall: { name: string };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewToReject, setReviewToReject] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/reviews?pending=1");
    const d = await res.json();
    if (res.ok) setReviews(d.reviews);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    await load();
  }

  async function reject(id: string, rejectReason: string) {
    setError("");
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      setError("Please enter at least 3 characters for rejection reason.");
      return false;
    }
    setSubmittingReject(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: trimmed }),
      });
      if (!res.ok) {
        const raw = await res.text();
        try {
          const d = JSON.parse(raw) as { error?: string };
          setError(d.error || "Failed to reject review");
        } catch {
          setError(raw || "Failed to reject review");
        }
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Network error while rejecting review. Please try again.");
      return false;
    } finally {
      setSubmittingReject(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Reviews pending moderation</h1>
      <p className="mb-6 text-sm text-slate-500">
        Only approved reviews appear to customers on hall pages.
      </p>
      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-slate-500">No pending reviews.</p>}
        {reviews.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">{r.hall.name}</span>
              <span className="text-amber-600">{"★".repeat(r.rating)}</span>
            </div>
            <p className="mt-2 text-slate-700 dark:text-slate-200">{r.comment}</p>
            <p className="mt-2 text-xs text-slate-500">
              {r.user.name} · {r.user.email} · {new Date(r.createdAt).toLocaleString()}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => approve(r.id)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
              >
                Approve (visible to all)
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewToReject((prev) => (prev === r.id ? null : r.id));
                  setReason("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
              >
                Reject
              </button>
            </div>
            {reviewToReject === r.id ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 p-3 dark:border-red-900 dark:bg-red-950/20">
                <label className="block text-xs font-medium text-red-800 dark:text-red-300">
                  Rejection reason (shown only to this customer)
                </label>
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2 dark:border-red-800 dark:bg-slate-900 dark:text-white"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this review was rejected..."
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewToReject(null);
                      setReason("");
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await reject(r.id, reason);
                      if (ok) {
                        setReviewToReject(null);
                        setReason("");
                      }
                    }}
                    disabled={submittingReject}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingReject ? "Sending..." : "Send reject reason"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
