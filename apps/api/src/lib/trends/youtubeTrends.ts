// apps/api/src/lib/trends/youtubeTrends.ts
import { google } from "googleapis";

const youtube = google.youtube("v3");
const COUNTRY_CODES = ["IN", "US", "AU", "GB"];

export type TrendItem = {
  title: string;
  url: string;
  source: string;
  kind: "YOUTUBE";
};

export async function fetchYouTubeTrends(): Promise<TrendItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY");

  const results: TrendItem[] = [];

  for (const country of COUNTRY_CODES) {
    console.log(`▶️ Fetching YouTube Tech Trends for ${country}…`);

    try {
      const res = await youtube.videos.list({
        key: apiKey,
        chart: "mostPopular",
        regionCode: country,
        videoCategoryId: "28", // Science & Technology
        maxResults: 20,
        part: ["snippet"],
      });

      for (const video of res.data.items || []) {
        const title = video.snippet?.title;
        const videoId = video.id;
        if (!title || !videoId) continue;

        results.push({
          title: title.trim(),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          source: video.snippet?.channelTitle || `youtube-${country.toLowerCase()}`,
          kind: "YOUTUBE",
        });
      }
    } catch (err) {
      console.error(`[!] YouTube Trends fetch failed for ${country}:`, err);
    }
  }

  console.log(`✅ YouTube Trends fetched ${results.length} items total`);
  return results;
}
