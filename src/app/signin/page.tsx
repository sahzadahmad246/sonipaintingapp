import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SignInSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Welcome
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Choose Sign In Type</h1>
          <p className="mt-2 text-sm text-slate-600">
            Select how you want to continue.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/auth/signin?callbackUrl=/dashboard"
              className="group block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-900 p-2 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Sign In As Admin</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Google login for dashboard access and team management.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
              </div>
            </Link>

            <Link
              href="/worker/login"
              className="group block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-orange-600 p-2 text-white">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Sign In As Worker</p>
                  <p className="mt-1 text-xs text-slate-600">
                    OTP login for attendance, payout, and leaderboard.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>

          <div className="mt-6">
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Back To Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
