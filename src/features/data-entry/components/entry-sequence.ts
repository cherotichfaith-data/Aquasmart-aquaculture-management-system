"use client"
import { useRef } from "react"
import { useWatch, type FieldValues, type UseFormReturn, type DefaultValues } from "react-hook-form"
import { type SystemOption } from "@/lib/system-options"
import { findUnitForSystem } from "./form-support"

export function useEntrySequence<T extends FieldValues>(form: UseFormReturn<T>, systems: SystemOption[]) {
  const advance = useRef(false)
  const current = useWatch({ control: form.control }) as FieldValues
  const index = systems.findIndex((system) => String(system.id) === current.system_id)
  const next = index >= 0 ? systems[index + 1] : undefined
  return {
    next,
    requestNext: (value: boolean) => { advance.current = value },
    reset: (values: DefaultValues<T>) => {
      const target = advance.current ? next : undefined
      advance.current = false
      form.reset((target ? { ...values, system_id: String(target.id), ...("unit" in values ? { unit: findUnitForSystem(systems, target.id) } : {}) } : values) as DefaultValues<T>)
    },
  }
}
