import { COMPLAINT_STATUS_TRANSITIONS, StaffRole } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { useStaffOptions } from "../../hooks/useLookups";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";
import type { Complaint } from "../../lib/types";
import { useAuthStore } from "../../store/authStore";

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const staff = useAuthStore((s) => s.staff);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => (await apiClient.get<Complaint>(`/complaints/${id}`)).data,
    enabled: !!id,
  });

  const staffOptions = useStaffOptions();

  const assignMutation = useMutation({
    mutationFn: async (staffId: string) =>
      (await apiClient.patch(`/complaints/${id}/assign`, { staffId })).data,
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["complaint", id] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.patch(`/complaints/${id}/status`, { status: nextStatus, remarks })).data,
    onSuccess: () => {
      setActionError(null);
      setRemarks("");
      setNextStatus("");
      queryClient.invalidateQueries({ queryKey: ["complaint", id] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!complaint) return <p className="text-sm text-red-600">Complaint not found.</p>;

  const canAssign = staff?.role === StaffRole.MLA || staff?.role === StaffRole.SUPER_ADMIN;
  const canUpdateStatus =
    staff?.role === StaffRole.MLA ||
    staff?.role === StaffRole.SUPER_ADMIN ||
    complaint.assignedStaff?.id === staff?.id;
  const allowedNextStatuses = COMPLAINT_STATUS_TRANSITIONS[complaint.status];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/complaints" className="text-sm text-brand-navy hover:underline">
          ← Back to complaints
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {complaint.complaintNumber} — {complaint.title}
          </h1>
          <div className="mt-1 flex gap-2">
            <Badge tone={complaint.status}>{complaint.status.replace("_", " ")}</Badge>
            <Badge tone={complaint.priority}>{complaint.priority}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Details</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Category</dt>
            <dd>{complaint.category.name}</dd>
            <dt className="text-slate-500">Ward</dt>
            <dd>
              Ward {complaint.ward.wardNumber} — {complaint.ward.name}
            </dd>
            <dt className="text-slate-500">Address</dt>
            <dd>{complaint.address}</dd>
            {complaint.latitude != null && complaint.longitude != null && (
              <>
                <dt className="text-slate-500">GPS</dt>
                <dd>
                  <a
                    href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-navy hover:underline"
                  >
                    {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                  </a>
                </dd>
              </>
            )}
            <dt className="text-slate-500">Contact</dt>
            <dd>{complaint.contactNumber}</dd>
            <dt className="text-slate-500">Citizen</dt>
            <dd>
              {complaint.citizen.name} ({complaint.citizen.phone})
            </dd>
            <dt className="text-slate-500">Assigned to</dt>
            <dd>{complaint.assignedStaff?.name ?? "Not yet assigned"}</dd>
            <dt className="text-slate-500">Submitted</dt>
            <dd>{new Date(complaint.createdAt).toLocaleString()}</dd>
          </dl>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {complaint.description}
          </p>

          {complaint.images.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Photos</h3>
              <div className="flex flex-wrap gap-2">
                {complaint.images.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                    <img
                      src={img.url}
                      alt=""
                      className="h-24 w-24 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          {canAssign && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Assign staff
              </h2>
              <div className="flex flex-col gap-2">
                <Select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
                  <option value="">Select staff…</option>
                  {staffOptions.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.designation ? `— ${s.designation}` : ""}
                    </option>
                  ))}
                </Select>
                <Button
                  disabled={!selectedStaffId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate(selectedStaffId)}
                >
                  {assignMutation.isPending ? "Assigning…" : "Assign"}
                </Button>
              </div>
            </Card>
          )}

          {canUpdateStatus && allowedNextStatuses.length > 0 && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Update status
              </h2>
              <div className="flex flex-col gap-2">
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                  <option value="">Select new status…</option>
                  {allowedNextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </Select>
                <textarea
                  placeholder="Remarks (optional)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <Button
                  disabled={!nextStatus || statusMutation.isPending}
                  onClick={() => statusMutation.mutate()}
                >
                  {statusMutation.isPending ? "Updating…" : "Update status"}
                </Button>
              </div>
            </Card>
          )}

          {actionError && (
            <p className="text-sm text-red-600" role="alert">
              {actionError}
            </p>
          )}

          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Timeline</h2>
            <ol className="flex flex-col gap-3">
              {complaint.statusHistory?.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge tone={h.toStatus}>{h.toStatus.replace("_", " ")}</Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {h.remarks && <p className="mt-1 text-slate-600 dark:text-slate-300">{h.remarks}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
