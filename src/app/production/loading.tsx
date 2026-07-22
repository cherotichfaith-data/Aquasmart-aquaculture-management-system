import { Skeleton } from "@/components/app-ui/skeleton"

export default function PageLoading() {
  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <Skeleton className="h-10 w-[440px] max-w-full" />
      <Skeleton className="h-[340px] rounded-2xl" />
      <Skeleton className="h-[240px] rounded-2xl" />
    </div>
  )
}
