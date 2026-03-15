import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="max-w-xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="text-white">{session?.user?.name ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="text-white">{session?.user?.email ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Configure external service credentials in your{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Cloudinary — file storage & CDN</p>
            <p>• Neon PostgreSQL — database</p>
            <p>• OpenAI GPT-4o — lyric translation</p>
            <p>• Genius API — lyric search</p>
            <p>• Redis — background job queue</p>
            <p>• WhisperX service — forced alignment</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
