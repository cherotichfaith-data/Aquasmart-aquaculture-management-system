"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import type { SxProps, Theme } from "@mui/material/styles"
import Box from "@mui/material/Box"
import ButtonBase from "@mui/material/ButtonBase"
import InputAdornment from "@mui/material/InputAdornment"
import OutlinedInput from "@mui/material/OutlinedInput"
import Popover from "@mui/material/Popover"
import Typography from "@mui/material/Typography"
import { Check, ChevronDown, Search } from "lucide-react"

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
  triggerSx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
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
  triggerSx,
  contentSx,
}: FilterPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value])
  const showSearch = searchable || options.length > 8
  const open = Boolean(anchorEl)

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
    <>
      <ButtonBase
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          display: "flex",
          minHeight: 40,
          width: "100%",
          minWidth: 0,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 1.5,
          bgcolor: "background.paper",
          px: 1.5,
          py: 1,
          textAlign: "left",
          transition: (theme) =>
            theme.transitions.create(["border-color", "background-color"], {
              duration: theme.transitions.duration.shorter,
            }),
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "background.paper",
          },
          "&:focus-visible": {
            outline: "none",
            borderColor: "primary.main",
            bgcolor: "background.paper",
          },
          "&.Mui-disabled": {
            opacity: 0.6,
          },
          ...(Array.isArray(triggerSx) ? {} : triggerSx),
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "text.secondary",
              lineHeight: 1.1,
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 0.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {selectedOption?.label ?? placeholder}
          </Typography>
        </Box>
        <ChevronDown size={16} />
      </ButtonBase>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.25,
              width: "min(24rem, calc(100vw - 24px))",
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
              p: 1,
              boxShadow: "none",
              ...(Array.isArray(contentSx) ? {} : contentSx),
            },
          },
        }}
      >
        <Box sx={{ display: "grid", gap: 1 }}>
          {showSearch ? (
            <OutlinedInput
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              fullWidth
              size="small"
              startAdornment={
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              }
              sx={{
                bgcolor: "background.paper",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "divider",
                },
                "&.Mui-focused": {
                  bgcolor: "background.paper",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                },
              }}
            />
          ) : null}

          <Box sx={{ display: "grid", gap: 0.75, maxHeight: 320, overflowY: "auto", pr: 0.25 }}>
            {filteredOptions.length === 0 ? (
              <Box
                sx={{
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                  borderRadius: 2,
                  bgcolor: "color-mix(in srgb, var(--color-foreground) 3%, transparent)",
                  px: 2,
                  py: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </Box>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value

                return (
                  <ButtonBase
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setAnchorEl(null)
                    }}
                    sx={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 1.25,
                      border: isSelected
                        ? "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)"
                        : "1px solid transparent",
                      borderRadius: 1.5,
                      bgcolor: isSelected
                        ? "color-mix(in srgb, var(--color-primary) 8%, transparent)"
                        : "var(--color-surface)",
                      px: 1.5,
                      py: 1.25,
                      textAlign: "left",
                      justifyContent: "flex-start",
                      "&:hover": {
                        borderColor: "divider",
                        bgcolor: "background.default",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        border: isSelected
                          ? "1px solid var(--color-primary)"
                          : "1px solid color-mix(in srgb, var(--color-border) 90%, transparent)",
                        borderRadius: "50%",
                        bgcolor: isSelected ? "primary.main" : "background.paper",
                        color: isSelected ? "primary.contrastText" : "transparent",
                      }}
                    >
                      <Check size={13} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {option.label}
                      </Typography>
                      {option.description ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          {option.description}
                        </Typography>
                      ) : null}
                    </Box>
                  </ButtonBase>
                )
              })
            )}
          </Box>
        </Box>
      </Popover>
    </>
  )
}
