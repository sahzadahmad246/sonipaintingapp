"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Worker = {
  name: string;
  address?: string;
  emergencyContact?: string;
  isProfileCompleted: boolean;
};

export default function WorkerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [worker, setWorker] = useState<Worker | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/workers/me");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unauthorized");

        setWorker(data.worker);
        if (data.worker?.isProfileCompleted) {
          router.push("/worker");
          return;
        }

        setName(data.worker?.name || "");
        setAddress(data.worker?.address || "");
        setEmergencyContact(data.worker?.emergencyContact || "");
      } catch {
        router.push("/worker/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      const response = await fetch("/api/workers/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, emergencyContact }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save profile");

      toast.success("Profile completed");
      router.push("/worker");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!worker) return null;

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-orange-50 to-white p-4 sm:p-6">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center">
        <Card className="w-full border-orange-100 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Fill required details for attendance and payment records.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Full Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Current address"
              />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Emergency mobile number"
              />
            </div>
            <Button type="submit" disabled={saving || !name.trim()} className="h-10 w-full">
              {saving ? "Saving..." : "Save and Continue"}
            </Button>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
