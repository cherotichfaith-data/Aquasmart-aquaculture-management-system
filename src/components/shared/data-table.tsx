"use client"

import { useState, type KeyboardEvent, type ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"
import { ResponsiveRecordList } from "@/components/shared/responsive-record-list"
import { Button } from "@/components/app-ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import { cn } from "@/lib/utils"

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
  /**
   * Renders each row as a card below the `md` breakpoint instead of a
   * horizontally-scrolling table row. Use for record-heavy tables read one
   * row at a time (a single cage, batch, or log entry) rather than compared
   * side-by-side. DataTable owns the card/button chrome and empty state --
   * this only returns the content that goes inside it. Ignored together
   * with `priorityColumnIds` (a table only needs one mobile strategy).
   */
  renderMobileCard?: (row: TRow) => ReactNode
  /**
   * Column ids to keep visible below `md` when the table should stay
   * tabular on mobile because the data is genuinely comparison-heavy
   * (e.g. a production log). Columns not listed collapse away instead of
   * forcing a full-width horizontal-scroll strip for 1-3 essential values.
   * Ignored when `renderMobileCard` is set.
   */
  priorityColumnIds?: string[]
  /**
   * Opt-in pagination (EUI table guidance: default 25 rows, a small set of
   * rows-per-page options, always show a result count, avoid infinite
   * scroll/an unpaginated scroll box). Omit to keep a table's current
   * unpaginated behavior unchanged.
   */
  pagination?: {
    pageSize?: number
    pageSizeOptions?: number[]
  }
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
  renderMobileCard,
  priorityColumnIds,
  pagination,
}: DataTableProps<TRow>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const defaultPageSize = pagination?.pageSize ?? 25
  const [paginationState, setPaginationState] = useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize })
  const isPriorityColumn = (id: string) => !priorityColumnIds || priorityColumnIds.includes(id)

  // TanStack Table intentionally returns non-memoizable functions; suppress the React Compiler library warning locally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, ...(pagination ? { pagination: paginationState } : {}) },
    onSortingChange: setSorting,
    onPaginationChange: pagination ? setPaginationState : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
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

  const table_ = (
    <div className={`soft-table-shell ${shellClassName}`}>
      <Table className={tableClassName}>
        {flatColumns.some((column) => column.columnDef.meta?.width) ? (
          <colgroup>
            {flatColumns.map((column) => (
              <col
                key={column.id}
                style={column.columnDef.meta?.width ? { width: column.columnDef.meta.width } : undefined}
                className={priorityColumnIds && !isPriorityColumn(column.id) ? "hidden md:table-column" : undefined}
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
                const priorityHidden = priorityColumnIds && !isPriorityColumn(header.column.id)

                return (
                  <TableHead key={header.id} className={cn(headerCellClass, priorityHidden && "hidden md:table-cell")}>
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
                    className={cn(
                      "py-2 align-middle",
                      cell.column.columnDef.meta?.align === "right" && "text-right",
                      priorityColumnIds && !isPriorityColumn(cell.column.id) && "hidden md:table-cell",
                    )}
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

  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 25, 50]
  const paginationControls = pagination ? (
    <DataTablePagination table={table} totalRows={data.length} pageSizeOptions={pageSizeOptions} />
  ) : null
  const mobileData = pagination ? table.getRowModel().rows.map((row) => row.original) : data

  if (!renderMobileCard) {
    return (
      <>
        {table_}
        {paginationControls}
      </>
    )
  }

  return (
    <>
      <ResponsiveRecordList
        className="md:hidden"
        data={mobileData}
        rowKey={rowKey}
        renderCard={renderMobileCard}
        onRowClick={onRowClick}
        emptyMessage={emptyMessage}
      />
      <div className="md:hidden">{paginationControls}</div>
      <div className="hidden md:block">
        {table_}
        {paginationControls}
      </div>
    </>
  )
}

function DataTablePagination<TRow>({
  table,
  totalRows,
  pageSizeOptions,
}: {
  table: ReturnType<typeof useReactTable<TRow>>
  totalRows: number
  pageSizeOptions: number[]
}) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = Math.min(totalRows, (pageIndex + 1) * pageSize)
  const showPageSizeSelect = pageSizeOptions.length > 1 && totalRows > Math.min(...pageSizeOptions)

  // Nothing to page through -- a bar of disabled controls and "Page 1 of 1"
  // is noise, not information.
  if (pageCount <= 1 && !showPageSizeSelect) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-1 py-3 text-sm text-muted-foreground">
      <span>
        {totalRows === 0 ? "No results" : `Showing ${firstRow}–${lastRow} of ${totalRows}`}
      </span>
      <div className="flex items-center gap-3">
        {showPageSizeSelect ? (
          <label className="flex items-center gap-1.5">
            <span className="whitespace-nowrap">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <span className="whitespace-nowrap">
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
