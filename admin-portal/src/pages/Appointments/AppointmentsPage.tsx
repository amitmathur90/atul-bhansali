import { APPOINTMENT_STATUS_TRANSITIONS, type AppointmentStatus } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";
import type { Paginated } from "../../lib/types";

interface Appointment {
  id: string;
  purpose: string;
  preferredDate: string;
  contactNumber: string;
  status: AppointmentStatus;
  scheduledAt: string | null;
  remarks: string | null;
  createdAt: string;
  citizen: { name: string; phone: string };
}

function ActionRow({ appointment }: { appointment: Appointment }) {
  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const allowedNext = APPOINTMENT_STATUS_TRANSITIONS[appointment.status];

  const statusMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.patch(`/appointments/${appointment.id}/status`, {
          status: nextStatus,
          scheduledAt: nextStatus === "SCHEDULED" ? scheduledAt : undefined,
          remarks: remarks || undefined,
        })
      ).data,
    onSuccess: () => {
      setError(null);
      setNextStatus("");
      setScheduledAt("");
      setRemarks("");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  if (allowedNext.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="max-w-xs">
          <option value="">Select new status…</option>
          {allowedNext.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {nextStatus === "SCHEDULED" && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        )}
        <input
          placeholder="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <Button
          disabled={
            !nextStatus ||
            (nextStatus === "SCHEDULED" && !scheduledAt) ||
            statusMutation.isPending
          }
          onClick={() => statusMutation.mutate()}
        >
          {statusMutation.isPending ? "Updating…" : "Update"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function AppointmentsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () =>
      (await apiClient.get<Paginated<Appointment>>("/appointments", { params: { pageSize: 100 } })).data,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Appointments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{data?.total ?? 0} request(s)</p>
      </div>

      <Card className="overflow-x-auto p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load appointments.</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-slate-500">No appointment requests yet.</p>
        )}
        <ul>
          {data?.items.map((a) => (
            <li key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{a.citizen.name}</p>
                    <Badge tone={a.status}>{a.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.purpose}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Preferred: {new Date(a.preferredDate).toLocaleDateString()} · Contact:{" "}
                    {a.contactNumber}
                    {a.scheduledAt && <> · Scheduled: {new Date(a.scheduledAt).toLocaleString()}</>}
                  </p>
                  {a.remarks && <p className="mt-1 text-xs text-slate-500">Remarks: {a.remarks}</p>}
                </div>
              </div>
              <ActionRow appointment={a} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
