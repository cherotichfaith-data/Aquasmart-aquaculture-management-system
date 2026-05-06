"use client"

import * as React from "react"
import Box from "@mui/material/Box"
import MuiTab from "@mui/material/Tab"
import MuiTabs from "@mui/material/Tabs"
import type { TabsProps as MuiTabsProps } from "@mui/material/Tabs"
import { cn } from "@/lib/utils"

type TabsContextValue = {
  value: string
  onValueChange?: (value: string) => void
  idBase: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>")
  }

  return context
}

function Tabs({
  className,
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const generatedId = React.useId()
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const isControlled = controlledValue != null
  const value = isControlled ? controlledValue : uncontrolledValue

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [isControlled, onValueChange],
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange, idBase: generatedId }}>
      <Box data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </Box>
    </TabsContext.Provider>
  )
}

type TabsListProps = Omit<MuiTabsProps, "value" | "onChange" | "children"> & {
  children?: React.ReactNode
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    const { value, onValueChange } = useTabsContext()
    return (
      <MuiTabs
        ref={ref}
        value={value}
        onChange={(_event, nextValue) => onValueChange?.(String(nextValue))}
        variant="scrollable"
        scrollButtons="auto"
        data-slot="tabs-list"
        className={cn(className)}
        sx={{
          minHeight: 44,
          width: "fit-content",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: "background.paper",
          px: 0.5,
          "& .MuiTabs-indicator": {
            display: "none",
          },
          "& .MuiTabs-flexContainer": {
            gap: 0.5,
          },
        }}
        {...props}
      />
    )
  },
)

TabsList.displayName = "TabsList"

type TabsTriggerProps = {
  value: string
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLElement>
}

function TabsTrigger({ className, value, disabled, onClick, children, ...props }: TabsTriggerProps) {
  const { value: selectedValue, idBase } = useTabsContext()
  const active = selectedValue === value

  return (
    <MuiTab
      data-slot="tabs-trigger"
      aria-controls={`${idBase}-panel-${value}`}
      id={`${idBase}-tab-${value}`}
      disabled={disabled}
      value={value}
      disableRipple
      label={children}
      onClick={(event) => {
        onClick?.(event)
      }}
      className={cn(className)}
      sx={{
        minHeight: 40,
        borderRadius: 1,
        border: (theme) => `1px solid ${active ? theme.palette.divider : "transparent"}`,
        bgcolor: active ? "background.default" : "transparent",
        color: active ? "text.primary" : "text.secondary",
        textTransform: "none",
        fontSize: "0.875rem",
        fontWeight: active ? 600 : 500,
        px: 1.5,
        py: 1,
        minWidth: 0,
        "&.Mui-focusVisible": {
          outline: "2px solid var(--color-ring)",
          outlineOffset: 2,
        },
      }}
      {...props}
    />
  )
}

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    value: string
    forceMount?: boolean
  }
>(({ className, value, forceMount = false, children, ...props }, ref) => {
  const { value: selectedValue, idBase } = useTabsContext()
  const active = selectedValue === value

  if (!active && !forceMount) {
    return null
  }

  return (
    <Box
      ref={ref}
      role="tabpanel"
      hidden={!active}
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    >
      {children}
    </Box>
  )
})

TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
