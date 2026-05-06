"use client"

import * as React from "react"
import TableContainer from "@mui/material/TableContainer"
import MuiTable from "@mui/material/Table"
import MuiTableHead from "@mui/material/TableHead"
import MuiTableBody from "@mui/material/TableBody"
import MuiTableFooter from "@mui/material/TableFooter"
import MuiTableRow from "@mui/material/TableRow"
import MuiTableCell from "@mui/material/TableCell"
import { cn } from "@/lib/utils"

type LegacyTableCellAlign = React.ComponentPropsWithoutRef<"td">["align"]

function resolveTableAlign(align: LegacyTableCellAlign) {
  if (align === "char") {
    return "left"
  }

  return align
}

const Table = React.forwardRef<HTMLTableElement, React.ComponentProps<"table">>(({ className, ...props }, ref) => {
  return (
    <TableContainer data-slot="table-container" className="relative w-full overflow-x-auto" sx={{ background: "transparent" }}>
      <MuiTable
        ref={ref}
        data-slot="table"
        className={cn("w-full caption-bottom text-[13px] leading-6", className)}
        {...props}
      />
    </TableContainer>
  )
})

Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<"thead">>(
  ({ className, ...props }, ref) => {
    return <MuiTableHead ref={ref} data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
  },
)

TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<"tbody">>(
  ({ className, ...props }, ref) => {
    return <MuiTableBody ref={ref} data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  },
)

TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<"tfoot">>(
  ({ className, ...props }, ref) => {
    return (
      <MuiTableFooter
        ref={ref}
        data-slot="table-footer"
        className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
        {...props}
      />
    )
  },
)

TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentProps<"tr">>(({ className, ...props }, ref) => {
  return (
    <MuiTableRow
      ref={ref}
      data-slot="table-row"
      className={cn("hover:bg-muted/30 data-[state=selected]:bg-muted/50 border-b border-border/45 transition-colors", className)}
      {...props}
    />
  )
})

TableRow.displayName = "TableRow"

type TableHeadProps = Omit<React.ComponentPropsWithoutRef<"th">, "align"> & {
  align?: LegacyTableCellAlign
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(({ className, align, ...props }, ref) => {
  return (
    <MuiTableCell
      ref={ref}
      data-slot="table-head"
      component="th"
      align={resolveTableAlign(align)}
      className={cn(
        "text-foreground/78 h-10 px-2.5 text-left align-middle text-[10.5px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  )
})

TableHead.displayName = "TableHead"

type TableCellProps = Omit<React.ComponentPropsWithoutRef<"td">, "align"> & {
  align?: LegacyTableCellAlign
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(({ className, align, ...props }, ref) => {
  return (
    <MuiTableCell
      ref={ref}
      data-slot="table-cell"
      component="td"
      align={resolveTableAlign(align)}
      className={cn(
        "px-2.5 py-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  )
})

TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.ComponentProps<"caption">>(
  ({ className, ...props }, ref) => {
    return <caption ref={ref} data-slot="table-caption" className={cn("text-muted-foreground mt-4 text-sm", className)} {...props} />
  },
)

TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
