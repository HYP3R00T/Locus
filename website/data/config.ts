import type { NavItem, SiteConfig, SocialLink } from "@/lib/types";

export const SITE: SiteConfig = {
  repo: "https://github.com/HYP3R00T/Locus",
  title: "Locus — A space for independent study",
  description:
    "Read books and papers beside your handwritten working. A local desktop workspace for independent study.",
  image: "https://locus.hyperoot.dev/social.svg",
  imageAlt: "Locus — Read. Think. Make room for your working.",
  contentType: "website",
  twitterHandle: "@HYP3R00T",
  lang: "en",
};

export const navItems: NavItem[] = [
  { href: "/guide/", label: "Guide" },
  { href: "/roadmap/", label: "Progress" },
  { href: "/changelog/", label: "Changelog" },
];

export const SOCIAL_LINKS = [
  { name: "github", href: SITE.repo, active: true, linkTitle: "Locus on GitHub" },
] satisfies SocialLink[];
