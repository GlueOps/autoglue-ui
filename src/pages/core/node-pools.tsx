import {useEffect, useMemo, useState} from "react";
import {api} from "@/lib/api.ts";
import {z} from "zod";
import {Badge} from "@/components/ui/badge.tsx";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {LinkIcon, Pencil, Plus, RefreshCw, Search, ServerIcon, Trash, UnlinkIcon} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog.tsx";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";

type ServerBrief = {
  id: string;
  hostname?: string | null;
  ip?: string;
  ip_address?: string;
  role?: string;
  status?: string;
};

type NodePool = {
  id: string;
  name: string;
  servers?: ServerBrief[];
};

const CreatePoolSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 chars"),
  server_ids: z.array(z.string().uuid()).optional().default([]),
});
type CreatePoolInput = z.input<typeof CreatePoolSchema>;
type CreatePoolValues = z.output<typeof CreatePoolSchema>;

const UpdatePoolSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 chars"),
});
type UpdatePoolValues = z.output<typeof UpdatePoolSchema>;


const AttachServersSchema = z.object({
  server_ids: z.array(z.string().uuid()).min(1, "Pick at least one server"),
});
type AttachServersValues = z.output<typeof AttachServersSchema>;

function StatusBadge({ status }: { status?: string }) {
  const v =
    status === "ready"
      ? "default"
      : status === "provisioning"
        ? "secondary"
        : status === "failed"
          ? "destructive"
          : "outline";
  return (
    <Badge variant={v as any} className="capitalize">
      {status || "unknown"}
    </Badge>
  );
}


function truncateMiddle(str: string, keep = 12) {
  if (!str || str.length <= keep * 2 + 3) return str;
  return `${str.slice(0, keep)}…${str.slice(-keep)}`;
}


function serverLabel(s: ServerBrief) {
  const ip = s.ip || s.ip_address;
  const name = s.hostname || ip || s.id;
  const role = s.role ? ` · ${s.role}` : "";
  return `${name}${role}`;
}

