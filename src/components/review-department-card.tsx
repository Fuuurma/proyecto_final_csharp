import { Link } from "@tanstack/react-router";
import { ArtworkImage } from "@/components/artwork-image";
import { curatedArtworks } from "@/data/curated-artworks";
import type { ReviewDepartment } from "@/data/departments";

export function ReviewDepartmentCard({
  department,
}: {
  department: ReviewDepartment;
}) {
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
        <span className="link-action">
          Open department <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
