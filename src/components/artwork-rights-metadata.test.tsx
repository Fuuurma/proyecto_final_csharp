// Prevents missing or misattributed rights data on live and saved detail views.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtworkRightsMetadata } from "./artwork-rights-metadata";

function renderRights(
  isPublicDomain: boolean | null,
  rights: string | null = null,
  source: "record" | "saved-copy" = "record",
) {
  return renderToStaticMarkup(
    <dl>
      <ArtworkRightsMetadata
        isPublicDomain={isPublicDomain}
        rights={rights}
        source={source}
      />
    </dl>,
  );
}

describe("artwork rights metadata", () => {
  it.each([
    [true, "The Met record marks this work as public domain"],
    [false, "The Met record marks this work as not public domain"],
    [null, "The Met record does not state its public-domain status"],
  ] as const)("renders the source status %s as text", (status, label) => {
    expect(renderRights(status)).toContain(label);
  });

  it("shows supplied reproduction rights as a labelled definition value", () => {
    const markup = renderRights(false, "© 2018 Estate of Pablo Picasso");

    expect(markup).toContain("<dt>Rights and reproduction</dt>");
    expect(markup).toContain("<dd>© 2018 Estate of Pablo Picasso</dd>");
  });

  it("labels unknown status as unavailable in an offline saved copy", () => {
    expect(renderRights(null, null, "saved-copy")).toContain(
      "Status unavailable in this saved copy",
    );
  });

  it("omits a reproduction row when the record supplies no rights text", () => {
    expect(renderRights(false)).not.toContain("Rights and reproduction");
    expect(renderRights(false, "   ")).not.toContain("Rights and reproduction");
  });
});
