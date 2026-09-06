import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://one-thing-focus.garden-peony-7510.chatgpt.site'),
  title: '壹件｜今天，只做一件',
  description: '写下待办，用两两选择确定今天最想推进的一件事，再开始专注。输入仅保存在当前浏览器。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
