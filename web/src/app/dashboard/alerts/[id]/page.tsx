"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_ALERTS } from "@/lib/mock-data";

interface InvoiceLine {
  text: string;
  hasError?: boolean;
}

interface AlertError {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface AlertDetail {
  id: string;
  freelancer: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  statedTotal: number;
  calculatedTotal: number;
  discrepancyAmount: number;
  lineItems: string;
  sourceEmail: string;
  attachment: string | null;
  createdAt: string;
  account: { email: string };
  emailSubject?: string;
  invoiceBody?: InvoiceLine[];
  errors?: AlertError[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "high":
      return <Badge variant="destructive">High</Badge>;
    case "medium":
      return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">Medium</Badge>;
    default:
      return <Badge variant="secondary">Low</Badge>;
  }
}

function BackArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;

    // Try mock data first
    const mockAlert = MOCK_ALERTS.find((a) => a.id === id);
    if (mockAlert) {
      setAlert(mockAlert as AlertDetail);
      setLoading(false);
      return;
    }

    // Try API
    fetch(`/api/alerts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setAlert(data))
      .catch(() => setAlert(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading alert details...</div>
    );
  }

  if (!alert) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="gap-2">
          <BackArrow /> Back to Alerts
        </Button>
        <div className="p-8 text-center text-muted-foreground">Alert not found.</div>
      </div>
    );
  }

  const lineItems = (() => {
    try {
      return JSON.parse(alert.lineItems);
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="gap-2">
          <BackArrow /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{alert.freelancer}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Invoice {alert.invoiceNumber || "—"} · {alert.invoiceDate || "No date"} · Detected {formatDate(alert.createdAt)}
          </p>
        </div>
        <Badge variant="destructive" className="text-lg px-3 py-1">
          {formatCurrency(alert.discrepancyAmount)}
        </Badge>
      </div>

      {/* Email info row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-medium text-sm mt-1 break-all">{alert.sourceEmail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">To</p>
            <p className="font-medium text-sm mt-1">{alert.account.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Subject</p>
            <p className="font-medium text-sm mt-1">{(alert as any).emailSubject || `Invoice ${alert.invoiceNumber}`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attachment</p>
            <p className="font-medium text-sm mt-1">{alert.attachment || "None (email body)"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancy summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Stated Total</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(alert.statedTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Calculated Total</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(alert.calculatedTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Discrepancy</p>
            <p className="text-xl font-bold mt-1 text-destructive">{formatCurrency(alert.discrepancyAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: invoice view + errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice document view */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Document</CardTitle>
          </CardHeader>
          <CardContent>
            {(alert as any).invoiceBody ? (
              <div className="bg-card border border-border rounded-lg p-6 font-mono text-sm leading-relaxed space-y-0">
                {((alert as any).invoiceBody as InvoiceLine[]).map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.hasError
                        ? "bg-destructive/10 border-l-4 border-destructive px-3 py-1 -mx-3 rounded-r"
                        : line.text === "" ? "h-4" : "px-3 py-0.5 -mx-3"
                    }
                  >
                    {line.text || "\u00A0"}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-secondary/30 border border-border rounded-lg p-6 font-mono text-sm space-y-1">
                <p className="text-muted-foreground italic">Invoice text preview not available for this alert.</p>
                <p className="mt-4 font-semibold">Extracted Line Items:</p>
                {lineItems.map((item: any, i: number) => (
                  <p key={i}>{item.description}: {formatCurrency(item.amount)}</p>
                ))}
                <p className="mt-2 border-t border-border pt-2 font-semibold">
                  Stated Total: {formatCurrency(alert.statedTotal)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error listing */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Issues Found
                <Badge variant="destructive" className="ml-2">
                  {((alert as any).errors || []).length || 1}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(alert as any).errors && (alert as any).errors.length > 0 ? (
                ((alert as any).errors as AlertError[]).map((err, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={err.severity} />
                      <p className="font-semibold text-sm">{err.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{err.description}</p>
                  </div>
                ))
              ) : (
                <div className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">High</Badge>
                    <p className="font-semibold text-sm">Invoice total does not match line item sum</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The stated total is {formatCurrency(alert.statedTotal)} but the sum of all line items
                    is {formatCurrency(alert.calculatedTotal)}. The invoice is overstated
                    by {formatCurrency(alert.discrepancyAmount)}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line items breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lineItems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                    <span>{item.description}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 font-bold border-t-2 border-border">
                  <span>Calculated Sum</span>
                  <span>{formatCurrency(alert.calculatedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-destructive">
                  <span>Stated on Invoice</span>
                  <span>{formatCurrency(alert.statedTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
