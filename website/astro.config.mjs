// @ts-check

import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import rehypeCodeBlocks from "./src/lib/rehype-code-blocks.mjs";

/** @type {import("@astrojs/markdown-remark").RehypePlugins} */
const rehypePlugins = [
  [
    rehypeCodeBlocks,
    {
      theme: {
        light: "github-light",
        dark: "github-dark-default",
      },
    },
  ],
];

export default defineConfig({
  site: "https://locus.hyperoot.dev",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  redirects: {
    "/getting-started/": "/install/",
    "/project-direction/": "/roadmap/",
    "/storage/": "/guide/",
    "/workbench/": "/guide/",
  },
  prefetch: true,
  compressHTML: true,

  markdown: {
    processor: unified({ rehypePlugins }),
    syntaxHighlight: false,
  },

  integrations: [
    icon({
      iconDir: "src/assets/icons",
      svgoOptions: {
        plugins: [
          {
            name: "convertColors",
            params: {
              currentColor: true,
            },
          },
        ],
      },
    }),
    mdx(),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
