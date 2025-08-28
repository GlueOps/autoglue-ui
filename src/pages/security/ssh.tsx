import { useEffect, useState } from "react";
import { api } from "@/lib/api.ts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CloudDownload, Copy, Plus, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

type SshKey = {
  id: string;
  name: string;
  public_keys: string;
  fingerprint: string;
  created_at: string;
};

type Part = "public" | "private" | "both";

function filenameFromDisposition(
  disposition?: string,
  fallback = "download.bin",
) {
  if (!disposition) return fallback;
  // RFC 5987: filename*=UTF-8''name
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) return decodeURIComponent(star[1]);
  // Basic: filename="name" or filename=name
  const basic = /filename="?([^"]+)"?/i.exec(disposition);
  return basic?.[1] ?? fallback;
}

function truncateMiddle(str: string, keep = 24) {
  if (!str || str.length <= keep * 2 + 3) return str;
  return `${str.slice(0, keep)}…${str.slice(-keep)}`;
}

function getKeyType(publicKey: string) {
  return publicKey?.split(/\s+/)?.[0] ?? "ssh-key";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

const CreateKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  comment: z.string().trim().max(100, "Max 100 characters").default(""),
  bits: z.enum(["2048", "3072", "4096"]),
});

type CreateKeyInput = z.input<typeof CreateKeySchema>;
type CreateKeyOutput = z.output<typeof CreateKeySchema>;

export const SshKeysPage = () => {
  const [sshKeys, setSSHKeys] = useState<SshKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchSshKeys = async () => {
    try {
      const response = await api.get("/v1/ssh");
      setSSHKeys(response.data);
    } catch (err) {
      setError("Failed to fetch ssh keys");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSshKeys();
  }, []);

  const filtered = sshKeys.filter((k) => {
    const hay = `${k.public_keys} ${k.fingerprint}`.toLowerCase();
    return hay.includes(filter.toLowerCase());
  });

  async function downloadKeyPair(id: string, part: Part = "both") {
    try {
      const res = await api.get(`/v1/ssh/${id}/download`, {
        params: { part },
        responseType: "blob",
        validateStatus: (s) => s < 500,
      });

      if (res.status !== 200) {
        const msg = await (res.data as Blob)
          .text()
          .catch(() => "download failed");
        throw new Error(msg);
      }

      const blob = res.data as Blob;
      const fallback =
        part === "both"
          ? `ssh_key_${id}.zip`
          : part === "public"
            ? `id_rsa_${id}.pub`
            : `id_rsa_${id}.pem`;

      const filename = filenameFromDisposition(
        res.headers["content-disposition"],
        fallback,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  const deleteKeyPair = async (id: string) => {
    await api.delete(`/v1/ssh/${id}`);
    fetchSshKeys();
  };

  const form = useForm<CreateKeyInput, any, CreateKeyOutput>({
    resolver: zodResolver(CreateKeySchema),
    defaultValues: {
      name: "",
      comment: "deploy@autoglue",
      bits: "4096",
    },
  });

  const onSubmit = async (values: CreateKeyInput) => {
    try {
      await api.post("/v1/ssh", {
        bits: Number(values.bits),
        comment: values.comment?.trim() ?? "",
        name: values.name.trim(),
        download: "none",
      });
      setCreateOpen(false);
      form.reset();
      fetchSshKeys();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-6">Loading Ssh Keys...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">SSH Keys</h1>
          <div className="w-full max-w-sm">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by fingerprint or key"
            />
          </div>

          <div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Keypair
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create SSH Keypair</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., CI deploy key"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comment</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., deploy@autoglue"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key size</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select key size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="2048">2048</SelectItem>
                              <SelectItem value="3072">3072</SelectItem>
                              <SelectItem value="4096">4096</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
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
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting ? "Creating…" : "Create"}
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
                  <TableHead className="min-w-[360px]">Public Key</TableHead>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[160px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sshKey) => {
                  const keyType = getKeyType(sshKey.public_keys);
                  const truncated = truncateMiddle(sshKey.public_keys, 18);
                  return (
                    <TableRow key={sshKey.id}>
                      <TableCell className="align-top">{sshKey.name}</TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="secondary"
                            className="whitespace-nowrap"
                          >
                            {keyType}
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <code className="font-mono text-sm break-all md:break-normal md:truncate md:max-w-[48ch]">
                                {truncated}
                              </code>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[70vw]">
                              <div className="max-w-full">
                                <p className="font-mono text-xs break-all">
                                  {sshKey.public_keys}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <code className="font-mono text-sm">
                          {sshKey.fingerprint}
                        </code>
                      </TableCell>

                      <TableCell className="align-top">
                        {new Date(sshKey.created_at).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(sshKey.public_keys)}
                            title="Copy public key"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <CloudDownload className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  downloadKeyPair(sshKey.id, "both")
                                }
                              >
                                Public + Private (.zip)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  downloadKeyPair(sshKey.id, "public")
                                }
                              >
                                Public only (.pub)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  downloadKeyPair(sshKey.id, "private")
                                }
                              >
                                Private only (.pem)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteKeyPair(sshKey.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
