import { LoadingCard } from "@/components/loading-state"

export default function AssetsLoading() {
  return (
    <div className="p-6">
      <LoadingCard title="Loading Asset Library" description="Fetching assets..." />
    </div>
  )
}
