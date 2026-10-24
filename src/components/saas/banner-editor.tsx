"use client";
import { useState, useTransition } from "react";
import { saveWebsiteBanners } from "@/app/app/settings/banners/actions";
import type { MarketingBanner } from "@/lib/marketing-banners";

export function BannerEditor({initial}: {initial: {version: number; banners: MarketingBanner[]}}) {
  const [banners, setBanners] = useState(initial.banners);
  const [version, setVersion] = useState(initial.version);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function move(index: number, offset: number) {
    setBanners(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  return <form onSubmit={event => {event.preventDefault();setMessage("");startTransition(async () => {
    try {const result = await saveWebsiteBanners(banners, version);if(result.ok && result.version !== undefined){setVersion(result.version);setMessage("Saved. Homepage banners updated.");}else setMessage(result.error ?? "Could not save.");}
    catch {setMessage("Could not save. Check your access and connection, then retry.");}
  });}}>
    <fieldset disabled={pending} style={{border: 0, padding: 0, minWidth: 0}}>
      {banners.map((banner, index) => <section className="saas-panel" key={index} style={{marginBottom: 16}}>
        <h2>Banner {index + 1}</h2>
        {(["label", "title", "description", "action", "href", "note"] as const).map(field => <label key={field} style={{display: "grid", gap: 6, marginBottom: 12}}>
          {{label:"Label",title:"Headline",description:"Offer text / code",action:"Button text",href:"Button link",note:"Terms / referral disclosure"}[field]}
          <input required value={banner[field]} maxLength={field === "href" ? 2048 : field === "description" ? 300 : field === "note" ? 240 : field === "title" ? 160 : 80}
            onChange={event => setBanners(current => current.map((item, i) => i === index ? {...item, [field]: event.target.value} : item))} />
        </label>)}
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => move(index,-1)}>Move up</button>
          <button type="button" className="btn-secondary" disabled={index === banners.length - 1} onClick={() => move(index,1)}>Move down</button>
          <button type="button" className="btn-secondary" onClick={() => {if(window.confirm("Remove this banner? Save changes to publish the removal."))setBanners(current => current.filter((_,i) => i !== index));}}>Remove</button>
        </div>
      </section>)}
      {!banners.length && <p>No banners. Saving will hide the homepage carousel.</p>}
      <button type="button" className="btn-secondary" disabled={banners.length >= 12} onClick={() => setBanners(current => [...current,{label:"",title:"",description:"",action:"",href:"",note:""}])}>Add banner</button>{" "}
      <button type="submit" className="btn-primary">{pending ? "Saving…" : "Save and publish"}</button>
    </fieldset>
    <p role="status">{message}</p>
  </form>;
}
