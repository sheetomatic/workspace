"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isPublicAnalyticsPath, META_PIXEL_ID, safePixelContext, trafficSource } from "@/lib/website-analytics";
import styles from "./website-analytics.module.css";

type Pixel = ((...args: unknown[]) => void) & {queue?: unknown[][];callMethod?: (...args: unknown[]) => void;loaded?: boolean;version?: string;push?: Pixel};
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel; } }
const choiceKey = "sheetomatic-measurement-consent-v1";
export function WebsiteAnalytics() {
  const path = usePathname();
  const [choice,setChoice] = useState<string | null>(null);
  const [settings,setSettings] = useState(false);
  const [eligible,setEligible] = useState(false);
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hostname is only available after browser hydration
    setEligible(["sheetomatic.com","www.sheetomatic.com"].includes(location.hostname));
    try {
      setChoice(localStorage.getItem(choiceKey));
    } catch { /* Consent remains unset when storage is unavailable. */ }
  }, []);
  useEffect(() => {
    const publicHost = ["sheetomatic.com","www.sheetomatic.com"].includes(location.hostname);
    if (choice !== "accepted" || !publicHost || !isPublicAnalyticsPath(path)) {
      window.fbq?.("consent", "revoke"); lastPath.current=null; return;
    }
    if (lastPath.current === path) return;
    lastPath.current = path;
    let visitor: string;
    try {
      visitor=localStorage.getItem("sheetomatic-traffic-visitor") || crypto.randomUUID();
      localStorage.setItem("sheetomatic-traffic-visitor",visitor);
    } catch { visitor=crypto.randomUUID(); }
    void fetch("/api/website-traffic", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:crypto.randomUUID(),visitor,path,source:trafficSource(document.referrer)}),keepalive:true}).catch(()=>{});
    // Meta receives its normal page URL. Do not send query strings or fragments.
    if (!safePixelContext(location.href,document.referrer)) {window.fbq?.("consent","revoke");return;}
    if (!window.fbq) {
      const pixel: Pixel = (...args) => {if(pixel.callMethod)pixel.callMethod(...args);else pixel.queue?.push(args);};
      pixel.queue=[];pixel.loaded=true;pixel.version="2.0";pixel.push=pixel;
      window.fbq=pixel;window._fbq=pixel;
      pixel("set","autoConfig",false,META_PIXEL_ID);
      pixel("init",META_PIXEL_ID);
      const script=document.createElement("script");script.async=true;script.src="https://connect.facebook.net/en_US/fbevents.js";script.id="sheetomatic-meta-pixel";document.head.appendChild(script);
    }
    window.fbq("consent","grant");
    window.fbq("trackSingle",META_PIXEL_ID,"PageView");
  },[choice,path]);
  if (!eligible || !isPublicAnalyticsPath(path)) return null;
  function save(value: string) {
    try {localStorage.setItem(choiceKey,value);if(value!=="accepted")localStorage.removeItem("sheetomatic-traffic-visitor");} catch {}
    setChoice(value);setSettings(false);
  }
  return <aside aria-label="Analytics preferences" className={`${styles.container} ${choice && !settings ? styles.preferences : styles.panel}`}>
    {choice && !settings ? <button type="button" onClick={()=>setSettings(true)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /></svg>Privacy preferences</button> : <>
      <div className={styles.heading}><span className={styles.icon}><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></svg></span><h2>Website analytics</h2></div>
      <p className={styles.description}>Allow website measurement and Meta advertising analytics? We use a random browser identifier and share browsing information with Meta. No form entries are included.</p>
      <a className={styles.policy} href="/privacy">Privacy policy</a>
      <div className={styles.actions}><button className={styles.allow} type="button" onClick={()=>save("accepted")}>Allow analytics</button><button className={styles.decline} type="button" onClick={()=>save("declined")}>Decline</button></div>
      <p className={styles.note}>Optional. You can change your choice anytime in Privacy preferences.</p>
    </>}
  </aside>;
}
