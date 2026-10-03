"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { listMembers, setMemberStatus, type PublicUser } from "@/lib/api";

import { MembersTableView } from "./_components/members-table-view";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await listMembers());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApprove = useCallback(
    (id: string) => {
      void setMemberStatus(id, "approved")
        .then(() => {
          toast.success("Approved — temp password logged in API console");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  const onReject = useCallback(
    (id: string) => {
      void setMemberStatus(id, "rejected")
        .then(() => {
          toast.success("Rejected");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <MembersTableView members={members} loading={loading} onApprove={onApprove} onReject={onReject} />
    </div>
  );
}
