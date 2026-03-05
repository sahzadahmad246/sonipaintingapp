"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", localLength: 10 },
  { code: "+1", label: "United States (+1)", localLength: 10 },
  { code: "+61", label: "Australia (+61)", localLength: 9 },
  { code: "+44", label: "United Kingdom (+44)", localLength: 10 },
  { code: "+971", label: "UAE (+971)", localLength: 9 },
];

export default function WorkerLoginPage() {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectedCountry = COUNTRY_CODES.find((item) => item.code === countryCode) || COUNTRY_CODES[0];
  const expectedLength = selectedCountry.localLength;
  const isValidMobileLength = mobile.length === expectedLength;
  const fullMobile = `${countryCode}${mobile}`;

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);
      if (!isValidMobileLength) {
        throw new Error(`Please enter a valid ${expectedLength}-digit mobile number`);
      }

      const response = await fetch("/api/worker-auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: fullMobile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send OTP");

      setOtpSent(true);
      toast.success("OTP sent", {
        description: data.devMode ? "Dev mode OTP: 000000" : "Check SMS on your mobile",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);
      const response = await fetch("/api/worker-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: fullMobile, code: otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to verify OTP");

      toast.success("Login successful");
      if (data.worker?.isProfileCompleted) {
        router.push("/worker");
      } else {
        router.push("/worker/onboarding");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-orange-50 to-white p-4 sm:p-6">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center">
        <Card className="w-full border-orange-100 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Worker Login</CardTitle>
            <CardDescription>Enter your mobile number to get OTP</CardDescription>
        </CardHeader>
          <CardContent className="space-y-5">
          <form onSubmit={handleRequestOtp} className="space-y-3">
            <Label>Mobile Number</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr]">
              <Select
                value={countryCode}
                onValueChange={(value) => {
                  const next = COUNTRY_CODES.find((item) => item.code === value);
                  setCountryCode(value);
                  if (next) {
                    setMobile((prev) => prev.slice(0, next.localLength));
                  }
                }}
                disabled={otpSent}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, expectedLength))
                }
                placeholder="Mobile number"
                maxLength={expectedLength}
                disabled={otpSent}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter {expectedLength} digits for {selectedCountry.label.split(" (")[0]}.
            </p>
            {!otpSent && (
              <Button type="submit" disabled={loading || !isValidMobileLength} className="mt-1 h-10 w-full">
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            )}
          </form>

          {otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-3 border-t pt-4">
              <Label>Enter OTP</Label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                maxLength={6}
              />
              <Button type="submit" disabled={loading || otp.length < 4} className="h-10 w-full">
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
              >
                Change Mobile Number
              </Button>
            </form>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
