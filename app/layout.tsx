import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SwRegister } from '@/components/sw-register'
import './globals.css'

export const metadata: Metadata = {
  title: '植物大战僵尸 · 灿灿专属版',
  description:
    '献给灿灿的专属小游戏：种下向日葵与豌豆射手，收集阳光，守住属于我们的草坪，击退一波又一波可爱僵尸。',
  generator: 'ZPC',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '灿灿的植物大战僵尸',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#8ed17a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="bg-background" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <SwRegister />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
