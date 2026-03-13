"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { MOCK_ALERTS, MOCK_ACCOUNTS_SIMPLE } from "@/lib/mock-data";

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
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [usingMockData, setUsingMockData] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        const accs = Array.isArray(data) ? data : [];
        if (accs.length === 0) {
          // No real accounts — use mock data for preview
          setAccounts(MOCK_ACCOUNTS_SIMPLE);
          setAlerts(MOCK_ALERTS as Alert[]);
          setTotal(MOCK_ALERTS.length);
          setUsingMockData(true);
          setLoading(false);
        } else {
          setAccounts(accs);
          setUsingMockData(false);
        }
      })
      .catch(() => {
        setAccounts(MOCK_ACCOUNTS_SIMPLE);
        setAlerts(MOCK_ALERTS as Alert[]);
        setTotal(MOCK_ALERTS.length);
        setUsingMockData(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (usingMockData) return;
    if (accounts.length === 0) return;

    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
    if (selectedAccount !== "all") params.set("accountId", selectedAccount);

    fetch(`/api/alerts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const realAlerts = data.alerts || [];
        if (realAlerts.length === 0 && page === 0) {
          // No real alerts yet — show mock data
          setAlerts(MOCK_ALERTS as Alert[]);
          setTotal(MOCK_ALERTS.length);
          setUsingMockData(true);
        } else {
          setAlerts(realAlerts);
          setTotal(data.total || 0);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedAccount, page, usingMockData, accounts]);

  const totalPages = Math.ceil(total / limit);

  // Summary stats
  const totalDiscrepancy = alerts.reduce((sum, a) => sum + a.discrepancyAmount, 0);
  const avgDiscrepancy = alerts.length > 0 ? totalDiscrepancy / alerts.length : 0;
  const largestDiscrepancy = alerts.length > 0 ? Math.max(...alerts.map((a) => a.discrepancyAmount)) : 0;

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
          <Link href="/dashboard/reports">
            <Button variant="outline" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </Button>
          </Link>
        </div>
      </div>

      {usingMockData && (
        <div className="bg-primary/10 text-primary text-sm px-4 py-2 rounded-lg border border-primary/20">
          Showing demo data — connect an Outlook account to see real alerts
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Discrepancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalDiscrepancy)}</p>
            <p className="text-xs text-muted-foreground mt-1">across {total} invoice{total !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Discrepancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(avgDiscrepancy)}</p>
            <p className="text-xs text-muted-foreground mt-1">per flagged invoice</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Largest Discrepancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(largestDiscrepancy)}</p>
            <p className="text-xs text-muted-foreground mt-1">single invoice</p>
          </CardContent>
        </Card>
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
                    <TableRow
                      key={alert.id}
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => router.push(`/dashboard/alerts/${alert.id}`)}
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
