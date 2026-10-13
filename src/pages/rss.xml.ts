import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPosts, getPostId } from "../lib/posts";
import { categoryLabel } from "../data/post-options";
import { siteInfo, base } from "../config";

export const GET: APIRoute = async ({ site }) =>
  rss({
    title: siteInfo.title,
    description: siteInfo.description,
    // The channel link is the bare site value, so include base for subdirectory deploys.
    site: `${site}${base}`,
    items: (await getPosts()).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: new URL(`${base}/posts/${getPostId(post)}/`, site).href,
      categories: [categoryLabel(post.data.category)],
    })),
    customData: `<language>${siteInfo.language}</language>`,
  });
