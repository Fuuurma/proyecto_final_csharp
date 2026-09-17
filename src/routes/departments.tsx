import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArtworkImage } from "@/components/artwork-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { curatedArtworks } from "@/data/curated-artworks";
import {
  exploreSearchForDepartment,
  reviewDepartments,
} from "@/data/departments";
import { listDepartments } from "@/lib/met/server-functions";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — Meet the Met" },
      {
        name: "description",
        content:
          "The Met's department index: four curated review rooms plus the full live department list, each opening as a bounded Explore search.",
      },
      { property: "og:title", content: "Departments — Meet the Met" },
      {
        property: "og:description",
        content: "Curated review rooms and the full live Met department index.",
      },
    ],
  }),
  loader: () => listDepartments(),
  component: Departments,
});

function Departments() {
  const result = Route.useLoaderData();
  const [filter, setFilter] = useState("");

  const filteredDepartments = result.departments.filter((dept) =>
    filter.trim().length === 0
      ? true
      : dept.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <main
      className="page-frame departments-page"
      aria-labelledby="departments-heading"
    >
      <section className="departments-heading">
        <div>
          <span className="eyebrow">Collection rooms</span>
          <h1 id="departments-heading">Departments.</h1>
        </div>
        <p>
          Four rooms are held in the review set. The rest of the index is the
          live Met department list, opened as a bounded search.
        </p>
      </section>

      {result.message ? (
        <Alert className="result-alert">
          <AlertTitle>Showing the committed department index.</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <section
        className="collection-index departments-rooms"
        aria-labelledby="review-rooms-heading"
      >
        <div className="collection-index__intro">
          <span className="eyebrow">Held in the review set</span>
          <h2 id="review-rooms-heading">Start in a known room.</h2>
          <p>
            These departments already have public-domain works in the committed
            set, so the first view stays deterministic.
          </p>
        </div>
        <div className="collection-index__list">
          {reviewDepartments.map((department) => {
            const artwork = curatedArtworks.find(
              (candidate) => candidate.id === department.artworkId,
            );
            const count = curatedArtworks.filter(
              (candidate) => candidate.department === department.name,
            ).length;

            if (!artwork) return null;

            return (
              <Link
                className="collection-index__item"
                key={department.id}
                to="/explore"
                search={{
                  department: department.name,
                  path: undefined,
                  departmentId: undefined,
                }}
              >
                <ArtworkImage artwork={artwork} />
                <div className="collection-index__meta">
                  <span className="mono">{count} review works</span>
                  <h3>{department.name}</h3>
                  <p>{department.description}</p>
                  <span className="text-link">
                    Open department <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        className="department-ledger"
        aria-labelledby="department-ledger-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              {result.source === "met" ? "Live index" : "Committed index"}
            </span>
            <h2 id="department-ledger-heading">The wider room list.</h2>
          </div>
          <div className="department-ledger__filter-wrap">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter rooms…"
              className="department-filter-input"
              aria-label="Filter department list"
            />
            <span className="mono">
              {filteredDepartments.length} / {result.departments.length}{" "}
              departments
            </span>
          </div>
        </div>
        <ol className="department-ledger__list">
          {filteredDepartments.map((department) => {
            const search = exploreSearchForDepartment(department);
            const inReview = reviewDepartments.some(
              (room) => room.id === department.id,
            );

            return (
              <li className="department-ledger__item" key={department.id}>
                <span className="department-ledger__id mono">
                  {String(department.id).padStart(2, "0")}
                </span>
                <div className="department-ledger__copy">
                  <h3>{department.name}</h3>
                  <p className="mono">
                    {inReview ? "Review room" : "Live department search"}
                  </p>
                </div>
                <Link
                  to="/explore"
                  search={{
                    department: search.department,
                    departmentId: search.departmentId,
                    path: undefined,
                    q: undefined,
                  }}
                  className="text-link"
                >
                  Open in Explore <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
