import Link from "next/link";
import { ArrowRight, Music2, Wand2, Film, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Music2,
    title: "Smart Audio Analysis",
    description:
      "Upload MP3 or MP4 audio. ID3 metadata auto-populates your project — title, artist, cover art included.",
  },
  {
    icon: Wand2,
    title: "AI Lyric Sync",
    description:
      "WhisperX forced alignment maps every word to its exact millisecond. Fine-tune on an interactive timeline.",
  },
  {
    icon: Film,
    title: "Professional Render",
    description:
      "FFmpeg renders 1080p/4K MP4 with Spotify-style word highlighting, smooth scrolling, and AAC audio.",
  },
  {
    icon: Zap,
    title: "Background Processing",
    description:
      "All heavy work runs in background queues. Watch live progress bars while you prepare the next project.",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <Music2 className="h-3.5 w-3.5" />
          <span>Professional lyric video production</span>
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl">
          LyricSync{" "}
          <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">
            Studio
          </span>
        </h1>

        <p className="mb-10 text-xl leading-relaxed text-muted-foreground">
          Turn any song into a stunning lyric video in minutes. Auto-fetch lyrics, sync
          every word with AI, pick a template, and render — ready for YouTube.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2 px-8">
            <Link href="/dashboard/projects">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="glass rounded-xl p-6 transition-colors hover:border-primary/30"
          >
            <feature.icon className="mb-4 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-24 pb-8 text-center text-sm text-muted-foreground">
        LyricSync Studio — built for solo YouTube creators
      </footer>
    </main>
  );
}
