"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/app-ui/select"
import type { SystemOption } from "@/lib/system-options"
import { formatCageLabel } from "@/lib/system-options"

/**
 * Production page system selector. It keeps the selected ID internal to the URL.
 */
export default function ProductionSystemFilter({
  systems,
  selectedSystemId,
  startTransition,
}: {
  systems: SystemOption[]
  selectedSystemId: number | null
  /** See ProductionMetricFilter's `startTransition` prop for why this exists. */
  startTransition?: (callback: () => void) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("system", value)
    params.delete("cage")
    const navigate = () => router.replace(`${pathname}?${params.toString()}`)
    if (startTransition) startTransition(navigate)
    else navigate()
  }

  const options = [...systems]
    .sort((left, right) => formatCageLabel(left).localeCompare(formatCageLabel(right), undefined, { numeric: true }))

  return (
    <div className="w-[180px] shrink-0 md:w-[190px]">
      <Select value={selectedSystemId != null ? String(selectedSystemId) : undefined} onValueChange={handleSelectChange}>
        <SelectTrigger id="production-system-filter" className="production-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((system) => (
              <SelectItem key={system.id} value={String(system.id)}>
                {formatCageLabel(system)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
