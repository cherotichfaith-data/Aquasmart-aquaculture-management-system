"use client"

import { useState } from "react"
import FeedingForm from "./forms/feeding-form"
import SamplingForm from "./forms/sampling-form"
import MortalityForm from "./forms/mortality-form"
import HarvestForm from "./forms/harvest-form"
import TransferForm from "./forms/transfer-form"
import StockingForm from "./forms/stocking-form"

interface TransactionFormProps {
  type: string
  onClose: () => void
}

export default function TransactionForm({ type, onClose }: TransactionFormProps) {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => {
      onClose()
      setSubmitted(false)
    }, 2000)
  }

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="text-4xl mb-2">✓</div>
        <p className="font-semibold">Transaction recorded successfully</p>
        <p className="text-sm text-muted-foreground">Closing form...</p>
      </div>
    )
  }

  switch (type) {
    case "feeding":
      return <FeedingForm onSubmit={handleSubmit} />
    case "sampling":
      return <SamplingForm onSubmit={handleSubmit} />
    case "mortality":
      return <MortalityForm onSubmit={handleSubmit} />
    case "harvest":
      return <HarvestForm onSubmit={handleSubmit} />
    case "transfer":
      return <TransferForm onSubmit={handleSubmit} />
    case "stocking":
      return <StockingForm onSubmit={handleSubmit} />
    default:
      return null
  }
}
