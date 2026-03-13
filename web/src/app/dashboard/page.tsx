"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface Alert {
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
}

interface Account {
  id: string;
  email: string;
}

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
    if (selectedAccount !== "all") params.set("accountId", selectedAccount);

    fetch(`/api/alerts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [selectedAccount, page]);

  const totalPages = Math.ceil(total / limit);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discrepancy Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Invoices with math discrepancies detected by the monitor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{total} alert{total !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg font-medium">No discrepancies found</p>
              <p className="text-sm mt-1">
                When the monitor detects an invoice with incorrect math, it will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Freelancer</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Stated</TableHead>
                  <TableHead className="text-right">Calculated</TableHead>
                  <TableHead className="text-right">Discrepancy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <>
                    <TableRow
                      key={alert.id}
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    >
                      <TableCell className="text-sm">{formatDate(alert.createdAt)}</TableCell>
                      <TableCell className="font-medium">{alert.freelancer}</TableCell>
                      <TableCell>{alert.invoiceNumber || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {alert.account.email}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(alert.statedTotal)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(alert.calculatedTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">
                          {formatCurrency(alert.discrepancyAmount)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedId === alert.id && (
                      <TableRow key={`${alert.id}-detail`}>
                        <TableCell colSpan={7} className="bg-secondary/30 p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Invoice Date:</span>{" "}
                              {alert.invoiceDate || "Not specified"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Source Email:</span>{" "}
                              {alert.sourceEmail}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Attachment:</span>{" "}
                              {alert.attachment || "Email body"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Line Items:</span>
                              <pre className="mt-1 text-xs bg-card p-2 rounded max-h-32 overflow-auto">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(alert.lineItems), null, 2);
                                  } catch {
                                    return alert.lineItems;
                                  }
                                })()}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
