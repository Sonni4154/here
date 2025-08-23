import SyncScheduler from "@/components/sync/sync-scheduler";

export default function SyncSchedulerPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sync Scheduler</h1>
        <p className="text-slate-600 mt-2">
          Manage automated sync schedules with intelligent recommendations
        </p>
      </div>
      <SyncScheduler />
    </div>
  );
}