"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";

const navItems = [
  { href: "/dashboard", label: "Alerts" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/rules", label: "Rules" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/guide", label: "Guide" },
];

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardNav({ user }: { user: { email?: string | null; name?: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleNotificationClick(alertId: string, notifId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    setShowNotifications(false);
    router.push(`/dashboard/alerts/${alertId}`);
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-bold text-lg">
            RotoMath
          </Link>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n.alertId, n.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <div className={cn(!n.read ? "" : "pl-4")}>
                            <p className="text-sm font-medium leading-tight">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="relative inline-flex h-7 w-12 items-center rounded-full border border-border bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform",
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              )}
            >
              {theme === "dark" ? <MoonIcon /> : <SunIcon />}
            </span>
          </button>
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
