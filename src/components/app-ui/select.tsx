"use client"

import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type * as React from "react"
import MuiSelect from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import type { SelectChangeEvent } from "@mui/material/Select"
import OutlinedInput from "@mui/material/OutlinedInput"
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
  const selectedItem = items.find((item) => item.value === value)

  const handleChange = (event: SelectChangeEvent<string>) => {
    onValueChange?.(event.target.value)
  }

  return (
    <MuiSelect
      data-slot="select-trigger"
      value={value ?? ""}
      onChange={handleChange}
      displayEmpty
      fullWidth
      size={size === "sm" ? "small" : "medium"}
      disabled={rootDisabled || disabled}
      className={cn(
        "w-fit",
        className,
      )}
      input={
        <OutlinedInput
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        />
      }
      IconComponent={ChevronDown}
      renderValue={(selected) => {
        const selectedValue = String(selected ?? "")
        if (!selectedValue) {
          return <span className="text-muted-foreground">{placeholder ?? ""}</span>
        }
        return selectedItem?.label ?? selectedValue
      }}
      sx={{
        minWidth: 0,
        "& .MuiOutlinedInput-root": {
          minHeight: size === "sm" ? 32 : 36,
          borderRadius: 1,
          bgcolor: "background.paper",
        },
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          gap: 1,
        },
        "& .MuiSelect-icon": {
          right: 10,
          width: 16,
          height: 16,
          opacity: 0.6,
        },
      }}
    >
      {items.map((item) => (
        <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
          {item.label}
        </MenuItem>
      ))}
    </MuiSelect>
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
