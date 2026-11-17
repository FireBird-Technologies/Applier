import { demoVideo, site } from "@/lib/site";

/** Privacy-friendly YouTube embed (youtube-nocookie, lazy-loaded) plus VideoObject structured data for Google. */
export function YouTube({ id = demoVideo.id, title = demoVideo.title, schema = true, className = "" }: {
  id?: string; title?: string; schema?: boolean; className?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: demoVideo.title,
    description: demoVideo.description,
    thumbnailUrl: [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`],
    uploadDate: demoVideo.uploadDate,
    duration: demoVideo.duration,
    contentUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };
  return (
    <div className={className}>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </div>
  );
}
