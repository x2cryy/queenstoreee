"use client";

import { markNotifsRead } from "../../../lib/admin/notifications-actions";
import ThemeToggle from "./ThemeToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Boxes, ListChecks, Radio, CalendarClock, ChevronDown, ChartColumn, ChevronLeft, History, House, LogOut, Megaphone,
  Menu, MessageCircle, Package, Palette, Receipt, Search, Settings,
  ShieldCheck, Store, UserRound, Users, Wallet, X,
} from "lucide-react";
import { signOutAction } from "../_actions";
import { NAV_ITEMS } from "./nav";

const ICONS: Record<string, typeof House> = {
  home: House, user: UserRound, store: Store, calendar: CalendarClock, package: Package, boxes: Boxes, receipt: Receipt, wallet: Wallet,
  chat: MessageCircle, users: Users, megaphone: Megaphone, palette: Palette,
  chart: ChartColumn, settings: Settings, shield: ShieldCheck, history: History, radio: Radio, listchecks: ListChecks,
};

type Child = { href: string; label: string; icon: string; match?: string[] };
type Item = { href: string; label: string; icon: string; children?: Child[] };
type User = { name: string; roleLabel: string; initial: string; permissionLabels: string[] };
type Notifs = { state: "ok" | "error"; unread: number; items: { id: string | number; title: string; body: string | null; link_url: string | null; is_read: boolean; when: string }[] };

