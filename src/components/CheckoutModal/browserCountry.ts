import { isSupportedCountry, type Country } from 'react-phone-number-input'

// A time zone is a useful hint when a shopper in Israel uses an English browser.
// These are country-specific zones; shared zones such as UTC fall back to locale.
const timeZoneCountries: Record<string, Country> = {
  'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL', 'Israel': 'IL',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'Pacific/Honolulu': 'US',
  'America/Anchorage': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/Edmonton': 'CA',
  'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH',
  'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Athens': 'GR',
  'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI',
  'Europe/Bucharest': 'RO', 'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA',
  'Europe/Istanbul': 'TR', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Gaza': 'PS', 'Asia/Hebron': 'PS',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Asia/Taipei': 'TW',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU',
  'Australia/Brisbane': 'AU', 'Australia/Adelaide': 'AU',
  'Pacific/Auckland': 'NZ', 'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG',
}

export function inferCountry(languages: readonly string[], timeZone: string): Country {
  const zonedCountry = timeZoneCountries[timeZone]
  if (zonedCountry) return zonedCountry

  const locales: Intl.Locale[] = []
  for (const language of languages) {
    try {
      const locale = new Intl.Locale(language)
      if (locale.region && isSupportedCountry(locale.region)) return locale.region
      locales.push(locale)
    } catch {
      // Ignore malformed or unsupported browser language tags.
    }
  }
  for (const locale of locales) {
    const region = locale.maximize().region
    if (region && isSupportedCountry(region)) return region
  }
  return 'US'
}

export function browserCountry(): Country {
  if (typeof navigator === 'undefined') return 'US'
  let timeZone = ''
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    // Locale detection still works if the browser hides its time zone.
  }
  return inferCountry(navigator.languages ?? [navigator.language], timeZone)
}
