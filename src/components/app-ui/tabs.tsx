"use client"

import * as React from "react"
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
      <div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

type TabsListProps = React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="tabs-list"
        className={cn("inline-flex w-fit items-center gap-1 rounded-md border bg-background p-1", className)}
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
  const { value: selectedValue, idBase, onValueChange } = useTabsContext()
  const active = selectedValue === value

  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      aria-controls={`${idBase}-panel-${value}`}
      id={`${idBase}-tab-${value}`}
      aria-selected={active}
      role="tab"
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onValueChange?.(value)
        }
      }}
      className={cn(
        "inline-flex min-h-10 min-w-0 items-center justify-center rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active ? "border-border bg-card text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
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
    <div
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
    </div>
  )
})

TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
