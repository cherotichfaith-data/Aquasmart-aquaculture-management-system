"use client"

import * as React from "react"
import FormLabel from "@mui/material/FormLabel"
import { cn } from "@/lib/utils"

type LabelProps = Omit<React.ComponentPropsWithoutRef<"label">, "color">

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <FormLabel
        ref={ref}
        component="label"
        data-slot="label"
        className={cn(
          "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          className,
        )}
        sx={{
          color: "inherit",
          fontSize: "0.875rem",
          fontWeight: 500,
          lineHeight: 1,
          "&.Mui-focused": {
            color: "inherit",
          },
        }}
        {...props}
      />
    )
  },
)

Label.displayName = "Label"

export { Label }
