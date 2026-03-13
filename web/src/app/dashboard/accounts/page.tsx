"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Account {
  id: string;
  email: string;
  googleTokens: string | null;
  cronSchedule: string;
  lastRun: string | null;
  nextRun: string | null;
  enabled: boolean;
  createdAt: string;
  _count: { alerts: number };
  rules: { id: string; ruleType: string }[];
}

const SCHEDULE_OPTIONS = [
  { value: "*/1 * * * *", label: "Every minute" },
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "*/30 * * * *", label: "Every 30 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 */6 * * *", label: "Every 6 hours" },
  { value: "0 9 * * *", label: "Daily at 9 AM" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newSchedule, setNewSchedule] = useState("*/5 * * * *");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadAccounts() {
    setLoading(true);
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, cronSchedule: newSchedule }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add account");
        setSaving(false);
        return;
      }

      const { oauthUrl } = await res.json();
      setAddOpen(false);
      setNewEmail("");
      setSaving(false);

      // Redirect to Google OAuth
      if (oauthUrl) {
        window.location.href = oauthUrl;
      } else {
        loadAccounts();
      }
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }

  async function toggleAccount(id: string, enabled: boolean) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    loadAccounts();
  }

  async function updateSchedule(id: string, cronSchedule: string) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cronSchedule }),
    });
    loadAccounts();
  }

  async function removeAccount(id: string) {
    if (!confirm("Remove this account? All alerts and rules for it will be deleted.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Never";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function scheduleLabel(cron: string) {
    return SCHEDULE_OPTIONS.find((o) => o.value === cron)?.label || cron;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitored Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect Outlook accounts to monitor for invoice discrepancies
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Outlook Account</DialogTitle>
              <DialogDescription>
                Enter the email address to monitor. You&apos;ll be redirected to Google to grant access to your mailbox.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAccount} className="space-y-4 mt-2">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Outlook Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="team@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">Check Frequency</Label>
                <Select value={newSchedule} onValueChange={setNewSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Connecting..." : "Connect with Microsoft"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium">No accounts connected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Add an Outlook account to start monitoring invoices for math discrepancies.
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{account.email}</CardTitle>
                    {account.googleTokens ? (
                      account.enabled ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Awaiting Microsoft sign-in</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {account.googleTokens && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAccount(account.id, account.enabled)}
                      >
                        {account.enabled ? "Pause" : "Resume"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeAccount(account.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex gap-4 mt-1">
                  <span>{account._count.alerts} alert{account._count.alerts !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{account.rules.length} rule{account.rules.length !== 1 ? "s" : ""}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Schedule</span>
                    <div className="mt-1">
                      <Select
                        value={account.cronSchedule}
                        onValueChange={(v) => updateSchedule(account.id, v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Run</span>
                    <p className="mt-1 font-medium">{formatDate(account.lastRun)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Run</span>
                    <p className="mt-1 font-medium">{formatDate(account.nextRun)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
