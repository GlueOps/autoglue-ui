import {useEffect, useState} from "react";
import {api} from "@/lib/api.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";

export const OrgSwitcher = () => {
  const [orgs, setOrgs] = useState<{id: string; name: string}[]>([])
  const [activeOrg, setActiveOrg] = useState<string | null>(null)

  useEffect(() => {
    api.get("/v1/orgs").then(res => {
      setOrgs(res.data)
      const current = localStorage.getItem('active_org_id')
      if (current) setActiveOrg(current)
    })
  }, [])

  const switchOrg = (orgId: string) => {
    localStorage.setItem('active_org_id', orgId)
    setActiveOrg(orgId)
    window.location.reload()
  }

  const currentOrgName = orgs.find(org => org.id === activeOrg)?.name || "Select Org";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className='w-full justify-start'>
          {currentOrgName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-48'>
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => switchOrg(org.id)}>
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
