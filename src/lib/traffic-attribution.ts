/**
 * 세션당 1회(첫 진입) 유입 정보를 sessionStorage에 고정하고,
 * 신청 시점 리퍼러·URL과 함께 서버로 전달한다.
 */
export const TRAFFIC_STORAGE_KEY = 'biz_brain_traffic_v1';

export type TrafficFirstTouch = {
  capturedAt: string;
  firstLandingUrl: string;
  firstLandingPathWithQuery: string;
  firstReferrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  refParam: string;
  gclid: string;
  fbclid: string;
  msclkid: string;
  twclid: string;
  ttclid: string;
  /** 네이버 검색/광고 등에서 쓰이는 파라미터(있을 때만) */
  naverKeyword: string;
  naverMedia: string;
};

export type TrafficPayload = TrafficFirstTouch & {
  referrerAtSubmit: string;
  submitPageUrl: string;
};

function emptyTouch(): TrafficFirstTouch {
  return {
    capturedAt: '',
    firstLandingUrl: '',
    firstLandingPathWithQuery: '',
    firstReferrer: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    refParam: '',
    gclid: '',
    fbclid: '',
    msclkid: '',
    twclid: '',
    ttclid: '',
    naverKeyword: '',
    naverMedia: '',
  };
}

function readMarketingParams(search: string): Omit<TrafficFirstTouch, 'capturedAt' | 'firstLandingUrl' | 'firstLandingPathWithQuery' | 'firstReferrer'> {
  const sp = new URLSearchParams(search);
  const pick = (k: string) => (sp.get(k) ?? '').trim();
  return {
    utmSource: pick('utm_source'),
    utmMedium: pick('utm_medium'),
    utmCampaign: pick('utm_campaign'),
    utmContent: pick('utm_content'),
    utmTerm: pick('utm_term'),
    refParam: pick('ref'),
    gclid: pick('gclid'),
    fbclid: pick('fbclid'),
    msclkid: pick('msclkid'),
    twclid: pick('twclid'),
    ttclid: pick('ttclid'),
    naverKeyword: pick('n_keyword'),
    naverMedia: pick('n_media'),
  };
}

function buildSnapshotFromWindow(): TrafficFirstTouch {
  if (typeof window === 'undefined') {
    return { ...emptyTouch(), capturedAt: new Date().toISOString() };
  }
  const search = window.location.search;
  const marketing = readMarketingParams(search);
  return {
    capturedAt: new Date().toISOString(),
    firstLandingUrl: window.location.href.split('#')[0],
    firstLandingPathWithQuery: `${window.location.pathname}${search}`,
    firstReferrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    ...marketing,
  };
}

/** 홈 마운트 시 1회: 같은 탭 세션의 첫 유입 URL·리퍼러·UTM 고정 */
export function captureFirstTouchAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(TRAFFIC_STORAGE_KEY)) return;
    sessionStorage.setItem(TRAFFIC_STORAGE_KEY, JSON.stringify(buildSnapshotFromWindow()));
  } catch {
    // 비공개 모드·용량 등
  }
}

/** 신청 전송용: 첫 유입 + 제출 순간 리퍼러·페이지 URL */
export function getTrafficAttributionForSubmit(): TrafficPayload {
  if (typeof window === 'undefined') {
    return { ...emptyTouch(), referrerAtSubmit: '', submitPageUrl: '' };
  }
  let first: TrafficFirstTouch;
  try {
    const raw = sessionStorage.getItem(TRAFFIC_STORAGE_KEY);
    first = raw ? (JSON.parse(raw) as TrafficFirstTouch) : buildSnapshotFromWindow();
  } catch {
    first = buildSnapshotFromWindow();
  }
  return {
    ...first,
    referrerAtSubmit: document.referrer || '',
    submitPageUrl: window.location.href.split('#')[0],
  };
}
