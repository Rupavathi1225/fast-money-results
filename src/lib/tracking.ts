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

export const trackClick = async (
  linkId: number,
  webResultId?: string,
  referrer?: string
): Promise<void> => {
  const sessionId = generateSessionId();
  const deviceType = getDeviceType();
  const userAgent = navigator.userAgent;

  try {
    // Get IP and country from a free service
    let ipAddress = '';
    let country = '';
    
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      ipAddress = data.ip || '';
      country = data.country_name || '';
    } catch (e) {
      console.log('Could not fetch IP info');
    }

    await supabase.from('link_tracking').insert({
      link_id: linkId,
      web_result_id: webResultId || null,
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
      .single();

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