export const NodePoolsPage = () => {
  const [pools, setPools] = useState<NodePool[]>([]);
  const [allServers, setAllServers] = useState<ServerBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NodePool | null>(null);
  const [manageTarget, setManageTarget] = useState<NodePool | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [poolsRes, serversRes] = await Promise.all([
        api.get("/v1/node-pools", { params: { include: "servers" } }),
        api.get("/v1/servers"),
      ]);
      setPools(poolsRes.data);
      setAllServers(serversRes.data);
    } catch (e) {
      console.error(e);
      setErr("Failed to load node pools or servers");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return pools;
    return pools.filter((p) =>
      p.name.toLowerCase().includes(needle) ||
      (p.servers || []).some(
        (s) =>
          (s.hostname || "").toLowerCase().includes(needle) ||
          (s.ip || s.ip_address || "").toLowerCase().includes(needle) ||
          (s.role || "").toLowerCase().includes(needle)
      )
    );
  }, [pools, q]);


  async function deletePool(id: string) {
    if (!confirm("Delete this node pool? This cannot be undone.")) return;
    await api.delete(`/v1/node-pools/${id}`);
    await loadAll();
  }

  const createForm = useForm<CreatePoolInput, any, CreatePoolValues>({
    resolver: zodResolver(CreatePoolSchema),
    defaultValues: { name: "", server_ids: [] },
  });


  const submitCreate = async (values: CreatePoolValues) => {
    const payload: any = { name: values.name.trim() };
    if (values.server_ids && values.server_ids.length > 0) {
      payload.server_ids = values.server_ids;
    }


    await api.post("/v1/node-pools", payload);
    setCreateOpen(false);
    createForm.reset({ name: "", server_ids: [] });
    await loadAll();
  };

  const editForm = useForm<UpdatePoolValues>({
    resolver: zodResolver(UpdatePoolSchema),
    defaultValues: { name: "" },
  });


  function openEdit(p: NodePool) {
    setEditTarget(p);
    editForm.reset({ name: p.name });
  }


  const submitEdit = async (values: UpdatePoolValues) => {
    if (!editTarget) return;
    await api.patch(`/v1/node-pools/${editTarget.id}`, { name: values.name.trim() });
    setEditTarget(null);
    await loadAll();
  };

  const attachForm = useForm<AttachServersValues>({
    resolver: zodResolver(AttachServersSchema),
    defaultValues: { server_ids: [] },
  });


  function openManage(p: NodePool) {
    setManageTarget(p);
    attachForm.reset({ server_ids: [] });
  }


  const submitAttach = async (values: AttachServersValues) => {
    if (!manageTarget) return;
    await api.post(`/v1/node-pools/${manageTarget.id}/servers`, {
      server_ids: values.server_ids,
    });
    attachForm.reset({ server_ids: [] });
// reload just this pool and servers list
    await loadAll();
  };

  async function detachServer(serverId: string) {
    if (!manageTarget) return;
    if (!confirm("Detach this server from the pool?")) return;
    await api.delete(`/v1/node-pools/${manageTarget.id}/servers/${serverId}`);
    await loadAll();
  }

  const attachableServers = useMemo(() => {
    if (!manageTarget) return [] as ServerBrief[];
    const attachedIds = new Set((manageTarget.servers || []).map((s) => s.id));
    return allServers.filter((s: any) => !attachedIds.has(s.id));
  }, [manageTarget, allServers]);

  if (loading) return <div className="p-6">Loading node pools…</div>;
  if (err) return <div className="p-6 text-red-500">{err}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold mb-4">Node Pools</h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-60" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pools or servers…"
              className="pl-8 w-72"
            />
          </div>

          <Button variant="outline" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create node pool</DialogTitle>
              </DialogHeader>

              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(submitCreate)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="pool-workers-a" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="server_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial servers (optional)</FormLabel>
                        <div className="max-h-56 overflow-auto rounded-xl border p-2 space-y-2">
                          {allServers.length === 0 && (
                            <div className="text-sm text-muted-foreground p-2">No servers available</div>
                          )}
                          {allServers.map((s) => {
                            const checked = field.value?.includes(s.id) || false;
                            return (
                              <label key={s.id} className="flex items-start gap-2 p-1 rounded hover:bg-accent cursor-pointer">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    const next = new Set(field.value || []);
                                    if (v) next.add(s.id); else next.delete(s.id);
                                    field.onChange(Array.from(next));
                                  }}
                                />
                                <div className="leading-tight">
                                  <div className="font-medium text-sm">{serverLabel(s)}</div>
                                  <div className="text-xs text-muted-foreground">{truncateMiddle(s.id, 8)}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createForm.formState.isSubmitting}>
                      {createForm.formState.isSubmitting ? "Creating…" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Servers</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(p.servers || []).slice(0, 6).map((s) => (
                        <Badge key={s.id} variant="secondary" className="gap-1">
                          <ServerIcon className="h-3 w-3" /> {s.hostname || s.ip || s.ip_address || truncateMiddle(s.id, 6)}
                          {s.status && <span className="ml-1"><StatusBadge status={s.status} /></span>}
                        </Badge>
                      ))}
                      {(p.servers || []).length === 0 && (
                        <span className="text-muted-foreground">No servers</span>
                      )}
                      {(p.servers || []).length > 6 && (
                        <span className="text-muted-foreground">+{(p.servers || []).length - 6} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openManage(p)}>
                        <LinkIcon className="h-4 w-4 mr-2" /> Manage servers
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>


                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash className="h-4 w-4 mr-2" /> Delete
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deletePool(p.id)}>
                            Confirm delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                    No node pools match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit node pool</DialogTitle>
          </DialogHeader>


          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="pool-workers-a" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting}>
                  {editForm.formState.isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage servers dialog */}
      <Dialog open={!!manageTarget} onOpenChange={(o) => !o && setManageTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage servers for <span className="font-mono">{manageTarget?.name}</span>
            </DialogTitle>
          </DialogHeader>


          {/* Attached servers list */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Attached servers</div>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">Detach</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(manageTarget?.servers || []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.hostname || truncateMiddle(s.id, 8)}</TableCell>
                      <TableCell><code className="font-mono text-sm">{s.ip || s.ip_address || "—"}</code></TableCell>
                      <TableCell className="capitalize">{s.role || "—"}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="destructive" size="sm" onClick={() => detachServer(s.id)}>
                            <UnlinkIcon className="h-4 w-4 mr-2" /> Detach
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}


                  {(manageTarget?.servers || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No servers attached yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>


          {/* Attach section */}
          <div className="pt-4">
            <Form {...attachForm}>
              <form onSubmit={attachForm.handleSubmit(submitAttach)} className="space-y-3">
                <FormField
                  control={attachForm.control}
                  name="server_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attach more servers</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-auto rounded-xl border p-2">
                        {attachableServers.length === 0 && (
                          <div className="text-sm text-muted-foreground p-2">No more servers available to attach</div>
                        )}
                        {attachableServers.map((s) => {
                          const checked = field.value?.includes(s.id) || false;
                          return (
                            <label key={s.id} className="flex items-start gap-2 p-1 rounded hover:bg-accent cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = new Set(field.value || []);
                                  if (v) next.add(s.id); else next.delete(s.id);
                                  field.onChange(Array.from(next));
                                }}
                              />
                              <div className="leading-tight">
                                <div className="font-medium text-sm">{serverLabel(s)}</div>
                                <div className="text-xs text-muted-foreground">{truncateMiddle(s.id, 8)}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <DialogFooter className="gap-2">
                  <Button type="submit" disabled={attachForm.formState.isSubmitting}>
                    <LinkIcon className="h-4 w-4 mr-2" /> {attachForm.formState.isSubmitting ? "Attaching…" : "Attach selected"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}