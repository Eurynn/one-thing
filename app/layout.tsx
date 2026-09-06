import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://one-thing-focus.bbk972517.chatgpt.site'),
  title: '壹件｜今天，只做一件',
  description: '写下待办，选定今天的一件事；其余事项自动收好，并用两分钟启动和中断接回点真正开始。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

