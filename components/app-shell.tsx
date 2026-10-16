"use client";

import { ClipboardList, LayoutDashboard, PackagePlus, PackageSearch } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "经营总览", icon: LayoutDashboard },
  { href: "/orders", label: "订单中心", icon: PackageSearch },
  { href: "/listings", label: "产品上架", icon: PackagePlus },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-[#f5f7f5] text-[#10231d]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-[#12342a] px-4 py-6 text-emerald-50 md:flex">
      <a href="/" className="mb-10 flex items-center gap-3 px-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[#61cb9c] text-[#12342a]"><ClipboardList size={19} /></span>
        <span><strong className="block text-sm tracking-wide">运营中枢</strong><small className="text-xs text-emerald-200/70">AMAZON OPS</small></span>
      </a>
      <nav className="space-y-2">
        {navigation.map(({ href, label, icon: Icon }) => <a key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "bg-[#2c604f] text-white" : "text-emerald-100/70 hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{label}</a>)}
      </nav>
      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-emerald-100/65">领星数据接口<br /><span className="text-emerald-200">已预留，待连接</span></div>
    </aside>
    <header className="sticky top-0 z-10 border-b border-[#d7e2dc] bg-[#f5f7f5]/90 px-5 py-4 backdrop-blur md:ml-60 md:px-10">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 md:hidden"><span className="grid size-8 place-items-center rounded-lg bg-[#12342a] text-[#61cb9c]"><ClipboardList size={16}/></span><b className="text-sm">运营中枢</b></div><p className="hidden text-sm text-[#5d6d65] md:block">运营数据每日按北京时间汇总</p><span className="rounded-full bg-[#dff1e8] px-3 py-1.5 text-xs font-medium text-[#0c4b39]">演示数据模式</span></div>
    </header>
    <main className="px-5 py-7 md:ml-60 md:px-10 md:py-9">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[#d7e2dc] bg-white px-5 py-2 md:hidden">{navigation.map(({ href, label, icon: Icon }) => <a key={href} href={href} className={`flex flex-1 flex-col items-center gap-1 py-1 text-xs ${pathname === href ? "text-[#0f5d48]" : "text-[#5d6d65]"}`}><Icon size={19}/>{label}</a>)}</nav>
  </div>;
}
