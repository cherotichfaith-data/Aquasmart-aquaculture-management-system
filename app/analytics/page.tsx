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

        {/* Insights Tabs */}
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList>
            <TabsTrigger value="insights">Key Insights</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle>Data-Driven Insights</CardTitle>
                <CardDescription>Auto-generated insights from your farm data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-chart-1/10 border border-chart-1/30 rounded-lg">
                    <h3 className="font-semibold text-chart-1 mb-2">Strong Growth Performance</h3>
                    <p className="text-sm text-muted-foreground">
                      Your fish are growing at an optimal rate with SGR of 2.4%. This is 12% above the industry average
                      for this season.
                    </p>
                  </div>
                  <div className="p-4 bg-chart-2/10 border border-chart-2/30 rounded-lg">
                    <h3 className="font-semibold text-chart-2 mb-2">Feed Efficiency Improving</h3>
                    <p className="text-sm text-muted-foreground">
                      FCR has improved from 1.68 to 1.62 over the last 14 days. Continue monitoring water quality as it
                      correlates strongly with feed conversion.
                    </p>
                  </div>
                  <div className="p-4 bg-chart-3/10 border border-chart-3/30 rounded-lg">
                    <h3 className="font-semibold text-chart-3 mb-2">Water Quality Stable</h3>
                    <p className="text-sm text-muted-foreground">
                      All water parameters are within optimal ranges. Dissolved oxygen levels remain consistently above
                      6.5 mg/L across all systems.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions">
            <Card>
              <CardHeader>
                <CardTitle>Predictive Analysis</CardTitle>
                <CardDescription>AI-powered forecasts based on historical patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">Projected Harvest Weight</h3>
                      <span className="text-2xl font-bold text-chart-1">1,185 kg</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on current growth rate (2.4% SGR), your batch will reach harvest weight in approximately 45
                      days.
                    </p>
                    <div className="mt-3 bg-muted rounded-full h-2">
                      <div className="bg-chart-1 h-2 rounded-full" style={{ width: "68%" }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">68% of projected harvest weight</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">Predicted Feed Requirement</h3>
                      <span className="text-2xl font-bold text-chart-2">1,920 kg</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Estimated feed needed to reach harvest weight with current FCR of 1.62.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">Risk Assessment</h3>
                      <span className="text-lg font-bold text-green-600">LOW RISK</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No anomalies detected. All key metrics are within normal ranges. Probability of deviation: {"<"}5%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>Actionable Recommendations</CardTitle>
                <CardDescription>Optimize operations based on data analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl">✓</div>
                    <div>
                      <h4 className="font-semibold text-sm">Maintain Current Feed Schedule</h4>
                      <p className="text-xs text-muted-foreground">FCR is optimal. Continue with 3% daily feed rate.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl">→</div>
                    <div>
                      <h4 className="font-semibold text-sm">Increase Aeration Schedule</h4>
                      <p className="text-xs text-muted-foreground">
                        Predicted temperature rise next week. Add 2 hours to aeration to maintain DO levels.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl">📊</div>
                    <div>
                      <h4 className="font-semibold text-sm">Schedule Water Testing</h4>
                      <p className="text-xs text-muted-foreground">
                        Next comprehensive water quality test due in 5 days. Current alkalinity trending down.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <h4 className="font-semibold text-sm">Prepare for Harvest</h4>
                      <p className="text-xs text-muted-foreground">
                        Begin preparations in 6 weeks. Current trajectory suggests optimal harvest condition.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
