import axios from "axios";
import * as cheerio from "cheerio";

interface LRCLIBResult {
  lyrics: string;
  hasTimings: boolean;
}

export async function fetchLyricsFromLRCLIB(
  title: string,
  artist: string,
): Promise<LRCLIBResult | null> {
  try {
    const response = await axios.get<{
      plainLyrics?: string;
      syncedLyrics?: string;
      id: number;
    }>("https://lrclib.net/api/get", {
      params: { track_name: title, artist_name: artist },
      timeout: 10_000,
    });

    const { plainLyrics, syncedLyrics } = response.data;

    if (syncedLyrics) {
      // Strip LRC timestamps for raw text, but note we have timings
      const plain = syncedLyrics
        .split("\n")
        .map((l) => l.replace(/^\[\d{2}:\d{2}\.\d+\]\s?/, "").trim())
        .filter(Boolean)
        .join("\n");
      return { lyrics: plain, hasTimings: true };
    }

    if (plainLyrics) {
      return { lyrics: plainLyrics, hasTimings: false };
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchLyricsFromGenius(
  title: string,
  artist: string,
): Promise<string | null> {
  const token = process.env.GENIUS_API_TOKEN;
  if (!token) return null;

  try {
    const searchResponse = await axios.get<{
      response: {
        hits: Array<{
          result: { title: string; primary_artist: { name: string }; url: string };
        }>;
      };
    }>("https://api.genius.com/search", {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: `${title} ${artist}` },
      timeout: 10_000,
    });

    const hits = searchResponse.data.response.hits;
    if (!hits.length) return null;

    // Best match heuristic: title + artist substring match
    const match = hits.find(
      (h) =>
        h.result.title.toLowerCase().includes(title.toLowerCase()) &&
        h.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase()),
    );

    const target = match ?? hits[0];
    if (!target) return null;

    // Scrape lyrics from the Genius song page
    const pageResponse = await axios.get<string>(target.result.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15_000,
    });

    const $ = cheerio.load(pageResponse.data);

    // Genius renders lyrics in data-lyrics-container divs
    const lines: string[] = [];
    $("[data-lyrics-container='true']").each((_, container) => {
      // Replace <br> tags with newlines before extracting text
      $(container)
        .find("br")
        .replaceWith("\n");
      const text = $(container).text();
      lines.push(text.trim());
    });

    const lyricsText = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return lyricsText || null;
  } catch {
    return null;
  }
}
