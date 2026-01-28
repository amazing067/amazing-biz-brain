import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "치매 검사 | 뇌 건강 검진 | 간병비 계산 - 치매검사.com",
  description: "무료 온라인 치매 검사 및 뇌 건강 검진. 15가지 인지 기능 평가로 치매 조기 발견. 10년 후 간병비 예측까지 한 번에 확인하세요. 전문 보험설계사 무료 상담 제공.",
  keywords: ["치매 검사", "뇌 건강 검진", "간병비 계산", "치매 조기 발견", "인지 기능 검사", "간병비 보험", "치매 선별검사", "뇌 건강 평가"],
  openGraph: {
    title: "치매 검사 | 뇌 건강 검진 | 간병비 계산 - 치매검사.com",
    description: "무료 온라인 치매 검사 및 뇌 건강 검진. 15가지 인지 기능 평가로 치매 조기 발견. 10년 후 간병비 예측까지 한 번에 확인하세요.",
    url: "https://치매검사.com",
    siteName: "치매검사.com",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "치매 검사 | 뇌 건강 검진 | 간병비 계산",
    description: "무료 온라인 치매 검사 및 뇌 건강 검진. 15가지 인지 기능 평가로 치매 조기 발견.",
  },
  alternates: {
    canonical: "https://치매검사.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
