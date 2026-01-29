import { LoadingCard } from "@/components/loading-state"

export default function CaptureViewerLoading() {
  return (
    <div className="p-6">
      <LoadingCard title="Loading Capture Viewer" description="Fetching captured assets..." />
    </div>
  )
}
