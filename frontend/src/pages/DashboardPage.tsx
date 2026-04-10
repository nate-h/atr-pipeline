import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { SplitCard } from "../components/SplitCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";

export function DashboardPage() {
  const datasetQuery = useQuery({
    queryKey: ["dataset-summary"],
    queryFn: apiClient.getDatasetSummary,
  });

  const runsQuery = useQuery({
    queryKey: ["training-runs"],
    queryFn: apiClient.getTrainingRuns,
  });

  if (datasetQuery.isLoading) {
    return <div className="empty-state">Loading dataset summary...</div>;
  }

  if (datasetQuery.isError || !datasetQuery.data) {
    return <div className="empty-state">Unable to load dataset summary.</div>;
  }

  const dataset = datasetQuery.data;
  const lastRun = dataset.last_training_run;
  const latestRuns = runsQuery.data ?? [];

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Overview"
        title={dataset.name}
        description="A local ATR workbench centered on YOLO-format ship annotations, repeatable training, and quick evaluation."
        actions={
          <div className="button-row">
            <Link className="button primary" to="/annotation">
              Open Annotator
            </Link>
            <Link className="button" to="/training">
              Start Training
            </Link>
            <Link className="button" to="/evaluation">
              View Evaluation
            </Link>
          </div>
        }
      />

      <div className="grid stats-grid">
        <StatCard
          label="Train images"
          value={
            dataset.splits.find((split) => split.name === "train")
              ?.image_count ?? 0
          }
        />
        <StatCard
          label="Valid images"
          value={
            dataset.splits.find((split) => split.name === "valid")
              ?.image_count ?? 0
          }
        />
        <StatCard
          label="Test images"
          value={
            dataset.splits.find((split) => split.name === "test")
              ?.image_count ?? 0
          }
        />
        <StatCard
          label="Last training run"
          value={lastRun ? lastRun.model_name : "No runs yet"}
        >
          {lastRun ? (
            <StatusBadge status={lastRun.status} />
          ) : (
            "Queue the first YOLOv8 training run."
          )}
        </StatCard>
      </div>

      <section className="card">
        <SectionHeader
          eyebrow="Dataset"
          title="Split health"
          description="The local dataset remains the source of truth for training and evaluation."
        />
        <div className="grid split-grid">
          {dataset.splits.map((split) => (
            <SplitCard key={split.name} split={split} />
          ))}
        </div>
      </section>

      <section className="card">
        <SectionHeader
          eyebrow="Runs"
          title="Recent training activity"
          description="The newest runs are pulled straight from the backend run registry."
        />
        {latestRuns.length === 0 ? (
          <div className="empty-state inset">No runs recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Epochs</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {latestRuns.slice(0, 5).map((run) => (
                  <tr key={run.id}>
                    <td className="mono">{run.id.slice(0, 8)}</td>
                    <td>{run.model_name}</td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>{run.epochs}</td>
                    <td>
                      {run.started_at
                        ? new Date(run.started_at).toLocaleString()
                        : "Queued"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
