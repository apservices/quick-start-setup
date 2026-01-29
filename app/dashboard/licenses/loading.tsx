import { LoadingCard } from "@/components/loading-state"

export default function LicensesLoading() {
  return (
    <div className="p-6">
      <LoadingCard title="Loading Licenses" description="Fetching license data..." />
    </div>
  )
}
