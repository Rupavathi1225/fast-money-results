import { useEffect, useState, Fragment } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { LinkTracking, Session, WebResult, RelatedSearch, EmailSubmission } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, MousePointer, Users, Globe, Monitor, Smartphone, RefreshCw, 
  ChevronDown, ChevronUp, Mail, Eye 
} from "lucide-react";

interface SessionAnalytics {
  session_id: string;
  ip_address: string;
  country: string;
  source: string;
  device_type: string;
  pageViews: number;
  totalClicks: number;
  uniqueClicks: number;
  relatedSearchClicks: { name: string; count: number }[];
  webResultClicks: { name: string; count: number }[];
}

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  
  const [totalClicks, setTotalClicks] = useState(0);
  const [uniqueSessions, setUniqueSessions] = useState(0);
  const [webResultCount, setWebResultCount] = useState(0);
  const [emailSubmissions, setEmailSubmissions] = useState(0);
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [clicksRes, sessionsRes, resultsRes, searchesRes, emailsRes] = await Promise.all([
        supabase.from('link_tracking').select('*').order('clicked_at', { ascending: false }),
        supabase.from('sessions').select('*').order('last_activity', { ascending: false }),
        supabase.from('web_results').select('*'),
        supabase.from('related_searches').select('*'),
        supabase.from('email_submissions').select('*'),
      ]);

      const clicks = (clicksRes.data || []) as LinkTracking[];
      const sessions = (sessionsRes.data || []) as Session[];
      const results = (resultsRes.data || []) as WebResult[];
      const searches = (searchesRes.data || []) as RelatedSearch[];
      const emails = (emailsRes.data || []) as EmailSubmission[];

      setRelatedSearches(searches);
      setWebResults(results);
      setTotalClicks(clicks.length);
      setUniqueSessions(sessions.length);
      setWebResultCount(results.length);
      setEmailSubmissions(emails.length);

      // Build session analytics
      const sessionMap = new Map<string, SessionAnalytics>();

      sessions.forEach(s => {
        sessionMap.set(s.session_id, {
          session_id: s.session_id,
          ip_address: s.ip_address || '',
          country: s.country || 'Unknown',
          source: 'direct',
          device_type: s.device_type || 'desktop',
          pageViews: 1,
          totalClicks: 0,
          uniqueClicks: 0,
          relatedSearchClicks: [],
          webResultClicks: [],
        });
      });

      clicks.forEach(c => {
        let analytics = sessionMap.get(c.session_id);
        if (!analytics) {
          let source = 'direct';
          try {
            if (c.referrer) {
              const url = new URL(c.referrer);
              if (url.hostname.includes('google')) source = 'google';
              else if (url.hostname.includes('facebook')) source = 'facebook';
              else source = url.hostname;
            }
          } catch { }
          
          analytics = {
            session_id: c.session_id,
            ip_address: c.ip_address || '',
            country: c.country || 'Unknown',
            source,
            device_type: c.device_type || 'desktop',
            pageViews: 1,
            totalClicks: 0,
            uniqueClicks: 0,
            relatedSearchClicks: [],
            webResultClicks: [],
          };
          sessionMap.set(c.session_id, analytics);
        }

        analytics.totalClicks++;

        // Track related search clicks
        if (c.related_search_id) {
          const search = searches.find(s => s.id === c.related_search_id);
          const searchName = search?.search_text || 'Unknown';
          const existing = analytics.relatedSearchClicks.find(r => r.name === searchName);
          if (existing) {
            existing.count++;
          } else {
            analytics.relatedSearchClicks.push({ name: searchName, count: 1 });
          }
        }

        // Track web result clicks
        if (c.web_result_id) {
          const result = results.find(r => r.id === c.web_result_id);
          const resultName = result?.title || 'Unknown';
          const existing = analytics.webResultClicks.find(r => r.name === resultName);
          if (existing) {
            existing.count++;
          } else {
            analytics.webResultClicks.push({ name: resultName, count: 1 });
          }
        }
      });

      // Calculate unique clicks per session
      sessionMap.forEach(analytics => {
        const uniqueWebResults = new Set(
          clicks
            .filter(c => c.session_id === analytics.session_id && c.web_result_id)
            .map(c => c.web_result_id)
        );
        analytics.uniqueClicks = uniqueWebResults.size;
      });

      setSessionAnalytics(Array.from(sessionMap.values()));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessionAnalytics.filter(s =>
    s.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{uniqueSessions}</p>
                <p className="text-sm text-muted-foreground">Unique Sessions</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{webResultCount}</p>
                <p className="text-sm text-muted-foreground">Web Results</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{emailSubmissions}</p>
                <p className="text-sm text-muted-foreground">Email Submissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Analytics */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">Session Analytics</h3>
          
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
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Session ID</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">IP Address</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Country</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Device</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Clicks</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Related Searches</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Web Results</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <Fragment key={session.session_id}>
                    <tr 
                      className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer"
                      onClick={() => setExpandedSession(
                        expandedSession === session.session_id ? null : session.session_id
                      )}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {session.session_id.substring(0, 20)}...
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {session.ip_address || '-'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {session.country}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {session.source}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          session.device_type === 'mobile' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {session.device_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-foreground font-medium">{session.totalClicks}</span>
                        <span className="text-muted-foreground text-xs ml-1">
                          ({session.uniqueClicks} unique)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                          Total: {session.relatedSearchClicks.reduce((a, b) => a + b.count, 0)}
                          {expandedSession === session.session_id ? 
                            <ChevronUp className="w-3 h-3" /> : 
                            <ChevronDown className="w-3 h-3" />
                          }
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button className="flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                          Total: {session.webResultClicks.reduce((a, b) => a + b.count, 0)}
                          {expandedSession === session.session_id ? 
                            <ChevronUp className="w-3 h-3" /> : 
                            <ChevronDown className="w-3 h-3" />
                          }
                        </button>
                      </td>
                    </tr>
                    {/* Expanded breakdown */}
                    {expandedSession === session.session_id && (
                      <tr className="bg-secondary/10">
                        <td colSpan={8} className="py-4 px-8">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Related Searches Breakdown */}
                            <div>
                              <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Related Searches Breakdown
                              </h4>
                              {session.relatedSearchClicks.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No clicks</p>
                              ) : (
                                <ul className="space-y-1">
                                  {session.relatedSearchClicks.map((item, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex justify-between">
                                      <span>{item.name}</span>
                                      <span className="font-medium text-foreground">{item.count} clicks</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {/* Web Results Breakdown */}
                            <div>
                              <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Web Results Breakdown
                              </h4>
                              {session.webResultClicks.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No clicks</p>
                              ) : (
                                <ul className="space-y-1">
                                  {session.webResultClicks.map((item, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex justify-between">
                                      <span>{item.name}</span>
                                      <span className="font-medium text-foreground">{item.count} clicks</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {filteredSessions.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No session data found.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
