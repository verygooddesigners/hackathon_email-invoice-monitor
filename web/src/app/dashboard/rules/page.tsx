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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_ACCOUNTS_SIMPLE, MOCK_RULES } from "@/lib/mock-data";

interface Account {
  id: string;
  email: string;
}

interface Rule {
  id: string;
  accountId: string;
  ruleType: string;
  ruleValue: string;
  enabled: boolean;
  createdAt: string;
}

const RULE_TYPES = [
  {
    value: "date_range",
    label: "Date Range",
    description: "Only process invoices from the last N days",
  },
  {
    value: "subject_filter",
    label: "Subject Filter",
    description: "Filter emails by subject line",
  },
  {
    value: "sender_filter",
    label: "Sender Filter",
    description: "Filter emails by sender address or domain",
  },
  {
    value: "attachment_only",
    label: "Attachment Only",
    description: "Only process emails that have attachments",
  },
];

export default function RulesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New rule form
  const [ruleType, setRuleType] = useState("date_range");
  const [dateRangeDays, setDateRangeDays] = useState("7");
  const [subjectStartsWith, setSubjectStartsWith] = useState("");
  const [subjectContains, setSubjectContains] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderDomain, setSenderDomain] = useState("");

  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        const accs = Array.isArray(data) ? data : [];
        if (accs.length === 0) {
          setAccounts(MOCK_ACCOUNTS_SIMPLE);
          setSelectedAccount(MOCK_ACCOUNTS_SIMPLE[0].id);
          setRules(MOCK_RULES as Rule[]);
          setUsingMockData(true);
        } else {
          setAccounts(accs);
          if (accs.length > 0 && !selectedAccount) {
            setSelectedAccount(accs[0].id);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setAccounts(MOCK_ACCOUNTS_SIMPLE);
        setSelectedAccount(MOCK_ACCOUNTS_SIMPLE[0].id);
        setRules(MOCK_RULES as Rule[]);
        setUsingMockData(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedAccount || usingMockData) return;
    loadRules();
  }, [selectedAccount, usingMockData]);

  async function loadRules() {
    try {
      const res = await fetch(`/api/rules?accountId=${selectedAccount}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules(MOCK_RULES as Rule[]);
      setUsingMockData(true);
    }
  }

  function buildRuleValue(): string {
    switch (ruleType) {
      case "date_range":
        return JSON.stringify({ days: parseInt(dateRangeDays) || 7 });
      case "subject_filter": {
        const val: any = {};
        if (subjectStartsWith) val.startsWith = subjectStartsWith;
        if (subjectContains) val.contains = subjectContains;
        return JSON.stringify(val);
      }
      case "sender_filter": {
        const val: any = {};
        if (senderEmail) val.email = senderEmail;
        if (senderDomain) val.domain = senderDomain;
        return JSON.stringify(val);
      }
      case "attachment_only":
        return JSON.stringify({ required: true });
      default:
        return "{}";
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const ruleValue = buildRuleValue();

    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount, ruleType, ruleValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create rule");
        setSaving(false);
        return;
      }

      setAddOpen(false);
      resetForm();
      setSaving(false);
      loadRules();
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }

  function resetForm() {
    setRuleType("date_range");
    setDateRangeDays("7");
    setSubjectStartsWith("");
    setSubjectContains("");
    setSenderEmail("");
    setSenderDomain("");
    setError("");
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    loadRules();
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    loadRules();
  }

  function describeRule(type: string, value: string): string {
    try {
      const v = JSON.parse(value);
      switch (type) {
        case "date_range":
          return `Last ${v.days} day${v.days !== 1 ? "s" : ""}`;
        case "subject_filter": {
          const parts: string[] = [];
          if (v.startsWith) parts.push(`starts with "${v.startsWith}"`);
          if (v.contains) parts.push(`contains "${v.contains}"`);
          if (v.regex) parts.push(`matches /${v.regex}/`);
          return parts.length ? `Subject ${parts.join(", ")}` : "Subject filter";
        }
        case "sender_filter": {
          if (v.email) return `From ${v.email}`;
          if (v.domain) return `From *@${v.domain}`;
          return "Sender filter";
        }
        case "attachment_only":
          return "Attachments required";
        default:
          return value;
      }
    } catch {
      return value;
    }
  }

  function ruleTypeLabel(type: string) {
    return RULE_TYPES.find((r) => r.value === type)?.label || type;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring Rules</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure which emails get processed for each account
          </p>
        </div>
        <div className="flex items-center gap-3">
          {accounts.length > 1 && (
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!selectedAccount}>Add Rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Monitoring Rule</DialogTitle>
                <DialogDescription>
                  Rules filter which emails are processed. Only emails matching ALL rules are checked.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRule} className="space-y-4 mt-2">
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select value={ruleType} onValueChange={setRuleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {RULE_TYPES.find((r) => r.value === ruleType)?.description}
                  </p>
                </div>

                {ruleType === "date_range" && (
                  <div className="space-y-2">
                    <Label htmlFor="days">Number of days</Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      max="365"
                      value={dateRangeDays}
                      onChange={(e) => setDateRangeDays(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only process emails received within the last {dateRangeDays || "N"} days
                    </p>
                  </div>
                )}

                {ruleType === "subject_filter" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="startsWith">Subject starts with</Label>
                      <Input
                        id="startsWith"
                        placeholder='e.g. "EMAIL TEST"'
                        value={subjectStartsWith}
                        onChange={(e) => setSubjectStartsWith(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contains">Subject contains</Label>
                      <Input
                        id="contains"
                        placeholder='e.g. "invoice"'
                        value={subjectContains}
                        onChange={(e) => setSubjectContains(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fill in at least one field. Both are case-insensitive.
                    </p>
                  </div>
                )}

                {ruleType === "sender_filter" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="senderEmail">Sender email</Label>
                      <Input
                        id="senderEmail"
                        type="email"
                        placeholder="freelancer@example.com"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senderDomain">Or sender domain</Label>
                      <Input
                        id="senderDomain"
                        placeholder="example.com"
                        value={senderDomain}
                        onChange={(e) => setSenderDomain(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only process emails from this sender or domain.
                    </p>
                  </div>
                )}

                {ruleType === "attachment_only" && (
                  <p className="text-sm text-muted-foreground border border-border rounded-md p-3">
                    This rule will skip any email that does not have a file attachment. Useful if invoices
                    are always sent as .docx or .xlsx attachments.
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Creating..." : "Create Rule"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {usingMockData && (
        <div className="bg-primary/10 text-primary text-sm px-4 py-2 rounded-lg border border-primary/20">
          Showing demo data — connect an Outlook account to create real rules
        </div>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm">
            <span className="font-semibold">Default behavior:</span>{" "}
            Every incoming email is automatically checked for invoice math errors by AI, even without any rules.
            Rules only filter <em>which</em> emails are processed — they don&apos;t enable the math check.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium">No accounts connected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Add an Outlook account first before configuring rules.
            </p>
          </CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium">No rules configured</p>
            <p className="text-muted-foreground text-sm mt-1">
              Without rules, all unread emails will be processed. Add rules to filter what gets checked.
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              Add Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Rules for {accounts.find((a) => a.id === selectedAccount)?.email}
            </CardTitle>
            <CardDescription>
              Emails must match ALL enabled rules to be processed.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant="outline">{ruleTypeLabel(rule.ruleType)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {describeRule(rule.ruleType, rule.ruleValue)}
                    </TableCell>
                    <TableCell>
                      {rule.enabled ? (
                        <Badge>Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRule(rule.id, rule.enabled)}
                        >
                          {rule.enabled ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteRule(rule.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
