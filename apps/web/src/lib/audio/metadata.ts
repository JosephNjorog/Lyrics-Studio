import * as mm from "music-metadata";

export interface AudioMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  coverArt: string | null; // base64 data URL
}

export async function extractAudioMetadata(
  buffer: Buffer,
  filename: string,
): Promise<AudioMetadata> {
  try {
    const metadata = await mm.parseBuffer(buffer, { mimeType: "audio/mpeg" });
    const { title, artist, album } = metadata.common;
    const duration = metadata.format.duration ?? null;

    let coverArt: string | null = null;
    const picture = metadata.common.picture?.[0];
    if (picture) {
      const base64 = Buffer.from(picture.data).toString("base64");
      coverArt = `data:${picture.format};base64,${base64}`;
    }

    // Fall back to filename-based title parsing: "Artist - Title.mp3"
    const derived = parseTitleFromFilename(filename);

    return {
      title: title ?? derived.title,
      artist: artist ?? derived.artist,
      album: album ?? null,
      duration: duration ? Math.round(duration) : null,
      coverArt,
    };
  } catch {
    const derived = parseTitleFromFilename(filename);
    return { ...derived, album: null, duration: null, coverArt: null };
  }
}

function parseTitleFromFilename(filename: string) {
  const name = filename.replace(/\.(mp3|mp4|m4a|wav)$/i, "");
  const parts = name.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0]?.trim() ?? null, title: parts.slice(1).join(" - ").trim() };
  }
  return { artist: null, title: name.trim() };
}
