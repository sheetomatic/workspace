"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isPublicAnalyticsPath, META_PIXEL_ID, trafficSource } from "@/lib/website-analytics";

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
    if (location.search || location.hash) {window.fbq?.("consent","revoke");return;}
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
  return <aside aria-label="Analytics preferences" style={{position:"fixed",bottom:12,left:12,zIndex:90,maxWidth:"min(420px, calc(100vw - 24px))",padding:12,borderRadius:12,background:"#fff",color:"#172033",boxShadow:"0 2px 12px #0002"}}>
    {choice && !settings ? <button type="button" onClick={()=>setSettings(true)}>Privacy preferences</button> : <>
      <p>Allow website measurement and Meta advertising analytics? This uses a random browser identifier and shares browsing information with Meta. No form entries are included. <a href="/privacy">Privacy policy</a></p>
      <button type="button" onClick={()=>save("accepted")}>Allow analytics</button>{" "}<button type="button" onClick={()=>save("declined")}>Decline</button>
    </>}
  </aside>;
}
