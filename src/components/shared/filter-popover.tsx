"use client"

import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnchoredPopover } from "@/components/app-ui/popover"

export type FilterPopoverOption = {
  value: string
  label: string
  description?: string
  keywords?: string[]
}

type FilterPopoverProps = {
  label?: string
  value: string
  options: FilterPopoverOption[]
  placeholder: string
  onChange: (value: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  searchable?: boolean
  className?: string
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
  className,
  contentClassName,
}: FilterPopoverProps) {
  const resolvedLabel = typeof label === "string" ? label.trim() : ""
  const showLabel = resolvedLabel.length > 0
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value])
  const showSearch = searchable || options.length > 8
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    setAnchorEl(node)
  }, [])

  const closePopover = () => {
    setOpen(false)
    setQuery("")
  }

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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={resolvedLabel || placeholder}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-10 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none disabled:opacity-60",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          {showLabel ? (
            <span className="block truncate text-[11px] uppercase leading-tight tracking-[0.08em] text-muted-foreground">
              {resolvedLabel}
            </span>
          ) : null}
          <span className={cn("block truncate text-sm font-semibold text-foreground", showLabel && "mt-0.5")}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
      </button>
      <AnchoredPopover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        align="start"
        className={cn("w-[min(24rem,calc(100vw-24px))] p-2", contentClassName)}
      >
        <div className="grid gap-2">
          {showSearch ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : null}

          <div className="grid max-h-80 gap-1.5 overflow-y-auto pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-[color-mix(in_srgb,var(--color-foreground)_3%,transparent)] px-4 py-6">
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
                      closePopover()
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-background",
                      isSelected
                        ? "border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
                        : "border-transparent bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-transparent",
                      )}
                    >
                      <Check size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{option.description}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </AnchoredPopover>
    </>
  )
}
