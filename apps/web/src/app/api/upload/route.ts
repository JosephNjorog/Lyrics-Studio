import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { extractAudioMetadata } from "@/lib/audio/metadata";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["audio/mpeg", "audio/mp4", "video/mp4", "audio/x-m4a"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only MP3 and MP4 audio files are supported" },
      { status: 400 },
    );
  }

  const maxSize = 200 * 1024 * 1024; // 200 MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 200 MB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract ID3 metadata
  const metadata = await extractAudioMetadata(buffer, file.name);

  // Upload to Cloudinary
  const uploaded = await uploadToCloudinary(buffer, {
    folder: `lyric-sync/${session.user.id}/audio`,
    resource_type: "video", // Cloudinary uses "video" for audio files
    public_id: `audio_${Date.now()}`,
  });

  return NextResponse.json({
    data: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      format: uploaded.format,
      size: file.size,
      duration: metadata.duration,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      coverArt: metadata.coverArt,
    },
  });
}
