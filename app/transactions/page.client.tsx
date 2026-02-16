"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { Clock, Fish, Droplets, AlertCircle, CornerDownRight } from "lucide-react"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"

export default function TransactionsPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")
  const activitiesQuery = useRecentActivities({ limit: 50 })
  const activities = activitiesQuery.data?.status === "success" && activitiesQuery.data.data ? activitiesQuery.data.data : []
  const loading = activitiesQuery.isLoading

  const normalizeTableName = (table: string) => {
    switch (table) {
      case "feeding_events":
      case "feeding_record":
        return "feeding_record"
      case "sampling_events":
      case "fish_sampling_weight":
        return "fish_sampling_weight"
      case "water_quality_events":
      case "water_quality_measurement":
        return "water_quality_measurement"
      case "mortality_events":
      case "fish_mortality":
        return "fish_mortality"
      case "transfer_events":
      case "fish_transfer":
        return "fish_transfer"
      case "harvest_events":
      case "fish_harvest":
        return "fish_harvest"
      case "incoming_feed_events":
      case "feed_incoming":
        return "feed_incoming"
      case "stocking_events":
      case "fish_stocking":
        return "fish_stocking"
      default:
        return table
    }
  }

  const getIcon = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return <Clock size={16} />
      case "fish_sampling_weight":
        return <Fish size={16} />
      case "water_quality_measurement":
        return <Droplets size={16} />
      case "fish_mortality":
        return <AlertCircle size={16} />
      case "fish_transfer":
        return <CornerDownRight size={16} />
      case "fish_harvest":
        return <Fish size={16} />
      case "feed_incoming":
        return <Clock size={16} />
      case "fish_stocking":
        return <Fish size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const getColor = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return "bg-blue-500/10 text-blue-600"
      case "fish_sampling_weight":
        return "bg-purple-500/10 text-purple-600"
      case "water_quality_measurement":
        return "bg-green-500/10 text-green-600"
      case "fish_mortality":
        return "bg-red-500/10 text-red-600"
      case "fish_transfer":
        return "bg-orange-500/10 text-orange-600"
      case "fish_harvest":
        return "bg-lime-500/10 text-lime-600"
      case "feed_incoming":
        return "bg-sky-500/10 text-sky-600"
      case "fish_stocking":
        return "bg-indigo-500/10 text-indigo-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Activities Log</h1>
            <p className="text-muted-foreground mt-1">View recent farm activities and events</p>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Table</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Record</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Details</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className={`p-2 rounded-lg w-fit ${getColor(activity.table_name)}`}>
                          {getIcon(activity.table_name)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{activity.table_name}</td>
                      <td className="px-6 py-4 text-sm">{activity.record_id}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium">{activity.change_type}</p>
                          <p className="text-muted-foreground">
                            {activity.column_name ? `Column: ${activity.column_name}` : "Row update"}{" "}
                            {activity.new_value ? `-> ${activity.new_value}` : ""}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{activity.change_time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No activities found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Activities</p>
            <p className="text-2xl font-bold mt-1">{activities.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Feeding Records</p>
            <p className="text-2xl font-bold mt-1">
              {activities.filter((a) => normalizeTableName(a.table_name) === "feeding_record").length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Mortality Events</p>
            <p className="text-2xl font-bold mt-1">
              {activities.filter((a) => normalizeTableName(a.table_name) === "fish_mortality").length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Samplings</p>
            <p className="text-2xl font-bold mt-1">
              {activities.filter((a) => normalizeTableName(a.table_name) === "fish_sampling_weight").length}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

