'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, ShoppingBasket, LayoutDashboard, ClipboardList, Bot,
  Truck, Zap, History,
} from 'lucide-react';

interface TabItem {
  href: string;
  label: string;
  icon: any;
}

function TabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname() ?? '';

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className="flex justify-around items-center"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 transition-colors ${
              active ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              active ? 'bg-emerald-100' : 'bg-transparent'
            }`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Buyer Mobile TabBar ────────────────────────────────────────────────────
const BUYER_TABS: TabItem[] = [
  { href: '/catalogue', label: 'Marché', icon: Home },
  { href: '/buyer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Commandes', icon: ClipboardList },
  { href: '/cart', label: 'Panier', icon: ShoppingBasket },
  { href: '/conversations', label: 'Agent', icon: Bot },
];

export function BuyerMobileTabBar() {
  return <TabBar items={BUYER_TABS} />;
}

// ─── Agent Mobile TabBar ────────────────────────────────────────────────────
const AGENT_TABS: TabItem[] = [
  { href: '/agent/deliveries', label: 'Missions', icon: Zap },
  { href: '/agent/deliveries/active', label: 'En cours', icon: Truck },
  { href: '/agent/distributions', label: 'Distrib.', icon: ClipboardList },
  { href: '/agent/history', label: 'Historique', icon: History },
];

export function AgentMobileTabBar() {
  return <TabBar items={AGENT_TABS} />;
}
