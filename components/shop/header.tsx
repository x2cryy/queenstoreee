import Link from "next/link";
import type { Category } from "../../lib/shop/queries";
import MobileMenu from "./MobileMenu";
import SearchBox from "./SearchBox";
import CartLink from "./CartLink";
import { UserIcon } from "./icons";
import { Heart, MessageCircle } from "lucide-react";

export default function Header({ categories }: { categories: Category[] }) {
  const top = categories.filter((c) => c.parent_id == null);
  return (
    <header className="qm-header">
      <div className="qm-wrap qm-hrow">
        <MobileMenu categories={top} />
        <Link href="/" className="qm-logo qm-hlogo" aria-label="QUEEN STORE" style={{display:"inline-flex",alignItems:"center",gap:8}}><img src="/brand/q-mark.svg" alt="" style={{height:26,width:"auto",display:"block"}} /><span>QUEEN STORE</span></Link>
        <SearchBox />
        <nav className="qm-icons" aria-label="حسابي والسلة">
          <Link href="/account" className="qm-ib" aria-label="حسابي"><UserIcon /></Link>
          <Link href="/favorites" className="qm-ib qm-fav-link" aria-label="المفضلة"><Heart size={20} /></Link>
          <Link href="/chats" className="qm-ib" aria-label="محادثاتي"><MessageCircle size={20} /></Link>
          <CartLink />
        </nav>
      </div>
      <nav className="qm-wrap qm-cats-d" aria-label="الأقسام">
        <Link href="/">الرئيسية</Link>
        <Link href="/categories">الأقسام</Link>
        <Link href="/products">المنتجات</Link>
      </nav>
    </header>
  );
}
