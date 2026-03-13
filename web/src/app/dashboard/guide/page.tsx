"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Table of contents sections                                         */
/* ------------------------------------------------------------------ */

const sections = [
  { id: "overview", label: "Overview" },
  { id: "getting-started", label: "Getting Started" },
  { id: "alerts", label: "Alerts Dashboard" },
  { id: "accounts", label: "Accounts" },
  { id: "rules", label: "Rules" },
  { id: "ai-pipeline", label: "AI Processing" },
  { id: "file-types", label: "Supported Files" },
  { id: "dark-mode", label: "Dark Mode" },
  { id: "environment", label: "Environment Setup" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "changelog", label: "Changelog" },
];

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-24" />;
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SectionAnchor id={id} />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          {children}
        </CardContent>
      </Card>
    </>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-2">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/10 text-primary text-sm px-4 py-3 rounded-lg border border-primary/20">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("overview");

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar TOC — sticky on desktop, hidden on mobile */}
      <aside className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-24 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            User Guide
          </p>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                "block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                activeSection === s.id
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Guide</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Everything you need to know about Invoice Monitor
          </p>
        </div>

        {/* ---- Overview ---- */}
        <SectionCard
          id="overview"
          title="What Is Invoice Monitor?"
          description="AI-powered invoice validation for GDC Group"
        >
          <p>
            Invoice Monitor automatically scans incoming Outlook emails for invoices, extracts line
            items using Claude AI, and checks whether the math adds up. When the stated total on an
            invoice doesn&apos;t match the sum of line items, the app flags it as a discrepancy alert so
            your AP team can follow up before payment.
          </p>
          <p>
            The app runs on a scheduled basis (configurable per account), so once it&apos;s set up you
            don&apos;t need to do anything — it works in the background.
          </p>
        </SectionCard>

        {/* ---- Getting Started ---- */}
        <SectionCard
          id="getting-started"
          title="Getting Started"
          description="Set up your account in three steps"
        >
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-foreground mb-2">1. Create an Account</h3>
              <p>
                Go to the app URL and click <strong>Register</strong> to create a login. You&apos;ll need
                an email address and password. This is your Invoice Monitor login — it&apos;s separate
                from your Outlook credentials.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">2. Sign In</h3>
              <p>
                After registering, sign in at the login page. You&apos;ll land on the{" "}
                <strong>Alerts</strong> dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">3. Demo Mode</h3>
              <p>
                If no Outlook accounts are connected yet, the app automatically shows{" "}
                <strong>demo data</strong> so you can explore the interface. You&apos;ll see a blue banner
                at the top of each page. Once you connect a real Outlook account, the demo data is
                replaced with live results.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ---- Alerts Dashboard ---- */}
        <SectionCard
          id="alerts"
          title="Alerts Dashboard"
          description="The main view — every invoice with a math discrepancy"
        >
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Summary Cards</h3>
              <p>Three cards at the top give you a snapshot:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <Card className="bg-secondary/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Total Discrepancy</p>
                    <p className="font-semibold mt-1">Combined dollar amount across all flagged invoices</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Average Discrepancy</p>
                    <p className="font-semibold mt-1">Average discrepancy per flagged invoice</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Largest Discrepancy</p>
                    <p className="font-semibold mt-1 text-destructive">Biggest single discrepancy found</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Alerts Table</h3>
              <p>Each row shows a flagged invoice with the date, freelancer, invoice number, account, stated total, calculated total, and the discrepancy amount (as a red badge).</p>
              <p className="mt-2">
                <strong>Click any row</strong> to expand it and see more details — invoice date, source email, attachment filename, and the raw line items the AI extracted.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Filtering &amp; Pagination</h3>
              <p>
                Use the dropdown in the top-right to filter by Outlook account. If there are more than
                20 alerts, use Previous/Next buttons to page through them.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ---- Accounts ---- */}
        <SectionCard
          id="accounts"
          title="Accounts"
          description="Manage which Outlook inboxes are monitored"
        >
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Adding an Account</h3>
              <StepList
                steps={[
                  "Click the Add Account button",
                  "Enter the Outlook email address you want to monitor",
                  "Choose a Check Frequency — options range from every minute to daily at 9 AM",
                  "Click Connect with Microsoft — you'll be redirected to Microsoft's login to authorize access",
                ]}
              />
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Account Cards</h3>
              <p>Each connected account shows:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>
                  <strong>Status</strong> — <Badge className="mx-1 text-xs">Active</Badge>
                  <Badge variant="secondary" className="mx-1 text-xs">Paused</Badge> or{" "}
                  <Badge variant="outline" className="mx-1 text-xs">Awaiting sign-in</Badge>
                </li>
                <li><strong>Alert &amp; rule count</strong></li>
                <li><strong>Schedule</strong> — changeable via dropdown without disconnecting</li>
                <li><strong>Last Run / Next Run</strong> timestamps</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Actions</h3>
              <p>
                <strong>Pause/Resume</strong> stops monitoring without disconnecting.{" "}
                <strong>Remove</strong> deletes the account and all its alerts and rules.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ---- Rules ---- */}
        <SectionCard
          id="rules"
          title="Rules"
          description="Control which emails the monitor processes"
        >
          <InfoBox>
            <strong>Default behavior:</strong> Every incoming email is automatically checked for
            invoice math errors by AI, even without any rules. Rules are optional filters that narrow
            which emails get processed — they don&apos;t enable the math check.
          </InfoBox>

          <p className="mt-2">
            When you add rules, an email must match <strong>ALL</strong> enabled rules to be
            processed. Think of rules as filters that exclude irrelevant emails.
          </p>

          <div className="mt-4">
            <h3 className="font-semibold text-foreground mb-3">Rule Types</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>What It Does</TableHead>
                  <TableHead>Example</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell><Badge variant="outline">Date Range</Badge></TableCell>
                  <TableCell>Only process emails from the last N days</TableCell>
                  <TableCell className="text-muted-foreground">Last 30 days — ignores older emails</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge variant="outline">Subject Filter</Badge></TableCell>
                  <TableCell>Filter by subject line (starts with or contains)</TableCell>
                  <TableCell className="text-muted-foreground">Subject contains &quot;invoice&quot;</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge variant="outline">Sender Filter</Badge></TableCell>
                  <TableCell>Filter by sender email or domain</TableCell>
                  <TableCell className="text-muted-foreground">From *@freelancer.com</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge variant="outline">Attachment Only</Badge></TableCell>
                  <TableCell>Only process emails with file attachments</TableCell>
                  <TableCell className="text-muted-foreground">Skips plain-text emails</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-foreground mb-2">Managing Rules</h3>
            <p>
              Each rule can be <strong>Enabled/Disabled</strong> individually without deleting it, or{" "}
              <strong>Deleted</strong> permanently. Disabled rules are ignored during processing.
            </p>
          </div>
        </SectionCard>

        {/* ---- AI Processing ---- */}
        <SectionCard
          id="ai-pipeline"
          title="How the AI Processing Works"
          description="What happens when the monitor scans an inbox"
        >
          <div className="space-y-3">
            {[
              { step: "1", title: "Rule Check", desc: "If rules exist, the email must pass all enabled rules. If no rules exist, all emails pass through." },
              { step: "2", title: "Duplicate Check", desc: "The app tracks which emails have already been processed and skips them." },
              { step: "3", title: "Text Extraction", desc: "The app reads the email body. If there are .docx or .xlsx attachments, it extracts text from those too." },
              { step: "4", title: "AI Extraction", desc: "The combined text is sent to Claude AI, which identifies the freelancer name, invoice number, date, line items, and stated total." },
              { step: "5", title: "Math Validation", desc: "The app sums the extracted line items and compares to the stated total. If they don't match, it's flagged." },
              { step: "6", title: "Alert Creation", desc: "Discrepancies are saved as alerts and appear on the dashboard." },
              { step: "7", title: "Email Notifications", desc: "An internal alert email is sent to the monitored inbox, and a polite reply is sent to the freelancer asking them to review and resubmit." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted-foreground">
            After processing, the email is marked as read so it won&apos;t be processed again.
          </p>
        </SectionCard>

        {/* ---- Supported File Types ---- */}
        <SectionCard
          id="file-types"
          title="Supported File Types"
          description="What the AI can extract invoice data from"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-secondary/30">
              <CardContent className="p-3 text-center">
                <p className="text-2xl mb-1">📧</p>
                <p className="font-semibold text-sm">Email Body</p>
                <p className="text-xs text-muted-foreground mt-1">Plain text &amp; HTML</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-3 text-center">
                <p className="text-2xl mb-1">📄</p>
                <p className="font-semibold text-sm">.docx / .doc</p>
                <p className="text-xs text-muted-foreground mt-1">Word documents</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-3 text-center">
                <p className="text-2xl mb-1">📊</p>
                <p className="font-semibold text-sm">.xlsx / .xls</p>
                <p className="text-xs text-muted-foreground mt-1">Excel spreadsheets</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground mt-3">PDF attachments are not currently supported.</p>
        </SectionCard>

        {/* ---- Dark Mode ---- */}
        <SectionCard
          id="dark-mode"
          title="Dark Mode"
          description="Switch between light and dark themes"
        >
          <p>
            Use the <strong>toggle switch</strong> in the navigation bar (between the nav links and
            your email address) to switch between light and dark mode. Your preference is saved
            automatically and persists across sessions.
          </p>
        </SectionCard>

        {/* ---- Environment Setup ---- */}
        <SectionCard
          id="environment"
          title="Environment &amp; Infrastructure"
          description="For administrators setting up or maintaining the app"
        >
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "Next.js 14",
                  "TypeScript",
                  "Tailwind CSS",
                  "Prisma ORM",
                  "Neon Postgres",
                  "NextAuth.js",
                  "Claude AI",
                  "Microsoft Graph API",
                  "Vercel",
                ].map((tech) => (
                  <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Required Environment Variables</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "POSTGRES_PRISMA_URL", desc: "Neon Postgres connection string (pooled)" },
                    { name: "POSTGRES_URL_NON_POOLING", desc: "Neon Postgres direct connection string" },
                    { name: "NEXTAUTH_SECRET", desc: "Random secret for session encryption" },
                    { name: "NEXTAUTH_URL", desc: "The app's public URL" },
                    { name: "MICROSOFT_CLIENT_ID", desc: "Azure AD application (client) ID" },
                    { name: "MICROSOFT_CLIENT_SECRET", desc: "Azure AD client secret" },
                    { name: "MICROSOFT_REDIRECT_URI", desc: "OAuth callback URL" },
                    { name: "ANTHROPIC_API_KEY", desc: "Anthropic API key for Claude" },
                  ].map((v) => (
                    <TableRow key={v.name}>
                      <TableCell>
                        <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">
                          {v.name}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Azure AD Setup</h3>
              <StepList
                steps={[
                  "Go to Azure Portal → Azure Active Directory → App registrations",
                  "Create a new registration",
                  "Set the redirect URI to your-app.vercel.app/api/auth/microsoft/callback",
                  "Add Microsoft Graph API permissions: Mail.Read, Mail.ReadWrite, Mail.Send",
                  "Create a client secret and copy the value",
                  "Copy the Application (client) ID",
                  "Set both as environment variables on Vercel",
                ]}
              />
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Cron Schedule</h3>
              <p>
                The monitoring cron job runs every minute by default. On each tick, it checks all
                enabled accounts whose next run time has passed and processes their inboxes. The
                schedule is configurable in <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">vercel.json</code>.
                Note that Vercel&apos;s free tier supports cron jobs running once per day; paid plans
                support more frequent schedules.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ---- Troubleshooting ---- */}
        <SectionCard
          id="troubleshooting"
          title="Troubleshooting"
          description="Common issues and how to fix them"
        >
          <div className="space-y-4">
            {[
              {
                q: "\"Showing demo data\" banner won't go away",
                a: "You haven't connected a real Outlook account yet, or the Microsoft OAuth flow wasn't completed. Go to Accounts and follow the setup steps.",
              },
              {
                q: "Account shows \"Awaiting Microsoft sign-in\"",
                a: "The account was added but OAuth wasn't completed. Click Add Account again for that email and re-authorize through Microsoft.",
              },
              {
                q: "No alerts appearing after connecting an account",
                a: "The monitor only flags invoices with math discrepancies. If all your invoices have correct math, no alerts will appear. Also check that the cron job is running and that your rules aren't filtering out all emails.",
              },
              {
                q: "Wrong totals or line items",
                a: "The AI extraction isn't perfect. It works best with clearly structured invoices. Handwritten or heavily formatted invoices may produce inaccurate results.",
              },
            ].map((item, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <p className="font-semibold text-foreground">{item.q}</p>
                <p className="text-muted-foreground mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ---- Changelog ---- */}
        <SectionCard
          id="changelog"
          title="Version History"
          description="What changed and when"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="whitespace-nowrap font-medium">Mar 13, 2026</TableCell>
                <TableCell>Added in-app user guide, light/dark theme with toggle, mock data preview, summary stat cards, rules page improvements, default AI math-check documentation</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-nowrap font-medium">Mar 12, 2026</TableCell>
                <TableCell>Migrated from Gmail to Outlook (Microsoft Graph API)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-nowrap font-medium">Mar 11, 2026</TableCell>
                <TableCell>Initial release — Next.js web app with multi-user auth, rules engine, AI extraction, and Vercel deployment</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}
