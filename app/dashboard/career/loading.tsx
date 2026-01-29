import { LoadingCard } from "@/components/loading-state"

export default function CareerLoading() {
  return (
    <div className="p-6">
      <LoadingCard title="Loading Career Platform" description="Fetching your data..." />
    </div>
  )
}
