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

type Cluster = {
  id: string;
  name: string;
  provider: string;
  region: string;
  status: string;
  kubeconfig: string;
  created_at: string;
  updated_at: string;
};

export const ClusterListPage = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await api.get("/v1/clusters");
        setClusters(response.data);
      } catch (err) {
        setError("Failed to fetch clusters");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, []);

  if (loading) {
    return <div className="p-6">Loading clusters...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clusters</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clusters.map((cluster) => (
            <TableRow>
              <TableCell>{cluster.name}</TableCell>
              <TableCell>{cluster.provider}</TableCell>
              <TableCell>{cluster.region}</TableCell>
              <TableCell>{cluster.status}</TableCell>
              <TableCell>
                {new Date(cluster.created_at).toDateString()}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
