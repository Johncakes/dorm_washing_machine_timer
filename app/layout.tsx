import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "율곡관 스마트 세탁실",
  description: "기기 상태와 남은 시간을 확인하는 로컬 연결 테스트",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
