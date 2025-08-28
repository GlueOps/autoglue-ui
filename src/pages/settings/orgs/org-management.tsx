import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { TrashIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import axios from "axios";
import { slugify } from "@/lib/utils.ts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";

type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

const OrgSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name is too long."),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters.")
    .max(50, "Slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens (no leading/trailing hyphen).",
    ),
});

type OrgFormValues = z.infer<typeof OrgSchema>;

export const OrgManagement = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState(false);
  const slugEditedRef = useRef(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/v1/orgs").then((res) => setOrganizations(res.data));
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "active_org_id") setActiveOrgId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(OrgSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const nameValue = form.watch("name");

  useEffect(() => {
    if (!slugEditedRef.current) {
      form.setValue("slug", slugify(nameValue || ""), { shouldValidate: true });
    }
  }, [nameValue, form]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/v1/orgs");

        if (isMounted) {
          const data = (await res.data) || [];
          setOrganizations(data || []);
          setCreateOpen((data || []).length === 0);
        }
      } catch (err: any) {
        if (axios.isCancel(err) || err?.code === "ERR_CANCELED") return;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load organizations";
        toast.error(msg);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function onSubmit(values: OrgFormValues) {
    try {
      const res = await api.post("/v1/orgs", values);
      const newOrg = await res.data;
      setOrganizations((prev) => [newOrg, ...prev]);
      localStorage.setItem("active_org_id", newOrg.id);
      toast.success(`Created ${newOrg.name}`);
      setCreateOpen(false);
      form.reset({ name: "", slug: "" });
      slugEditedRef.current = false;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create organization";
      toast.error(msg);
    }
  }

  function handleSelectOrg(org: Organization) {
    localStorage.setItem("active_org_id", org.id);
    setActiveOrgId(org.id);
    toast.success(`Switched to ${org.name}`);
  }

  async function handleDeleteOrg(org: Organization) {
    try {
      setDeletingId(org.id);
      await api.delete(`/v1/orgs/${org.id}`);
      setOrganizations((prev) => prev.filter((org) => org.id !== org.id));

      if (activeOrgId == org.id) {
        const remaining = organizations.filter((o) => o.id !== org.id);
        const nextId = remaining[0]?.id ?? null;
        if (nextId) localStorage.setItem("active_org_id", nextId);
        else localStorage.removeItem("active_org_id");
        setActiveOrgId(nextId);
      }

      toast.success(`Deleted ${org.name}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete organization";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Setup</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold mb-4">Organizations</h1>
        <Button onClick={() => setCreateOpen(true)}>New organization</Button>
      </div>
      <Separator />

      {organizations.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No organizations yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
          {organizations.map((org) => (
            <Card key={org.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{org.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div>Slug: {org.slug}</div>
                <div className="mt-1">ID: {org.id}</div>
              </CardContent>
              <CardFooter className="mt-auto w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={() => handleSelectOrg(org)}>
                  {org.id === activeOrgId ? "Selected" : "Select"}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="ml-auto">
                      <TrashIcon className="h-5 w-5 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete organization?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete <b>{org.name}</b>. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter className="sm:justify-between">
                      <AlertDialogCancel disabled={deletingId === org.id}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        asChild
                        disabled={deletingId === org.id}
                      >
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteOrg(org)}
                        >
                          {deletingId === org.id ? "Deleting…" : "Delete"}
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Set a name and a URL-friendly slug.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc" autoFocus {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your organization’s display name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="acme-inc"
                        {...field}
                        onChange={(e) => {
                          slugEditedRef.current = true; // user manually edited slug
                          field.onChange(e);
                        }}
                        onBlur={(e) => {
                          // normalize on blur
                          const normalized = slugify(e.target.value);
                          form.setValue("slug", normalized, {
                            shouldValidate: true,
                          });
                          field.onBlur();
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase, numbers and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setCreateOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !form.formState.isValid || form.formState.isSubmitting
                  }
                >
                  {form.formState.isSubmitting ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
