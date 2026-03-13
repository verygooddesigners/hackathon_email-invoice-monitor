"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type RangePreset = "this_month" | "last_month" | "this_year" | "last_year" | "custom";

interface Account {
  id: string;
  email: string;
}

function getPresetDates(preset: RangePreset): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "this_month":
      return {
        start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        end: now.toISOString().split("T")[0],
      };
    case "last_month": {
      const lastMonth = month === 0 ? 11 : month - 1;
      const lastYear = month === 0 ? year - 1 : year;
      const lastDay = new Date(lastYear, lastMonth + 1, 0).getDate();
      return {
        start: `${lastYear}-${String(lastMonth + 1).padStart(2, "0")}-01`,
        end: `${lastYear}-${String(lastMonth + 1).padStart(2, "0")}-${lastDay}`,
      };
    }
    case "this_year":
      return {
        start: `${year}-01-01`,
        end: now.toISOString().split("T")[0],
      };
    case "last_year":
      return {
        start: `${year - 1}-01-01`,
        end: `${year - 1}-12-31`,
      };
    default:
      return { start: "", end: "" };
  }
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function SpreadsheetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [rangePreset, setRangePreset] = useState<RangePreset>("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (rangePreset !== "custom") {
      const { start, end } = getPresetDates(rangePreset);
      setStartDate(start);
      setEndDate(end);
    }
  }, [rangePreset]);

  async function handleExport(format: string) {
    if (!startDate || !endDate) return;
    setExporting(format);

    try {
      const params = new URLSearchParams({
        format,
        startDate,
        endDate,
      });
      if (selectedAccount !== "all") params.set("accountId", selectedAccount);

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        alert(err.error || "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ||
        `export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  const isValid = startDate && endDate && startDate <= endDate;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Export invoice discrepancy data as CSV, Excel, or PDF
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date range presets */}
          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select
              value={rangePreset}
              onValueChange={(v) => setRangePreset(v as RangePreset)}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date inputs */}
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRangePreset("custom");
                }}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRangePreset("custom");
                }}
                className="w-[180px]"
              />
            </div>
            {startDate && endDate && startDate > endDate && (
              <Badge variant="destructive">End date must be after start date</Badge>
            )}
          </div>

          {/* Account filter */}
          <div className="space-y-2">
            <Label>Account Filter</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="All accounts" />
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
          </div>
        </CardContent>
      </Card>

      {/* Export format cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="group hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
              <SpreadsheetIcon />
            </div>
            <div>
              <h3 className="font-semibold">CSV</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comma-separated values. Opens in any spreadsheet app.
              </p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              disabled={!isValid || exporting === "csv"}
              onClick={() => handleExport("csv")}
            >
              {exporting === "csv" ? (
                "Exporting..."
              ) : (
                <span className="flex items-center gap-2">
                  <DownloadIcon /> Download CSV
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <SpreadsheetIcon />
            </div>
            <div>
              <h3 className="font-semibold">Excel</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Formatted .xlsx with headers, currency formatting, and totals.
              </p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              disabled={!isValid || exporting === "xlsx"}
              onClick={() => handleExport("xlsx")}
            >
              {exporting === "xlsx" ? (
                "Exporting..."
              ) : (
                <span className="flex items-center gap-2">
                  <DownloadIcon /> Download Excel
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
              <FileTextIcon />
            </div>
            <div>
              <h3 className="font-semibold">PDF</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Printable report with summary stats and formatted table.
              </p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              disabled={!isValid || exporting === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              {exporting === "pdf" ? (
                "Exporting..."
              ) : (
                <span className="flex items-center gap-2">
                  <DownloadIcon /> Download PDF
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
