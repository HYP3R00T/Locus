import type { ImageMetadata } from "astro";

export type SEOImage = string | ImageMetadata;

export interface HeadSEOProps {
  title?: string;
  description?: string;
  image?: SEOImage;
  imageAlt?: string;
  contentType?: "website" | "article";
  noIndex?: boolean;
}

export type BaseLayoutProps = HeadSEOProps;

export interface SiteConfig {
  repo: string;
  title: string;
  description: string;
  image: SEOImage;
  imageAlt: string;
  contentType: "website" | "article";
  twitterHandle: string;
  lang: string;
}

export interface NavItem {
  href: string;
  label: string;
  special?: boolean;
  blank?: boolean;
}

export interface SocialLink {
  name: string;
  href: string;
  active: boolean;
  linkTitle?: string;
}
