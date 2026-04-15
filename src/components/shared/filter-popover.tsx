"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { Check, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type FilterPopoverOption = {
  value: string
  label: string
  description?: string
  keywords?: string[]
}

type FilterPopoverProps = {
  label: string
  value: string
  options: FilterPopoverOption[]
  placeholder: string
  onChange: (value: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  searchable?: boolean
  triggerClassName?: string
  contentClassName?: string
}

const normalize = (value: string) => value.trim().toLowerCase()

export function FilterPopover({
  label,
  value,
  options,
  placeholder,
  onChange,
  searchPlaceholder = "Search options",
  emptyMessage = "No matching options found.",
  disabled = false,
  searchable = false,
  triggerClassName,
  contentClassName,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value])
  const showSearch = searchable || options.length > 8
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery)
    if (!normalizedQuery) return options

    return options.filter((option) => {
      const haystack = [option.label, option.description ?? "", ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [deferredQuery, options])

  useEffect(() => {
    if (open) return
    setQuery("")
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "topbar-control group flex h-10 w-full min-w-0 items-center gap-3 rounded-lg border border-border/80 bg-card/92 px-3 text-left shadow-[0_12px_24px_-22px_rgba(15,23,32,0.18)] transition duration-200 hover:border-primary/24 hover:shadow-[0_16px_26px_-22px_rgba(15,23,32,0.2)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
            triggerClassName,
          )}
          aria-label={label}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </div>
              <div className="truncate text-sm font-medium text-foreground">
                {selectedOption?.label ?? placeholder}
              </div>
            </div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className={cn(
          "w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border-border/80 bg-card/98 p-2 shadow-[0_24px_44px_-32px_rgba(15,23,32,0.32)] backdrop-blur-xl",
          contentClassName,
        )}
      >
        <div className="space-y-2">
          {showSearch ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="soft-input-surface h-10 rounded-lg border-border/70 bg-background pl-9"
              />
            </div>
          ) : null}

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition duration-200",
                      isSelected
                        ? "border-primary/30 bg-accent/70"
                        : "border-transparent bg-background/70 hover:border-border/60 hover:bg-muted/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/80 bg-card text-transparent",
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{option.label}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
