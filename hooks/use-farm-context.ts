"use client"

import { useState, useCallback } from "react"

interface FarmContext {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "nursing" | "grow-out"
  setBatch: (batch: string) => void
  setSystem: (system: string) => void
  setStage: (stage: "nursing" | "grow-out") => void
}

export function useFarmContext(): FarmContext {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"nursing" | "grow-out">("grow-out")

  const setBatch = useCallback((batch: string) => {
    setSelectedBatch(batch)
  }, [])

  const setSystem = useCallback((system: string) => {
    setSelectedSystem(system)
  }, [])

  const setStage = useCallback((stage: "nursing" | "grow-out") => {
    setSelectedStage(stage)
  }, [])

  return {
    selectedBatch,
    selectedSystem,
    selectedStage,
    setBatch,
    setSystem,
    setStage,
  }
}
