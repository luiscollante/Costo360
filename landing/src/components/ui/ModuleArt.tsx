const illustrations = [
  "module-materials.webp",
  "module-proposal.webp",
  "module-delivery.webp",
  "module-team.webp",
] as const;

// Original illustrative artwork, not customer photographs or product screenshots.
// Each card's heading and copy provide the meaning; the image is decorative.
export function ModuleArt({ index }: { index: number }) {
  return (
    <div className="module-art module-editorial-art" aria-hidden="true">
      <img
        src={`/media/editorial/${illustrations[index]}`}
        alt=""
        width={1200}
        height={480}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
