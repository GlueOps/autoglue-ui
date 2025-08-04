import { useEffect, useState } from "react";
import { api } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";

export const OrgManagement = () => {
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    api.get("/v1/orgs").then((res) => setOrgs(res.data));
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">Organizations</h2>
      <ul className="space-y-2">
        {orgs.map((org: { id: string; name: string }) => (
          <li
            key={org.id}
            className="flex justify-between items-center border p-2 rounded-md"
          >
            <span>{org.name}</span>
            <div className="space-x-4">
              <Button
                onClick={() => {
                  localStorage.setItem("active_org_id", org.id);
                  window.location.reload();
                }}
              >
                Switch
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  api
                    .delete(`/v1/orgs/${org.id}`)
                    .then(() =>
                      api.get("/v1/orgs").then((res) => setOrgs(res.data)),
                    );
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
