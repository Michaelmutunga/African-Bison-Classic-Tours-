import { SITE_CONTACT } from "@/lib/site-contact";

/** Render JSON-LD structured data. Values must be factual, never invented. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escape < to prevent </script> breakout from crafted catalogue copy.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "African Bison Classic Tours",
    url: siteUrl,
    email: SITE_CONTACT.email,
    telephone: SITE_CONTACT.phoneHref.replace("tel:", ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: "JKIA Airport, 1st Floor, Suite 1",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
  };
}

export function breadcrumbJsonLd(siteUrl: string, items: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };
}
