/**
 * Single source for public contact details. Header, footer, closing
 * section and tour pages read from here so the number never lives in
 * multiple places. Values mirror the live business listing until site
 * settings take over.
 */
export const SITE_CONTACT = {
  phoneDisplay: "+254 734 466 432",
  phoneHref: "tel:+254734466432",
  email: "info@africanbisonclassictours.com",
  addressLines: ["JKIA Airport, 1st Floor, Suite 1", "Nairobi, Kenya"],
  placeLine: "Nairobi, Kenya · Private & independent safari company",
} as const;
