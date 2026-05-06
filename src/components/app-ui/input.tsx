import * as React from "react"
import OutlinedInput from "@mui/material/OutlinedInput"
import { cn } from "@/lib/utils"

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "color" | "size"> & {
  size?: number
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <OutlinedInput
        type={type}
        inputRef={ref}
        inputProps={size ? { size } : undefined}
        data-slot="input"
        fullWidth
        className={cn("min-w-0", className)}
        sx={{
          "& .MuiOutlinedInput-input": {
            py: "9px",
            px: "12px",
            fontSize: { xs: "1rem", md: "0.875rem" },
          },
          "& .MuiOutlinedInput-input::placeholder": {
            opacity: 1,
          },
        }}
        {...props}
      />
    )
  },
)

Input.displayName = "Input"

export { Input }
