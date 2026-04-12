import { NextRequest, NextResponse } from 'next/server';
import { resolveChannelQuery } from '@/lib/channel-redirects';

/**
 * GET /r/{slug} → /?… (channel-redirects 에 정의된 UTM 등)
 * 공유는 https://도메인/r/kakao-team-a 처럼 짧게, 유입은 JSON·이메일에 정확히 남음.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const query = resolveChannelQuery(slug);
  const target = new URL('/', request.url);
  if (query) {
    target.search = query;
  }
  return NextResponse.redirect(target, 302);
}
