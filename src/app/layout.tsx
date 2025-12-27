import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { TextToImageProvider } from '@/contexts/TextToImageContext';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'fashion 发型',
  description: '使用 Nano-banana 生成发型效果并消耗积分',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#EFEEE6]">
        <TextToImageProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            {children}
            <Footer />
          </div>
        </TextToImageProvider>
      </body>
    </html>
  );
}
