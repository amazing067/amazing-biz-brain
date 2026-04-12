/**
 * 짧은 주소: https://(도메인)/r/{slug}
 * → 홈(/)으로 리다이렉트하면서 아래 쿼리를 붙입니다.
 * 카톡·문자·단톡방마다 slug 를 다르게 두면 UTM 없이도 유입이 정확히 구분됩니다.
 *
 * slug 는 영문·숫자·하이픈 권장. 값은 "?" 없이 쿼리스트링만 적습니다.
 */
export const CHANNEL_REDIRECTS: Record<string, string> = {
  // 예시 — 실제 쓰는 채널에 맞게 수정·추가하세요.
  linktree: 'utm_source=linktree&utm_medium=profile&utm_campaign=dementia',
  'kakao-team-a': 'utm_source=kakao&utm_medium=groupchat&utm_campaign=team_a',
  'kakao-team-b': 'utm_source=kakao&utm_medium=groupchat&utm_campaign=team_b',
  sms: 'utm_source=sms&utm_medium=text&utm_campaign=outreach',
};

/** 대소문자 무시 조회 */
export function resolveChannelQuery(slug: string): string | undefined {
  const k = slug.trim();
  if (!k) return undefined;
  return CHANNEL_REDIRECTS[k] ?? CHANNEL_REDIRECTS[k.toLowerCase()];
}
