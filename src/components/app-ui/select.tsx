"use client"

import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"
import type * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type SelectItemDef = {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

type SelectContextValue = {
  value: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  contentChildren: React.ReactNode
  setContentChildren: (children: React.ReactNode) => void
  triggerId: string
}

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within <Select>")
  }
  return context
}

function flattenSelectItems(children: React.ReactNode): SelectItemDef[] {
  const items: SelectItemDef[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === SelectItem) {
      items.push({
        value: String(child.props.value),
        label: child.props.children,
        disabled: child.props.disabled,
      })
      return
    }
    if (child.type === SelectGroup || child.type === Fragment) {
      items.push(...flattenSelectItems(child.props.children))
    }
  })

  return items
}

function findSelectValuePlaceholder(children: React.ReactNode): string | undefined {
  let placeholder: string | undefined

  Children.forEach(children, (child) => {
    if (!isValidElement(child) || placeholder) return
    if (child.type === SelectValue) {
      placeholder = child.props.placeholder
      return
    }
    if (child.props?.children) {
      placeholder = findSelectValuePlaceholder(child.props.children)
    }
  })

  return placeholder
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "")
  const [contentChildren, setContentChildren] = useState<React.ReactNode>(null)
  const resolvedValue = value ?? internalValue
  const triggerId = useId()

  return (
    <SelectContext.Provider
      value={{
        value: resolvedValue,
        onValueChange: (next) => {
          if (value == null) {
            setInternalValue(next)
          }
          onValueChange?.(next)
        },
        disabled,
        contentChildren,
        setContentChildren,
        triggerId,
      }}
    >
      {children}
    </SelectContext.Provider>
  )
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SelectValue(props: { placeholder?: string }) {
  void props.placeholder
  return null
}

function SelectTrigger({
  className,
  size = "default",
  children,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  disabled,
}: React.ComponentProps<"div"> & {
  size?: "sm" | "default"
  disabled?: boolean
}) {
  const { value, onValueChange, disabled: rootDisabled, contentChildren } = useSelectContext()
  const items = useMemo(() => flattenSelectItems(contentChildren), [contentChildren])
  const placeholder = findSelectValuePlaceholder(children)
  const { triggerId } = useSelectContext()

  return (
    <div
      data-slot="select-trigger"
      className={cn(
        "relative w-fit",
        className,
      )}
    >
      <select
        id={id ?? triggerId}
        data-slot="select-input"
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        value={value ?? ""}
        onChange={(event) => onValueChange?.(event.target.value)}
        disabled={rootDisabled || disabled}
        className={cn(
          "h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm text-foreground ring-offset-background outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" && "h-8 text-xs",
        )}
      >
        <option value="" disabled hidden>
          {placeholder ?? ""}
        </option>
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {typeof item.label === "string" ? item.label : String(item.value)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function SelectContent({ children }: { children: React.ReactNode }) {
  const { setContentChildren } = useSelectContext()

  useEffect(() => {
    setContentChildren(children)
    return () => setContentChildren(null)
  }, [children, setContentChildren])

  return null
}

function SelectLabel({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SelectItem({
  children,
}: React.ComponentProps<"div"> & {
  value: string
  disabled?: boolean
}) {
  return <>{children}</>
}

function SelectSeparator() {
  return null
}

function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
