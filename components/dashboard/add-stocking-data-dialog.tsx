"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Upload } from "lucide-react"
import * as XLSX from "xlsx"

export function AddStockingDataDialog() {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    // Manual Entry State
    const [date, setDate] = useState("")
    const [systemId, setSystemId] = useState("")
    const [quantity, setQuantity] = useState("")
    const [totalWeight, setTotalWeight] = useState("")
    const [abw, setAbw] = useState("")
    const [source, setSource] = useState("")

    // Excel Upload State
    const [file, setFile] = useState<File | null>(null)

    const handleManualSubmit = async () => {
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const { error: insertError } = await supabase
                .from("stocking_events")
                .insert({
                    stocking_date: date,
                    system_id: parseInt(systemId),
                    number_of_fish: parseInt(quantity),
                    total_weight_kg: parseFloat(totalWeight),
                    average_body_weight_g: parseFloat(abw),
                    source: source,
                })

            if (insertError) throw insertError

            setSuccess("Stocking data added successfully!")
            setOpen(false)
            router.refresh()

            // Reset form
            setDate("")
            setSystemId("")
            setQuantity("")
            setTotalWeight("")
            setAbw("")
            setSource("")

        } catch (err: any) {
            setError(err.message || "Failed to add stocking data")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleExcelSubmit = async () => {
        if (!file) {
            setError("Please select a file first")
            return
        }

        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

            // Expected columns: Date, System ID, Number of Fish, Total Weight, ABW, Source
            // We map these to database columns
            const formattedData = jsonData.map((row) => ({
                stocking_date: row["Date"] || row["date"], // Adjust keys based on expected Excel header
                system_id: row["System ID"] || row["system_id"],
                number_of_fish: row["Number of Fish"] || row["number_of_fish"],
                total_weight_kg: row["Total Weight"] || row["total_weight"],
                average_body_weight_g: row["ABW"] || row["abw"],
                source: row["Source"] || row["source"],
            }))

            // Validate data (basic check)
            const invalidRows = formattedData.filter(
                (r) => !r.stocking_date || !r.system_id || !r.number_of_fish || !r.total_weight_kg
            )

            if (invalidRows.length > 0) {
                throw new Error(`Found ${invalidRows.length} rows with missing required data. Check headers.`)
            }

            const { error: insertError } = await supabase
                .from("stocking_events")
                .insert(formattedData)

            if (insertError) throw insertError

            setSuccess(`Successfully imported ${formattedData.length} records!`)
            setOpen(false)
            router.refresh()
            setFile(null)

        } catch (err: any) {
            setError(err.message || "Failed to process Excel file")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-9 rounded-full px-4 text-xs font-semibold shadow-sm">
                    Add data
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Stocking Data</DialogTitle>
                    <DialogDescription>
                        Enter stocking information manually or upload an Excel sheet.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="upload">Upload Excel</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="systemId">System ID</Label>
                            <Input id="systemId" type="number" placeholder="Enter System ID (e.g., 1)" value={systemId} onChange={(e) => setSystemId(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input id="quantity" type="number" placeholder="Number of Fish" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="totalWeight">Total Weight (kg)</Label>
                                <Input id="totalWeight" type="number" placeholder="Total Weight" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="abw">ABW (g)</Label>
                                <Input id="abw" type="number" placeholder="Avg Body Weight" value={abw} onChange={(e) => setAbw(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="source">Source</Label>
                                <Select value={source} onValueChange={setSource}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Hatchery">Hatchery</SelectItem>
                                        <SelectItem value="Farm">Farm</SelectItem>
                                        <SelectItem value="Wild">Wild</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button className="w-full mt-4" onClick={handleManualSubmit} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Record
                        </Button>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="excel">Excel File</Label>
                            <Input id="excel" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
                            <p className="text-xs text-muted-foreground mt-2">
                                Expected columns: Date, System ID, Number of Fish, Total Weight, ABW, Source.
                            </p>
                        </div>
                        <Button className="w-full mt-4" onClick={handleExcelSubmit} disabled={isLoading || !file}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload & Import
                        </Button>
                    </TabsContent>
                </Tabs>

                {error && (
                    <Alert variant="destructive" className="mt-2">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert className="mt-2 text-green-600 border-green-600">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

            </DialogContent>
        </Dialog>
    )
}
