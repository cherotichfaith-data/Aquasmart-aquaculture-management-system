// TB - Kimbwela Production August 2026 (version 2): Lookup Sheets K45:K53,
// C4:C12 (mortality), C15:C23 (eFCR), L:M (starting-weight phase).
// The workbook holds the starting phase's rates for the whole planning period.
export const MODEL_VERSION = "tb-workbook-v1" as const
const bounds = [1, 5, 10, 70, 140, 210, 320, 450, Infinity]
const growth = [5.675857610599987, 3.958466719947626, 3.1870056090599994, 1.6906028794145007, 1.30795196163924, 1.0028892025626273, .725375716958709, .5280807775319769, .5280807775319769]
const mortality = [.02, .02, .015, .015, .01, .01, .01, .01, .01]
const efcr = [1, 1, 1.2, 1.3, 1.35, 1.4, 1.5, 1.6, 1.7]
export function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s }
export function planDays(start: string, end: string) {
 if (!validDate(start) || !validDate(end)) throw new Error("Choose valid planning dates.")
 const days = (Date.parse(end)-Date.parse(start))/86400000+1
 if (days<1 || days>62) throw new Error("Choose a planning period of 1–62 days.")
 return days
}
export function calculateFeed(stock: number, abw: number, start: string, end: string) {
 const days=planDays(start,end)
 if (!Number.isInteger(stock) || stock<0 || stock>10_000_000 || !Number.isFinite(abw) || abw<.3 || abw>1000) throw new Error("Enter a whole fish count and ABW between 0.3 and 1,000 g.")
 const phase=bounds.findIndex(bound=>abw<bound)
 const monthEnd=new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7)),0)).toISOString().slice(0,10)
 const fullMonth=start.endsWith("-01") && end===monthEnd
 // Exact monthly workbook mortality for calendar months. Custom periods use
 // compounded survival on a 30-day basis; this assumption is disclosed in the UI.
 const mortalityPct=fullMonth ? mortality[phase] : 1-Math.pow(1-mortality[phase],days/30)
 const deaths=Math.round(stock*mortalityPct)
 const endFish=stock-deaths
 const endAbw=abw*Math.pow(1+growth[phase]/100,days)
 const gainKg=(endFish*endAbw-stock*abw)/1000
 const feedKg=Math.max(0,gainKg*efcr[phase])
 return {phase:phase+1,days,growth_pct:growth[phase],mortality_pct:mortalityPct*100,efcr:efcr[phase],deaths,end_fish:endFish,end_abw_g:endAbw,feed_kg:feedKg,average_daily_kg:feedKg/days}
}
