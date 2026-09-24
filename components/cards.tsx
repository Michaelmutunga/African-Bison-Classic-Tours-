import Link from "next/link";
import { SafariImage } from "@/components/safari-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { categoryLabel, formatDate, type Destination, type Post, type Tour } from "@/lib/content";

export function TourCard({ tour }: { tour: Tour }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <SafariImage seed={tour.slug} label={tour.title} alt={`${tour.title} — photo pending`} />
      <CardBody className="flex flex-1 flex-col">
        <div className="flex flex-wrap gap-2">
          <Badge tone="sand">{categoryLabel(tour.category)}</Badge>
          <Badge>
            {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"}
          </Badge>
        </div>
        <h3 className="type-h3 mt-3">
          <Link href={`/tours/${tour.slug}`} className="hover:text-clay-deep">
            {tour.title}
          </Link>
        </h3>
        <p className="type-small mt-2 line-clamp-3 text-ink/70">{tour.excerpt}</p>
        <p className="type-label mt-4 text-clay-deep">
          <Link href={`/tours/${tour.slug}`} aria-label={`View details: ${tour.title}`}>
            View itinerary →
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <SafariImage
        seed={destination.slug}
        label={destination.name}
        alt={`${destination.name} — photo pending`}
      />
      <CardBody className="flex flex-1 flex-col">
        <p className="type-label text-clay-deep">{destination.country}</p>
        <h3 className="type-h3 mt-1">
          <Link href={`/destinations/${destination.slug}`} className="hover:text-clay-deep">
            {destination.name}
          </Link>
        </h3>
        <p className="type-small mt-2 line-clamp-3 text-ink/70">{destination.excerpt}</p>
      </CardBody>
    </Card>
  );
}

export function PostCard({ post }: { post: Post }) {
  const date = formatDate(post.publishedAt);
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <SafariImage seed={post.slug} label={post.title} alt={`${post.title} — photo pending`} />
      <CardBody className="flex flex-1 flex-col">
        {date ? <p className="type-caption text-ink/60">{date}</p> : null}
        <h3 className="type-h3 mt-1">
          <Link href={`/blog/${post.slug}`} className="hover:text-clay-deep">
            {post.title}
          </Link>
        </h3>
        <p className="type-small mt-2 line-clamp-3 text-ink/70">{post.excerpt}</p>
      </CardBody>
    </Card>
  );
}
