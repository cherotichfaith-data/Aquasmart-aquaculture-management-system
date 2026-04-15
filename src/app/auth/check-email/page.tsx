import CheckEmailPageClient from "./page.client"

type SearchParams = Record<string, string | string[] | undefined>

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolved = (await searchParams) ?? {}
  const emailParam = typeof resolved.email === "string" ? resolved.email : ""

  return <CheckEmailPageClient email={emailParam} />
}
