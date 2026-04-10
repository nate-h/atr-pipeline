import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

const navigation = [
  { to: "/", label: "Dashboard" },
  { to: "/dataset", label: "Dataset" },
  { to: "/annotation", label: "Annotation" },
  { to: "/training", label: "Training" },
  { to: "/runs", label: "Runs" },
  { to: "/evaluation", label: "Evaluation" },
];

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="brand">
            <p className="eyebrow">ATR Workbench</p>
            <h1>Ship Detection</h1>
            <p className="muted">
              Thin, reproducible workflow around YOLO-format labels, training
              runs, and evaluation.
            </p>
          </div>
          <nav className="nav">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <section className="user-card" aria-label="Logged in user">
            <div className="user-card-header">
              <img
                className="user-avatar"
                src="/cartoon_me.jpg"
                alt="Nate H avatar"
              />
              <div>
                <p className="eyebrow">Signed In</p>
                <h3>Nate H</h3>
                <p className="muted">ATR Analyst</p>
              </div>
            </div>
          </section>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
