"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Lightweight Select built on <select> + <option>, matching the     */
/*  shadcn/ui API (value, onValueChange, SelectTrigger, etc.)         */
/* ------------------------------------------------------------------ */

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  items: { value: string; label: string }[]
  registerItem: (value: string, label: string) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

function Select({ value: controlledValue, defaultValue, onValueChange, children, disabled }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [items, setItems] = React.useState<{ value: string; label: string }[]>([])

  const value = controlledValue !== undefined ? controlledValue : internalValue
  const handleChange = (v: string) => {
    if (controlledValue === undefined) setInternalValue(v)
    onValueChange?.(v)
  }

  const registerItem = React.useCallback((val: string, label: string) => {
    setItems((prev) => {
      if (prev.some((i) => i.value === val)) return prev
      return [...prev, { value: val, label }]
    })
  }, [])

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleChange, items, registerItem }}>
      {children}
    </SelectContext.Provider>
  )
}

/* -- SelectTrigger -- renders a native <select> */
interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    if (!ctx) return null

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        <select
          value={ctx.value}
          onChange={(e) => ctx.onValueChange(e.target.value)}
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {ctx.items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

/* -- SelectValue -- placeholder is just for display when empty */
function SelectValue({ placeholder }: { placeholder?: string }) {
  // Handled by the native <select> inside SelectTrigger
  return null
}

/* -- SelectContent -- just renders children so SelectItem can register */
function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/* -- SelectItem -- registers itself with the context */
function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext)

  React.useEffect(() => {
    if (ctx) {
      const label = typeof children === "string" ? children : value
      ctx.registerItem(value, label)
    }
  }, [value, children, ctx])

  return null
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
