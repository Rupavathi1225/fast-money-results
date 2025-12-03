import { supabase } from "@/integrations/supabase/client";

export const generateSessionId = (): string => {
  const existingSession = localStorage.getItem('fm_session_id');
  if (existingSession) {
    return existingSession;
  }
  const newSession = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('fm_session_id', newSession);
  return newSession;
};

export const getDeviceType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|tablet/i.test(userAgent)) {
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'mobile';
  }
  return 'desktop';
};

export const getSource = (): string => {
  const referrer = document.referrer;
  if (!referrer) return 'direct';
  
  try {
    const url = new URL(referrer);
    if (url.hostname.includes('google')) return 'google';
    if (url.hostname.includes('facebook')) return 'facebook';
    if (url.hostname.includes('twitter') || url.hostname.includes('x.com')) return 'twitter';
    if (url.hostname.includes('instagram')) return 'instagram';
    if (url.hostname.includes('youtube')) return 'youtube';
    if (url.hostname.includes('linkedin')) return 'linkedin';
    return url.hostname;
  } catch {
    return 'unknown';
  }
};

export const getIpInfo = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      ipAddress: data.ip || '',
      country: data.country_name || '',
    };
  } catch (e) {
    console.log('Could not fetch IP info');
    return { ipAddress: '', country: '' };
  }
};

export const trackClick = async (
  linkId: number,
  webResultId?: string,
  referrer?: string,
  relatedSearchId?: string
): Promise<void> => {
  const sessionId = generateSessionId();
  const deviceType = getDeviceType();
  const userAgent = navigator.userAgent;

  try {
    const { ipAddress, country } = await getIpInfo();

    await supabase.from('link_tracking').insert({
      link_id: linkId,
      web_result_id: webResultId || null,
      related_search_id: relatedSearchId || null,
      session_id: sessionId,
      ip_address: ipAddress,
      device_type: deviceType,
      user_agent: userAgent,
      country: country,
      referrer: referrer || document.referrer || null,
    });

    // Update or create session
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingSession) {
      await supabase
        .from('sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_id', sessionId);
    } else {
      await supabase.from('sessions').insert({
        session_id: sessionId,
        ip_address: ipAddress,
        device_type: deviceType,
        user_agent: userAgent,
        country: country,
      });
    }
  } catch (error) {
    console.error('Error tracking click:', error);
  }
};

export const trackRelatedSearchClick = async (relatedSearchId: string): Promise<void> => {
  const sessionId = generateSessionId();
  const deviceType = getDeviceType();
  const userAgent = navigator.userAgent;

  try {
    const { ipAddress, country } = await getIpInfo();

    await supabase.from('link_tracking').insert({
      link_id: 0,
      related_search_id: relatedSearchId,
      session_id: sessionId,
      ip_address: ipAddress,
      device_type: deviceType,
      user_agent: userAgent,
      country: country,
      referrer: document.referrer || null,
    });

    // Update or create session
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingSession) {
      await supabase
        .from('sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_id', sessionId);
    } else {
      await supabase.from('sessions').insert({
        session_id: sessionId,
        ip_address: ipAddress,
        device_type: deviceType,
        user_agent: userAgent,
        country: country,
      });
    }
  } catch (error) {
    console.error('Error tracking related search click:', error);
  }
};

export const getClickStats = async (webResultId: string) => {
  const { data: clicks, error } = await supabase
    .from('link_tracking')
    .select('*')
    .eq('web_result_id', webResultId);

  if (error) {
    console.error('Error fetching click stats:', error);
    return { totalClicks: 0, uniqueClicks: 0, sessions: [] };
  }

  const uniqueSessions = new Set(clicks?.map(c => c.session_id) || []);
  
  return {
    totalClicks: clicks?.length || 0,
    uniqueClicks: uniqueSessions.size,
    sessions: clicks || [],
  };
};
