import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BotStats {
  totalCommands: number;
  commandBreakdown: Record<string, number>;
  guilds: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<BotStats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Discord Bot Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor your bot's performance and statistics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Commands Used
              </CardTitle>
              <CardDescription>Total commands executed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.totalCommands || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🏠</span>
                Servers
              </CardTitle>
              <CardDescription>Connected Discord servers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats?.guilds || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                Bot Status
              </CardTitle>
              <CardDescription>Current bot status</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="default" className="bg-green-500 text-white">
                ✅ Online
              </Badge>
            </CardContent>
          </Card>
        </div>

        {stats?.commandBreakdown && Object.keys(stats.commandBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>🏆 Popular Commands</CardTitle>
              <CardDescription>Most frequently used commands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.commandBreakdown)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 8)
                  .map(([command, count]) => (
                    <div key={command} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                        /{command}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {count}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>🎯 Available Commands</CardTitle>
            <CardDescription>All bot slash commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📋 Basic</h4>
                <div className="space-y-1">
                  <Badge variant="outline">/ping</Badge>
                  <Badge variant="outline">/help</Badge>
                  <Badge variant="outline">/serverinfo</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🛡️ Moderation</h4>
                <div className="space-y-1">
                  <Badge variant="outline">/kick</Badge>
                  <Badge variant="outline">/ban</Badge>
                  <Badge variant="outline">/mute</Badge>
                  <Badge variant="outline">/unmute</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🎮 Fun</h4>
                <div className="space-y-1">
                  <Badge variant="outline">/roll</Badge>
                  <Badge variant="outline">/joke</Badge>
                  <Badge variant="outline">/fact</Badge>
                  <Badge variant="outline">/coinflip</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔧 Utility</h4>
                <div className="space-y-1">
                  <Badge variant="outline">/userinfo</Badge>
                  <Badge variant="outline">/avatar</Badge>
                  <Badge variant="outline">/stats</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}