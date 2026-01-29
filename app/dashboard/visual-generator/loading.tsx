import { LoadingCard } from "@/components/loading-state"

export default function VisualGeneratorLoading() {
  return (
    <div className="p-6">
      <LoadingCard title="Loading Visual Generator" description="Initializing generator..." />
    </div>
  )
}
