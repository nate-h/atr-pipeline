import type { SplitSummary } from "../types/api";
import { appConfig } from "../lib/config";

export function SplitCard({ split }: { split: SplitSummary }) {
  return (
    <section className="card split-card">
      <div className="split-header">
        <h3>{split.name}</h3>
        {split.empty_label_count > 0 || split.missing_label_count > 0 ? (
          <span className="flag">needs attention</span>
        ) : (
          <span className="flag ok">healthy</span>
        )}
      </div>
      <dl className="key-values compact">
        <div>
          <dt>Images</dt>
          <dd>{split.image_count}</dd>
        </div>
        <div>
          <dt>Labels</dt>
          <dd>{split.label_count}</dd>
        </div>
        <div>
          <dt>Empty labels</dt>
          <dd>{split.empty_label_count}</dd>
        </div>
        <div>
          <dt>Missing labels</dt>
          <dd>{split.missing_label_count}</dd>
        </div>
      </dl>
      {split.sample_images.length > 0 ? (
        <div className="thumb-strip">
          {split.sample_images.slice(0, 3).map((url) => (
            <img
              key={url}
              src={`${appConfig.backendOrigin}${url}`}
              alt={`${split.name} preview`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
