import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  console.log('📧 [API] 이메일 전송 요청 수신');
  
  try {
    const body = await request.json();
    const { 
      userName,
      phoneNumber, 
      total, 
      grade, 
      status,
      careType,
      realGovSupport,
      coPay,
      nonCoveredCost,
      finalSelfPay,
      futureTotalCost,
      futureGovSupport,
      futureSelfPay,
      futureDetails,
      categoryScores,
      familyWarning,
      agree1, 
      agree2 
    } = body;

    console.log('📧 [API] 요청 데이터:', {
      userName,
      phoneNumber,
      total,
      grade,
      futureSelfPay,
      agree1,
      agree2,
    });

    // 환경 변수에서 이메일 설정 가져오기
    const emailUser = process.env.EMAIL_USER || '';
    const emailPass = process.env.EMAIL_PASS || '';
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');
    const recipientEmail = process.env.RECIPIENT_EMAIL || 'induo@naver.com';

    // 디버깅 정보 (항상 출력)
    console.log('📧 [API] 환경 변수 확인:', {
      EMAIL_USER: emailUser ? `${emailUser.substring(0, 3)}***` : '❌ 없음',
      EMAIL_PASS: emailPass ? `✅ 설정됨 (길이: ${emailPass.length})` : '❌ 없음',
      EMAIL_HOST: emailHost,
      EMAIL_PORT: emailPort,
      RECIPIENT_EMAIL: recipientEmail,
      NODE_ENV: process.env.NODE_ENV,
    });

    if (!emailUser || !emailPass) {
      const missingVars = [];
      if (!emailUser) missingVars.push('EMAIL_USER');
      if (!emailPass) missingVars.push('EMAIL_PASS');
      
      return NextResponse.json(
        { 
          error: '이메일 설정이 완료되지 않았습니다.',
          details: `다음 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`,
          help: '.env.local 파일을 프로젝트 루트에 생성하고 EMAIL_USER와 EMAIL_PASS를 설정해주세요.'
        },
        { status: 500 }
      );
    }

    // Nodemailer transporter 생성
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Gmail 서비스 사용
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      // Gmail 연결을 위한 추가 옵션
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 연결 테스트 (항상 실행)
    console.log('📧 [API] 이메일 서버 연결 테스트 중...');
    try {
      await transporter.verify();
      console.log('✅ [API] 이메일 서버 연결 성공!');
    } catch (verifyError: any) {
      console.error('❌ [API] 이메일 서버 연결 실패:', verifyError);
      throw verifyError; // 연결 실패 시 에러를 다시 throw
    }

    // 영역별 점수 HTML 생성
    const categoryScoresHtml = categoryScores ? Object.entries(categoryScores).map(([cat, data]: [string, any]) => {
      const percent = data.percent || 0;
      const color = percent < 60 ? '#dc2626' : '#2563eb';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${cat}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${color}; font-weight: bold;">
            ${data.score}점 / ${data.max}점 (${percent}%)
          </td>
        </tr>
      `;
    }).join('') : '';

    // 이메일 내용 생성 (전체 결과지 상세 내역 포함)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #2563EB; border-bottom: 3px solid #2563EB; padding-bottom: 15px; margin-bottom: 30px; font-size: 24px;">
            🧠 뇌 건강 검진 결과지 및 상담 신청
          </h1>
          
          <!-- 1. 기본 정보 -->
          <div style="margin-top: 30px; background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563EB;">
            <h2 style="color: #334155; margin-bottom: 15px; font-size: 20px; font-weight: bold;">📋 신청자 기본 정보</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 180px; background-color: #f1f5f9;">이름</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: bold;">${userName || '미입력'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 180px; background-color: #f1f5f9;">연락처</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: bold;">${phoneNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">검진 총점</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 18px; font-weight: bold; color: ${total >= 80 ? '#16a34a' : '#dc2626'};">
                  ${total}점 / 100점
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">예상 장기요양등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: bold;">${grade || '미확정'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">상태</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${status || '미확정'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9;">권장 돌봄 유형</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${careType || '미확정'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; background-color: #f1f5f9;">신청 일시</td>
                <td style="padding: 10px;">${new Date().toLocaleString('ko-KR', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</td>
              </tr>
            </table>
          </div>

          <!-- 2. 영역별 상세 점수 -->
          <div style="margin-top: 30px; background-color: white; padding: 20px; border-radius: 8px; border: 2px solid #e2e8f0;">
            <h2 style="color: #334155; margin-bottom: 20px; font-size: 20px; font-weight: bold;">📊 영역별 상세 점수</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${categoryScoresHtml || '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #64748b;">점수 정보 없음</td></tr>'}
            </table>
          </div>

          <!-- 3. 2026년 현재 비용 -->
          <div style="margin-top: 30px; background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
            <h2 style="color: #1e40af; margin-bottom: 20px; font-size: 20px; font-weight: bold;">📊 2026년 월 예상 비용 (현재 기준)</h2>
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #2563eb;">국가 지원금 (최대)</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 16px;">${(realGovSupport || 0).toLocaleString()}원</span>
              </div>
            </div>
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 2px solid #dc2626;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #dc2626; font-size: 16px;">실제 본인 부담금 (월)</span>
                <span style="font-weight: bold; color: #dc2626; font-size: 20px;">${(finalSelfPay || 0).toLocaleString()}원</span>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dc2626;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                  <span>① 법정 본인부담금</span>
                  <span>${(coPay || 0).toLocaleString()}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px; color: #dc2626; font-weight: bold;">
                  <span>② 비급여 (식대/간병비)</span>
                  <span>+${(nonCoveredCost || 0).toLocaleString()}원</span>
                </div>
              </div>
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #64748b; text-align: center;">
              📋 2026년 장기요양 수가 고시 기준 반영
            </p>
          </div>

          <!-- 4. 2036년 미래 비용 (상세 내역) -->
          <div style="margin-top: 30px; background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 2px solid #dc2626;">
            <div style="background-color: #dc2626; color: white; padding: 10px; border-radius: 6px; margin-bottom: 20px; text-align: center; font-weight: bold;">
              🚨 10년 후 (2036년) 예상 비용 | 물가상승률 반영
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #2563eb;">국가 지원금 (예상)</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 16px;">${(futureGovSupport || 0).toLocaleString()}원</span>
              </div>
            </div>
            
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border: 2px solid #dc2626; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #dc2626; font-size: 18px;">실제 본인 부담금</span>
                <span style="font-weight: bold; color: #dc2626; font-size: 24px;">
                  ${futureSelfPay >= 10000 ? `${Math.round(futureSelfPay / 10000)}만원` : `${(futureSelfPay || 0).toLocaleString()}원`}
                </span>
              </div>
              <p style="text-align: right; font-size: 12px; color: #64748b; margin-top: 5px;">
                ${(futureSelfPay || 0).toLocaleString()}원
              </p>
            </div>

            <!-- 상세 산출 근거 -->
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 2px solid #d1d5db;">
              <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px; font-weight: bold;">
                🧾 비용 산출 상세 내역 (월 기준)
              </h3>
              <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-weight: bold; color: #dc2626;">
                    ① 사적 간병비 (인건비) <span style="background-color: #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 12px;">최대 부담</span>
                  </span>
                  <span style="font-weight: bold; color: #dc2626; font-size: 18px;">${((futureDetails?.caregiver) || 0).toLocaleString()}원</span>
                </div>
                <p style="font-size: 12px; color: #991b1b; margin-top: 8px; padding: 8px; background-color: #fee2e2; border-radius: 4px;">
                  ⚠️ 정부 지원 없음 (100% 본인 부담) | 실손보험 비적용
                </p>
              </div>
              
              <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-weight: bold; color: #1e40af;">② 병원비/시설비</span>
                  <span style="font-weight: bold; color: #1e40af; font-size: 16px;">${((futureDetails?.medical) || 0).toLocaleString()}원</span>
                </div>
              </div>
              
              <div style="background-color: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #16a34a; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-weight: bold; color: #166534;">③ 식대/소모품 (기저귀 등)</span>
                  <span style="font-weight: bold; color: #166534; font-size: 16px;">${((futureDetails?.living) || 0).toLocaleString()}원</span>
                </div>
              </div>

              <!-- 합계 -->
              <div style="background-color: #e5e7eb; padding: 15px; border-radius: 8px; border: 2px solid #9ca3af; margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid #9ca3af; margin-bottom: 10px;">
                  <span style="font-weight: bold; font-size: 16px;">총 비용 합계 (2036년 예상)</span>
                  <span style="font-weight: bold; font-size: 18px;">${(futureTotalCost || 0).toLocaleString()}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb;">
                  <span style="font-weight: bold;">- 국가 지원금 (예상)</span>
                  <span style="font-weight: bold;">${(futureGovSupport || 0).toLocaleString()}원</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #dc2626; background-color: #fee2e2; margin: 10px -15px -15px -15px; padding: 15px; border-radius: 0 0 8px 8px;">
                  <span style="font-weight: bold; color: #dc2626; font-size: 18px;">= 실제 본인 부담금</span>
                  <span style="font-weight: bold; color: #dc2626; font-size: 20px;">${(futureSelfPay || 0).toLocaleString()}원</span>
                </div>
                <p style="text-align: right; font-size: 11px; color: #6b7280; margin-top: 10px;">
                  * 계산 근거: 2026년 기준 비용 × 물가상승률 1.5배 (연 평균 4% 상승 × 10년)
                </p>
              </div>
            </div>

            <!-- 경고 메시지 -->
            ${familyWarning ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin-top: 20px;">
              <p style="color: #92400e; font-weight: bold; margin: 0; text-align: center; white-space: pre-line;">
                ${familyWarning}
              </p>
            </div>
            ` : ''}

            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border: 2px solid #dc2626; margin-top: 15px;">
              <p style="color: #991b1b; font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 16px;">
                🚨 간병비는 실손보험 미적용
              </p>
              <p style="color: #991b1b; font-size: 14px; text-align: center; line-height: 1.6;">
                사적 간병비는 건강보험/장기요양/실손보험 모두 비적용 항목입니다.<br/>
                오직 치매/간병 보험으로만 준비 가능합니다.
              </p>
            </div>
          </div>

          <!-- 5. 장기요양 등급별 한도액 -->
          <div style="margin-top: 30px; background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
            <h2 style="color: #1e40af; margin-bottom: 20px; font-size: 20px; font-weight: bold;">💡 2026년 등급별 월 한도액 (인상)</h2>
            <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden;">
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">1등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">2,512,900원</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">2등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">2,331,200원</td>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">3등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">1,528,200원</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">4등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">1,409,700원</td>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">5등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">1,208,900원</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">인지지원등급</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">676,320원</td>
              </tr>
            </table>
            <p style="margin-top: 10px; font-size: 11px; color: #64748b; text-align: right;">* 본인부담금 제외 전 금액</p>
          </div>

          <!-- 6. 동의 사항 -->
          <div style="margin-top: 30px; background-color: white; padding: 20px; border-radius: 8px; border: 2px solid #e2e8f0;">
            <h2 style="color: #334155; margin-bottom: 20px; font-size: 20px; font-weight: bold;">✅ 동의 사항</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 200px;">개인정보 수집 및 이용 동의</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: ${agree1 ? '#16a34a' : '#dc2626'}; font-weight: bold; font-size: 16px;">
                  ${agree1 ? '✅ 동의' : '❌ 미동의'}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">보험 상품 안내 및 마케팅 활용 동의</td>
                <td style="padding: 10px; color: ${agree2 ? '#16a34a' : '#dc2626'}; font-weight: bold; font-size: 16px;">
                  ${agree2 ? '✅ 동의' : '❌ 미동의'}
                </td>
              </tr>
            </table>
          </div>

          <!-- 7. 다음 단계 -->
          <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; font-weight: bold; margin-bottom: 10px; font-size: 16px;">
              💡 다음 단계
            </p>
            <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>전문 보험설계사가 1~2일 내 연락 예정</li>
              <li>무료 보장분석 및 맞춤형 간병비 보험 설계안 제공</li>
              <li>간병비 예상 견적서 및 분석 자료 문자 발송</li>
            </ul>
          </div>

          <!-- 푸터 -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-align: center;">
            <p>이 이메일은 뇌 건강 검진 시스템으로부터 자동 전송되었습니다.</p>
            <p style="margin-top: 5px;">문의사항이 있으시면 담당자에게 연락해주세요.</p>
          </div>
        </div>
      </div>
    `;

    // 이메일 전송
    console.log('📧 [API] 이메일 전송 시작...', {
      from: emailUser,
      to: recipientEmail,
      subject: `[뇌 건강 검진] 신규 상담 신청 - ${userName || '이름미입력'} (${phoneNumber})`,
    });

    const mailResult = await transporter.sendMail({
      from: `"뇌 건강 검진 시스템" <${emailUser}>`,
      to: recipientEmail,
      subject: `[뇌 건강 검진] 신규 상담 신청 - ${userName || '이름미입력'} (${phoneNumber})`,
      html: htmlContent,
    });

    console.log('✅ [API] 이메일 전송 성공!', {
      messageId: mailResult.messageId,
      response: mailResult.response,
    });

    return NextResponse.json({ success: true, message: '이메일이 성공적으로 전송되었습니다.' });
  } catch (error: any) {
    console.error('❌ [API] 이메일 전송 오류:', error);
    console.error('❌ [API] 에러 상세:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
    });
    
    // Gmail 관련 일반적인 오류 메시지 처리
    let errorMessage = error.message || '이메일 전송 중 오류가 발생했습니다.';
    let helpMessage = '';
    
    if (error.message?.includes('Invalid login') || error.code === 'EAUTH') {
      errorMessage = '이메일 주소 또는 앱 비밀번호가 잘못되었습니다.';
      helpMessage = 'EMAIL_USER와 EMAIL_PASS를 확인해주세요. Gmail 앱 비밀번호를 사용해야 합니다.';
    } else if (error.message?.includes('Connection') || error.code === 'ECONNECTION') {
      errorMessage = '이메일 서버에 연결할 수 없습니다.';
      helpMessage = '인터넷 연결을 확인하거나 EMAIL_HOST와 EMAIL_PORT를 확인해주세요.';
    } else if (error.message?.includes('authentication') || error.code === 'EAUTH') {
      errorMessage = '인증에 실패했습니다.';
      helpMessage = '앱 비밀번호가 올바른지 확인해주세요. Gmail 2단계 인증이 활성화되어 있어야 합니다.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '서버 연결 시간이 초과되었습니다.';
      helpMessage = '네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error.message,
        code: error.code,
        help: helpMessage,
        fullError: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
