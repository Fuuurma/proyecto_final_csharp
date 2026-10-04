import { publicDomainStatusText } from "@/lib/met/rights";

type ArtworkRightsMetadataProps = {
  isPublicDomain: boolean | null;
  rights: string | null;
  source?: "record" | "saved-copy";
};

export function ArtworkRightsMetadata({
  isPublicDomain,
  rights,
  source = "record",
}: ArtworkRightsMetadataProps) {
  const status =
    source === "saved-copy" && isPublicDomain === null
      ? "Status unavailable in this saved copy"
      : publicDomainStatusText(isPublicDomain);
  const suppliedRights = rights?.trim();

  return (
    <>
      <div className="metadata-row">
        <dt>Public-domain status</dt>
        <dd>{status}</dd>
      </div>
      {suppliedRights ? (
        <div className="metadata-row">
          <dt>Rights and reproduction</dt>
          <dd>{suppliedRights}</dd>
        </div>
      ) : null}
    </>
  );
}
