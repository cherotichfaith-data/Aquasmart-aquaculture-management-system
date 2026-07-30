"use client"

import { useState, type KeyboardEvent, type ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"

/**
 * Declarative, generic data table on @tanstack/react-table (aquasmart-main
 * overview-table pattern). Callers pass native TanStack `ColumnDef`s; header
 * unit suffixes, fixed widths, and alignment go through `column.meta`.
 * Presentation-only — callers own data fetching, loading, and error states.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Small unit suffix rendered next to the header label, e.g. "kg". */
    unit?: string
    /** Fixed column width applied through <colgroup>, e.g. "94px". */
    width?: string
    align?: "left" | "right"
  }
}

type DataTableProps<TRow> = {
  columns: Array<ColumnDef<TRow, unknown>>
  data: TRow[]
  rowKey: (row: TRow) => string | number
  onRowClick?: (row: TRow) => void
  emptyMessage?: ReactNode
  initialSorting?: SortingState
  /** Extra classes on the scroll shell, e.g. "max-h-[480px]". */
  shellClassName?: string
  tableClassName?: string
  headerVariant?: "default" | "plain"
}

// Design-guide header: 12px/600 muted labels on a transparent row with a
// single bottom rule — no fills, no per-column borders.
const headerCellClass = "py-2.5 align-middle normal-case tracking-normal"

export function DataTable<TRow>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = "No results.",
  initialSorting,
  shellClassName = "",
  tableClassName = "",
  headerVariant = "default",
}: DataTableProps<TRow>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])

  // TanStack Table intentionally returns non-memoizable functions; suppress the React Compiler library warning locally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => String(rowKey(row)),
  })

  const handleRowKeyDown = (event: KeyboardEvent, row: TRow) => {
    if (!onRowClick) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onRowClick(row)
    }
  }

  const flatColumns = table.getAllLeafColumns()
  const usePlainHeader = headerVariant === "plain"

  return (
    <div className={`soft-table-shell ${shellClassName}`}>
      <Table className={tableClassName}>
        {flatColumns.some((column) => column.columnDef.meta?.width) ? (
          <colgroup>
            {flatColumns.map((column) => (
              <col
                key={column.id}
                style={column.columnDef.meta?.width ? { width: column.columnDef.meta.width } : undefined}
              />
            ))}
          </colgroup>
        ) : null}

        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-border bg-transparent hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta
                const align = meta?.align === "right" ? "justify-end" : "justify-start"
                const sorted = header.column.getIsSorted()
                const label = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())

                return (
                  <TableHead key={header.id} className={headerCellClass}>
                    {usePlainHeader ? (
                      <span className={`inline-flex w-full items-center gap-0.5 text-xs font-semibold text-muted-foreground ${align}`}>
                        <span>{label}</span>
                        {meta?.unit ? <span className="font-medium opacity-70">({meta.unit})</span> : null}
                      </span>
                    ) : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={`inline-flex w-full items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground ${align}`}
                      >
                        <span>{label}</span>
                        {meta?.unit ? <span className="font-medium opacity-70">({meta.unit})</span> : null}
                        {sorted ? (
                          <span className="ml-1 text-[10px] text-foreground/70">{sorted === "asc" ? "↑" : "↓"}</span>
                        ) : (
                          <span className="ml-1 text-[10px] opacity-50">↕</span>
                        )}
                      </button>
                    ) : (
                      <span className={`inline-flex w-full items-center gap-0.5 text-xs font-semibold text-muted-foreground ${align}`}>
                        <span>{label}</span>
                        {meta?.unit ? <span className="font-medium opacity-70">({meta.unit})</span> : null}
                      </span>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={
                  onRowClick
                    ? "h-12 cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40"
                    : "h-12 border-b border-border/50"
                }
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row.original) : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={`py-2 align-middle ${cell.column.columnDef.meta?.align === "right" ? "text-right" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={flatColumns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
