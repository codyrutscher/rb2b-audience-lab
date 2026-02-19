// IP Geolocation and Company Lookup

export interface IPInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  company?: string;
}

// Free IP lookup using ipapi.co (1000 requests/day free)
export async function lookupIP(ip: string): Promise<IPInfo | null> {
  try {
    // Skip localhost and private IPs
    if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }

    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'Audience Lab/1.0',
      },
    });

    if (!response.ok) {
      console.error('IP lookup failed:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      country_code: data.country_code,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      isp: data.org,
      org: data.org,
      company: extractCompanyFromOrg(data.org),
    };
  } catch (error) {
    console.error('IP lookup error:', error);
    return null;
  }
}

// Alternative: Use ip-api.com (free, no key needed, 45 requests/minute)
export async function lookupIPFallback(ip: string): Promise<IPInfo | null> {
  try {
    if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,org,as,query`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === 'fail') {
      return null;
    }

    return {
      ip: data.query,
      city: data.city,
      region: data.region,
      country: data.country,
      country_code: data.countryCode,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      company: extractCompanyFromOrg(data.org),
    };
  } catch (error) {
    console.error('IP lookup fallback error:', error);
    return null;
  }
}

// Extract company name from ISP/Org string
function extractCompanyFromOrg(org?: string): string | undefined {
  if (!org) return undefined;

  // Remove common ISP suffixes
  const cleaned = org
    .replace(/\s+(LLC|Inc|Corp|Corporation|Ltd|Limited|GmbH|SA|SAS|AS\d+)\.?$/i, '')
    .replace(/^AS\d+\s+/i, '')
    .trim();

  // Filter out generic ISP names
  const genericISPs = ['comcast', 'verizon', 'att', 'charter', 'cox', 'spectrum', 'xfinity', 'centurylink', 'frontier'];
  const lowerCleaned = cleaned.toLowerCase();
  
  if (genericISPs.some(isp => lowerCleaned.includes(isp))) {
    return undefined;
  }

  return cleaned;
}

// Lookup with automatic fallback
export async function lookupIPWithFallback(ip: string): Promise<IPInfo | null> {
  let result = await lookupIP(ip);
  
  if (!result) {
    result = await lookupIPFallback(ip);
  }
  
  return result;
}
