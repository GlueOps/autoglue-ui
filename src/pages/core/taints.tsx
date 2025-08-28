import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api.ts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Pencil, Plus, RefreshCw, Search, Trash, X } from "lucide-react";
import { Switch } from "@/components/ui/switch.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

type NodeGroupBrief = { id: string; name: string };

type Taint = {
  id: string;
  name: string;
  value: string;
  node_groups?: NodeGroupBrief[];
};

type NodeGroupOption = { id: string; name: string };

const CreateTaintSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  value: z.string().trim().min(1, "Value is required"),
  node_group_ids: z.array(z.uuid()).optional(),
});
type CreateTaintValues = z.infer<typeof CreateTaintSchema>;

const UpdateTaintSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  value: z.string().trim().min(1, "Value is required").optional(),
});
type UpdateTaintValues = z.infer<typeof UpdateTaintSchema>;

function truncateMiddle(str: string, keep = 6) {
  if (!str || str.length <= keep * 2 + 3) return str;
  return `${str.slice(0, keep)}…${str.slice(-keep)}`;
}

export const TaintsPage = () => {
  const [taints, setTaints] = useState<Taint[]>([]);
  const [nodeGroups, setNodeGroups] = useState<NodeGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [valueFilter, setValueFilter] = useState("");
  const [includeNodeGroups, setIncludeNodeGroups] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Taint | null>(null);

  async function loadTaints() {
    setLoading(true);
    setErr(null);
    try {
      const params: Record<string, any> = {};
      if (q.trim()) params.q = q.trim();
      if (nameFilter.trim()) params.name = nameFilter.trim();
      if (valueFilter.trim()) params.value = valueFilter.trim();
      if (includeNodeGroups) params.include = "node_groups";

      const res = await api.get("/v1/node-taints", { params });
      setTaints(res.data);
    } catch (e) {
      console.error(e);
      setErr("Failed to load taints");
    } finally {
      setLoading(false);
    }
  }

  async function loadNodeGroups() {
    try {
      const res = await api.get("/v1/node-pools");
      const opts: NodeGroupOption[] = (res.data || []).map((ng: any) => ({
        id: ng.id,
        name: ng.name,
      }));
      setNodeGroups(opts);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    Promise.all([loadNodeGroups(), loadTaints()]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeNodeGroups]);

  const filtered = useMemo(() => taints, [taints]);

  async function deleteTaint(id: string) {
    if (!confirm("Delete this taint? This cannot be undone.")) return;
    await api.delete(`/v1/node-taints/${id}`);
    await loadTaints();
  }

  const createForm = useForm<CreateTaintValues>({
    resolver: zodResolver(CreateTaintSchema),
    defaultValues: {
      name: "",
      value: "",
      node_group_ids: [],
    },
  });

  const submitCreate = async (values: CreateTaintValues) => {
    const payload: any = {
      name: values.name.trim(),
      value: values.value.trim(),
    };
    if (values.node_group_ids && values.node_group_ids.length) {
      payload.node_group_ids = values.node_group_ids;
    }

    await api.post("/v1/node-taints", payload);
    setCreateOpen(false);
    createForm.reset();
    await loadTaints();
  };

  const editForm = useForm<UpdateTaintValues>({
    resolver: zodResolver(UpdateTaintSchema),
    defaultValues: {},
  });

  function openEdit(t: Taint) {
    setEditTarget(t);
    editForm.reset({
      name: t.name,
      value: t.value,
    });
  }

  const submitEdit = async (values: UpdateTaintValues) => {
    if (!editTarget) return;
    const payload: any = {};
    if (values.name !== undefined) payload.name = values.name.trim();
    if (values.value !== undefined) payload.value = values.value.trim();

    await api.patch(`/v1/node-taints/${editTarget.id}`, payload);
    setEditTarget(null);
    await loadTaints();
  };

  if (loading) return <div className="p-6">Loading taints…</div>;
  if (err) return <div className="p-6 text-red-500">{err}</div>;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold mb-4">Taints</h1>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-60" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search (q)"
                className="pl-8 w-56"
              />
            </div>

            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filter name"
              className="w-40"
            />
            <Input
              value={valueFilter}
              onChange={(e) => setValueFilter(e.target.value)}
              placeholder="Filter value"
              className="w-40"
            />

            <div className="flex items-center gap-2 px-2">
              <Switch
                checked={includeNodeGroups}
                onCheckedChange={setIncludeNodeGroups}
                id="include-ng"
              />
              <label htmlFor="include-ng" className="text-sm">
                Include node groups
              </label>
            </div>

            <Button variant="outline" onClick={loadTaints}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Taint
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create taint</DialogTitle>
                </DialogHeader>

                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit(submitCreate)}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., dedicated" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., gpu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="node_group_ids"
                      render={({ field }) => {
                        const selected = new Set(field.value || []);
                        const selectedOptions = nodeGroups.filter((ng) =>
                          selected.has(ng.id),
                        );

                        const toggle = (id: string) => {
                          const next = new Set(selected);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          field.onChange(Array.from(next));
                        };

                        const clearOne = (id: string) => {
                          const next = (field.value || []).filter(
                            (x: string) => x !== id,
                          );
                          field.onChange(next);
                        };

                        return (
                          <FormItem>
                            <FormLabel>Node groups (optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                  type="button"
                                >
                                  {selected.size
                                    ? `${selected.size} selected`
                                    : "Select node groups"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                                <Command>
                                  <CommandInput placeholder="Search node groups…" />
                                  <CommandEmpty>
                                    No node groups found.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {nodeGroups.map((ng) => {
                                      const checked = selected.has(ng.id);
                                      return (
                                        <CommandItem
                                          key={ng.id}
                                          onSelect={() => toggle(ng.id)}
                                          className="flex items-center gap-2"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() =>
                                              toggle(ng.id)
                                            }
                                          />
                                          <span>{ng.name}</span>
                                          <span className="ml-auto font-mono text-xs opacity-60">
                                            {truncateMiddle(ng.id, 4)}
                                          </span>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>

                            {!!selectedOptions.length && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedOptions.map((ng) => (
                                  <Badge
                                    key={ng.id}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    {ng.name}
                                    <button
                                      type="button"
                                      onClick={() => clearOne(ng.id)}
                                      className="ml-1 inline-flex"
                                      aria-label={`Remove ${ng.name}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createForm.formState.isSubmitting}
                      >
                        {createForm.formState.isSubmitting
                          ? "Creating…"
                          : "Create"}
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
                  <TableHead>Value</TableHead>
                  <TableHead>Node pools</TableHead>
                  <TableHead className="w-[160px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-sm">{t.value}</code>
                    </TableCell>
                    <TableCell>
                      {includeNodeGroups ? (
                        t.node_groups && t.node_groups.length ? (
                          <div className="flex flex-wrap gap-2">
                            {t.node_groups.map((ng) => (
                              <Tooltip key={ng.id}>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary">{ng.name}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span className="font-mono text-xs">
                                    {ng.id}
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash className="h-4 w-4 mr-2" /> Delete
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => deleteTaint(t.id)}>
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
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-10"
                    >
                      No taints found. Try adjusting filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit taint</DialogTitle>
          </DialogHeader>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(submitEdit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., dedicated" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., gpu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editForm.formState.isSubmitting}
                >
                  {editForm.formState.isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
