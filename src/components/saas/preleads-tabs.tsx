import Link from "next/link";
import { BarChart3, Globe2, Mail } from "lucide-react";
import styles from "./preleads-tabs.module.css";
export function PreleadsTabs({ active, days = 30 }: { active: "meta" | "traffic" | "subscribers"; days?: number }) {
  return <nav className={styles.tabs} aria-label="Preleads reports">{[
    {id:"meta",label:"Meta Ads",href:"/app/leads/preleads/meta",icon:BarChart3},
    {id:"traffic",label:"Website Traffic",href:"/app/leads/preleads",icon:Globe2},
    {id:"subscribers",label:"Subscribers / Signups",href:"/app/leads/preleads/subscribers",icon:Mail},
  ].map(item=><Link key={item.id} href={`${item.href}?days=${days===7?7:30}`} aria-current={active===item.id?"page":undefined}><item.icon size={17}/>{item.label}</Link>)}</nav>;
}
