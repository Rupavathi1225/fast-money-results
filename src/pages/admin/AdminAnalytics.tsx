import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { LinkTracking, Session, WebResult } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MousePointer, Users, Globe, Monitor, Smartphone, RefreshCw } from "lucide-react";

interface AnalyticsData {
  totalClicks: number;
  uniqueSessions: number;
  clicksByDevice: { desktop: number; mobile: number; tablet: number };
  clicksByCountry: Record<string, number>;
  recentClicks: LinkTracking[];
  sessions: Session[];
}

const AdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [clicksRes, sessionsRes, resultsRes] = await Promise.all([
        supabase.from('link_tracking').select('*').order('clicked_at', { ascending: false }),
        supabase.from('sessions').select('*').order('last_activity', { ascending: false }),
        supabase.from('web_results').select('*'),
      ]);

      const clicks = (clicksRes.data || []) as LinkTracking[];
      const sessions = (sessionsRes.data || []) as Session[];
      const results = (resultsRes.data || []) as WebResult[];

      // Calculate stats
      const uniqueSessionIds = new Set(clicks.map(c => c.session_id));
      
      const clicksByDevice = {
        desktop: clicks.filter(c => c.device_type === 'desktop').length,
        mobile: clicks.filter(c => c.device_type === 'mobile').length,
        tablet: clicks.filter(c => c.device_type === 'tablet').length,
      };

      const clicksByCountry: Record<string, number> = {};
      clicks.forEach(c => {
        const country = c.country || 'Unknown';
        clicksByCountry[country] = (clicksByCountry[country] || 0) + 1;
      });

      setData({
        totalClicks: clicks.length,
        uniqueSessions: uniqueSessionIds.size,
        clicksByDevice,
        clicksByCountry,
        recentClicks: clicks.slice(0, 50),
        sessions,
      });
      setWebResults(results);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWebResultTitle = (webResultId: string | null) => {
    if (!webResultId) return 'Unknown';
    const result = webResults.find(r => r.id === webResultId);
    return result?.title || 'Deleted';
  };

  const filteredClicks = data?.recentClicks.filter(c =>
    c.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getWebResultTitle(c.web_result_id).toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <MousePointer className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.totalClicks || 0}</p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.uniqueSessions || 0}</p>
                <p className="text-sm text-muted-foreground">Unique Sessions</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <Monitor className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.clicksByDevice.desktop || 0}</p>
                <p className="text-sm text-muted-foreground">Desktop Clicks</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.clicksByDevice.mobile || 0}</p>
                <p className="text-sm text-muted-foreground">Mobile Clicks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Country Stats */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" /> Clicks by Country
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(data?.clicksByCountry || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([country, count]) => (
                <div key={country} className="p-3 bg-secondary/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground truncate">{country}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Clicks */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">Recent Clicks</h3>
          
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by session, IP, country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 admin-input"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Link</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Session ID</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">IP Address</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Device</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Country</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredClicks.map((click) => (
                  <tr key={click.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-4">
                      <span className="text-primary">lid={click.link_id}</span>
                      <span className="text-muted-foreground ml-2">
                        ({getWebResultTitle(click.web_result_id)})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {click.session_id.substring(0, 20)}...
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {click.ip_address || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        click.device_type === 'mobile' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {click.device_type || 'unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {click.country || '-'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(click.clicked_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredClicks.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No click data found.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