export function AdminShell({ items, user, notifs, children }: { items: Item[]; user: User; notifs: Notifs; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<null | "notif" | "account">(null);
  const [query, setQuery] = useState("");
  const barRef = useRef<HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setPanel(null);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setPanel(null);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  function toggleMenu() {
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileOpen(true);
    else setCollapsed((c) => !c);
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  const childActive = (c: Child) =>
    isActive(c.href) ||
    (c.match ?? []).some((m) => pathname === m || pathname.startsWith(m + "/"));

  useEffect(() => {
    const g = items.find((it) => it.children?.some(childActive));
    if (g) setOpenGroup(g.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const currentChild = NAV_ITEMS.flatMap((i) => i.children ?? []).find(childActive);

  const current =
    NAV_ITEMS.find((i) => i.href === pathname) ??
    NAV_ITEMS.find((i) => i.href !== "/admin" && pathname.startsWith(i.href + "/"));

  return (
    <div className="qs-shell" data-collapsed={collapsed}>
      {mobileOpen && (
        <button className="qs-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileOpen(false)} />
      )}

      <aside className="qs-side" data-open={mobileOpen}>
        <div className="qs-side-head">
          <span className="qs-logo">QUEEN STORE</span>
          <button className="qs-icon-btn qs-only-mobile" aria-label="إغلاق" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="qs-nav" aria-label="أقسام لوحة الإدارة">
          {items.map((it) => {
            const Icon = ICONS[it.icon] ?? House;
            if (!it.children || it.children.length === 0) {
              return (
                <Link key={it.href} href={it.href} className="qs-nav-link" data-active={isActive(it.href)} title={it.label}>
                  <Icon size={18} />
                  <span className="qs-nav-label">{it.label}</span>
                </Link>
              );
            }
            const open = openGroup === it.href;
            const groupActive = it.children.some(childActive);
            const toggle = () => {
              if (collapsed) {
                setCollapsed(false);
                setOpenGroup(it.href);
              } else setOpenGroup(open ? null : it.href);
            };
            return (
              <div key={it.href} className="qs-nav-group">
                <div
                  role="button"
                  tabIndex={0}
                  className="qs-nav-link qs-nav-group-btn"
                  data-active={groupActive}
                  aria-expanded={open}
                  title={it.label}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                >
                  <Icon size={18} />
                  <span className="qs-nav-label">{it.label}</span>
                  <ChevronDown
                    size={16}
                    className="qs-nav-caret"
                    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {open && !collapsed && (
                    <motion.div
                      className="qs-nav-sub"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      {it.children.map((c) => {
                        const CIcon = ICONS[c.icon] ?? House;
                        return (
                          <Link key={c.href} href={c.href} className="qs-nav-link qs-nav-sublink" data-active={childActive(c)} title={c.label}>
                            <CIcon size={16} />
                            <span className="qs-nav-label">{c.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
        <div className="qs-side-foot">
          <Link href="/" className="qs-nav-link" title="عرض المتجر">
            <Store size={18} />
            <span className="qs-nav-label">عرض المتجر</span>
          </Link>
        </div>
      </aside>

      <div className="qs-body">
        <header className="qs-top" ref={barRef}>
          <button className="qs-icon-btn" aria-label="القائمة" onClick={toggleMenu}>
            <Menu size={18} />
          </button>

          <div className="qs-search">
            <Search size={16} className="qs-search-ico" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث سريع..."
              aria-label="بحث إداري"
            />
            <AnimatePresence>
              {query.trim().length > 0 && (
                <motion.div className="qs-pop" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <p className="qs-muted">
                    البحث الإداري قيد الإعداد. سيُربط بالمنتجات والطلبات والزبائن والمحادثات عند جاهزية صفحاتها، ولا تُعرض نتائج الآن.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="qs-actions">
            <div className="qs-rel">
              <button className="qs-icon-btn" aria-label="الإشعارات" onClick={() => { const opening = panel !== "notif"; setPanel(opening ? "notif" : null); if (opening && notifs.unread > 0) void markNotifsRead(notifs.items.filter((n) => !n.is_read).map((n) => String(n.id))); }}>
                <Bell size={18} />
                {notifs.unread > 0 && <span className="qs-badge">{notifs.unread > 9 ? "9+" : notifs.unread}</span>}
              </button>
              <AnimatePresence>
                {panel === "notif" && (
                  <motion.div className="qs-pop" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <h3>الإشعارات</h3>
                    {notifs.state === "error" ? (
                      <p className="qs-muted">تعذّر تحميل الإشعارات.</p>
                    ) : notifs.items.length === 0 ? (
                      <p className="qs-muted">لا توجد إشعارات.</p>
                    ) : (
                      <ul className="qs-notifs">
                        {notifs.items.map((n) => {
                          const inner = (
                            <>
                              <strong>{n.title}</strong>
                              {n.body && <span>{n.body}</span>}
                              <small>{n.when}</small>
                            </>
                          );
                          return (
                            <li key={n.id} data-unread={!n.is_read}>
                              {n.link_url && n.link_url.startsWith("/") ? (
                                <Link href={n.link_url}>{inner}</Link>
                              ) : (
                                <div>{inner}</div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle />
        <div className="qs-rel">
              <button className="qs-account" aria-label="قائمة الحساب" onClick={() => setPanel(panel === "account" ? null : "account")}>
                <span className="qs-name">{user.name}</span>
                <span className="qs-avatar">{user.initial}</span>
              </button>
              <AnimatePresence>
                {panel === "account" && (
                  <motion.div className="qs-pop" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <h3>{user.name}</h3>
                    <p className="qs-muted">{user.roleLabel}</p>
                    <div className="qs-chips">
                      {user.permissionLabels.length === 0 ? (
                        <span className="qs-muted">لا توجد صلاحيات ممنوحة</span>
                      ) : (
                        user.permissionLabels.map((l) => (
                          <span key={l} className="qs-chip">{l}</span>
                        ))
                      )}
                    </div>
                    <Link href="/account" className="qs-pop-link">
                      <UserRound size={16} /> حسابي
                    </Link>
                    <form action={signOutAction}>
                      <button type="submit" className="qs-pop-btn">
                        <LogOut size={16} /> تسجيل الخروج
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <nav className="qs-crumbs" aria-label="مسار التنقل">
          <Link href="/admin">الرئيسية</Link>
          {current && current.href !== "/admin" && (
            <>
              <ChevronLeft size={14} />
              <span>{current.label}</span>
            {currentChild && (
              <>
                <ChevronLeft size={14} />
                <span>{currentChild.label}</span>
              </>
            )}
            </>
          )}
        </nav>

        <main className="qa-main qs-main">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
