import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";

export function RunsPage() {
  const runsQuery = useQuery({
    queryKey: ["training-runs"],
    queryFn: apiClient.getTrainingRuns,
    refetchInterval: (query) => {
      const runs = query.state.data ?? [];
      return runs.some(
        (run) => run.status === "queued" || run.status === "running",
      )
        ? 5000
        : false;
    },
  });

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Runs"
        title="Training run history"
        description="All recorded runs, including model params, metrics, artifact paths, and MLflow references."
      />

      <section className="card">
        {runsQuery.isLoading ? (
          <div className="empty-state inset">Loading runs...</div>
        ) : null}
        {runsQuery.isError ? (
          <div className="empty-state inset">Unable to load run history.</div>
        ) : null}
        {runsQuery.data ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Status</th>
                  <th>Params</th>
                  <th>Runtime</th>
                  <th>Best metrics</th>
                  <th>Artifacts</th>
                  <th>MLflow</th>
                </tr>
              </thead>
              <tbody>
                {runsQuery.data.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <div className="mono">{run.id.slice(0, 8)}</div>
                      <div className="muted small">
                        {new Date(run.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>
                      {run.model_name}
                      <br />
                      {run.epochs} ep / batch {run.batch_size} / imgsz{" "}
                      {run.image_size}
                    </td>
                    <td>{formatRuntime(run.started_at, run.completed_at)}</td>
                    <td>
                      <div className="metric-stack">
                        <span>
                          P {formatMetric(run.metrics_json?.precision)}
                        </span>
                        <span>R {formatMetric(run.metrics_json?.recall)}</span>
                        <span>
                          mAP50 {formatMetric(run.metrics_json?.map50)}
                        </span>
                        <span>
                          mAP50-95 {formatMetric(run.metrics_json?.map50_95)}
                        </span>
                      </div>
                    </td>
                    <td className="mono small">{run.artifact_path}</td>
                    <td>
                      {run.mlflow_url ? (
                        <a href={run.mlflow_url}>{run.mlflow_run_id}</a>
                      ) : (
                        "Not linked"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatMetric(value: unknown) {
  return typeof value === "number" ? value.toFixed(3) : "n/a";
}

function formatRuntime(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) {
    return "Not started";
  }

  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "n/a";
  }

  const totalSeconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
