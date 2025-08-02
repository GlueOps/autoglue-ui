import {useEffect, useState} from "react";
import {api} from "@/lib/api.ts";
import {Button} from "@/components/ui/button.tsx";

export const OrgManagement = () => {
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    api.get("/v1/orgs").then(res => setOrgs(res.data));
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">Organizations</h2>
      <ul className="space-y-2">
        {orgs.map((org: any) => (
          <li key={org.id} className="flex justify-between items-center border p-2 rounded-md">
            <span>{org.name}</span>
            <Button onClick={() => {
              localStorage.setItem("active_org_id", org.id);
              window.location.reload();
            }}>
              Switch
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}