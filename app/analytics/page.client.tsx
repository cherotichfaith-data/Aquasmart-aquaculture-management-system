"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import AdvancedAnalyticsDashboard from "@/components/analytics/advanced-analytics-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30days")
  const [selectedMetric, setSelectedMetric] = useState("all")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-balance">Advanced Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive insights and predictive analysis for your farm</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <FarmSelector
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              onBatchChange={setSelectedBatch}
              onSystemChange={setSelectedSystem}
              onStageChange={setSelectedStage}
            />

            <div className="flex gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
              </select>

              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Metrics</option>
                <option value="growth">Growth Analysis</option>
                <option value="water-quality">Water Quality</option>
                <option value="feed">Feed Efficiency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Analytics Dashboard */}
        <AdvancedAnalyticsDashboard timeRange={timeRange} metric={selectedMetric} />

        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList>
            <TabsTrigger value="insights">Key Insights</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {["insights", "predictions", "recommendations"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === "insights"
                      ? "Data-Driven Insights"
                      : tab === "predictions"
                        ? "Predictive Analysis"
                        : "Actionable Recommendations"}
                  </CardTitle>
                  <CardDescription>
                    {tab === "insights"
                      ? "Insights will appear when enough data is available."
                      : tab === "predictions"
                        ? "Predictions will appear when enough data is available."
                        : "Recommendations will appear when enough data is available."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                    No data available yet.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}


