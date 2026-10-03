import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Community Shelves",
  version: packageJson.version,
  copyright: `© ${currentYear}, Community Member Shelves.`,
  meta: {
    title: "Community Member Shelves",
    description:
      "Member-owned curated bookshelves for book clubs — goals, categories, mind-shaping intent, and shared books.",
  },
};
