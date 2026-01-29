import { LoadingCard } from "@/components/loading-state"

export default function VisualPreviewLoading() {
  return (
    <div className="p-6">
      <LoadingCard title="Loading Visual Preview" description="Fetching preview data..." />
    </div>
  )
}
