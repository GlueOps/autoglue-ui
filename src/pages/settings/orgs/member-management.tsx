import { useEffect, useState } from "react";
import { api } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export const MemberManagement = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get(`/v1/orgs/members`).then((res) => setMembers(res.data));
  }, []);

  const removeMember = (userId: string) => {
    api.delete(`/v1/orgs/members/${userId}`).then(() => {
      setMembers((prev) => prev.filter((m: any) => m.user_id !== userId));
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Members</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members &&
            members.map((member: any) => (
              <TableRow>
                <TableCell>{member.user.email}</TableCell>
                <TableCell>
                  <Badge>{member.role}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    onClick={() => removeMember(member.user_id)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
