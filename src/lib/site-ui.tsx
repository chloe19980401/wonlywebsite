import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronRight, X, Check, Globe } from "lucide-react";
import { create } from "zustand";
import { trackLead } from "@/lib/analytics";
import { submitEnquiry } from "@/lib/form-config";
import { LANGUAGES, pathForLocale, useLocale } from "@/lib/i18n";
import { journeyEvent, serializeJourney, type InquiryJourneyEvent } from "@/lib/inquiry-journey";

/* Shared silver-white-gold design tokens (matches the homepage) */
export const GOLD = "#BFA06A";
export const GOLD_DEEP = "#B08D4F"; // deeper, higher-contrast gold for uppercase kickers
export const CHAMP = "#D4C4A0";
export const SILVER = "#B8BFC8";
export const CHAMP_BG = "#F5F1EA";
export const DARK = "#221F20";
export const MUTED = "#5f5a54";
export const BASE = import.meta.env.BASE_URL;
export const LOGO = `${BASE}images/logo-trim.webp`;

export const eyebrow = "text-[12px] tracking-[0.3em] uppercase font-semibold";
export const h2cls = "font-light leading-[1.1] tracking-[0.01em] text-[34px] md:text-[58px]";

/* Scroll-reveal wrapper (identical behaviour to the homepage) */
export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVis(true); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(30px)", transition: `opacity .8s ease ${delay}ms, transform .8s cubic-bezier(.22,1,.36,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

/* Full nav framework (mirrors the homepage). Section items link back to the
   homepage and scroll there via its hash handler; S80 + About are real pages. */
/* ── Navigation & footer are CMS-editable: content/settings/navigation.json ──
   Edited via /admin → 站点设置. Image paths in the JSON are relative to
   public/images/ and get the BASE prefix here. Empty href = non-link label. */
type NavChild = { label: string; href: string; img?: string; children?: { label: string; href: string; img?: string }[] };
type NavItem = { label: string; href?: string; children?: NavChild[] };

const NAV_RAW = import.meta.glob("/content/settings/navigation.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const SITE_NAV_DATA = JSON.parse(Object.values(NAV_RAW)[0] || '{"nav":[],"footer":[]}') as {
  nav: { label: string; href?: string; children?: { label: string; href?: string; img?: string; children?: { label: string; href?: string; img?: string }[] }[] }[];
  footer: { h: string; links: { l: string; href?: string }[] }[];
};
const img_ = (p?: string) => (p ? `${BASE}${p.replace(/^\//, "")}` : undefined);
const NAV: NavItem[] = SITE_NAV_DATA.nav.map((n) => ({
  label: n.label,
  href: n.href || undefined,
  children: n.children?.map((c) => ({
    label: c.label,
    href: c.href || "#",
    img: img_(c.img),
    children: c.children?.map((sc) => ({ label: sc.label, href: sc.href || "#", img: img_(sc.img) })),
  })),
}));

/* Shared "Get a Quote" modal state (zustand) */
export const useQuoteStore = create<{
  open: boolean; presetBiz: string; presetSubject: string;
  setOpen: (v: boolean) => void;
  openQuote: (opts?: { biz?: string; subject?: string }) => void;
}>((set) => ({
  open: false,
  presetBiz: "",
  presetSubject: "",
  setOpen: (v) => set({ open: v }),
  openQuote: (opts) => set({ open: true, presetBiz: opts?.biz || "", presetSubject: opts?.subject || "" }),
}));

const QUOTE_PRODUCTS = ["Security Doors", "Smart Locks", "Wooden Doors", "Aluminum Windows", "Whole-House Intelligence", "Medical Doors"];
const BIZ_TYPES = ["Distributor / Dealer", "Project / Developer", "OEM / ODM", "Retailer", "Architect / Specifier", "Other"];
const VOLUMES = ["1–50 units", "50–500 units", "500–2,000 units", "2,000+ units", "Not sure yet"];
const TIMELINES = ["Immediately", "Within 1–3 months", "3–6 months", "6+ months / planning"];

const qLabel = "text-[11px] tracking-[0.08em] uppercase font-medium";
const qInput = "mt-1.5 w-full bg-white rounded-lg px-4 py-2.5 text-sm text-[#221F20] placeholder-black/25 focus:outline-none";

/* Detailed quote-request modal, opened from any CTA on the subpages */
export function QuoteModal() {
  const { open, setOpen, presetBiz, presetSubject } = useQuoteStore();
  const { t } = useLocale();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", role: "", country: "", email: "", phone: "", biz: "", volume: "", timeline: "", message: "" });
  const [picks, setPicks] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const journey = useRef<InquiryJourneyEvent[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (open) {
      journey.current = [
        journeyEvent("cta_click", { cta_name: "Get Solutions & Quote", product_context: presetSubject || presetBiz }),
        journeyEvent("form_open", { section_name: "quote_modal", product_context: presetSubject || presetBiz }),
      ];
      started.current = false;
      document.body.style.overflow = "hidden";
      setForm((f) => ({ ...f, biz: presetBiz || f.biz, message: presetSubject && !f.message ? `I'm interested in WONLY's ${presetSubject}. ` : f.message }));
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, presetBiz, presetSubject]);

  if (!open) return null;

  const set = (k: keyof typeof form, v: string) => {
    if (!started.current) {
      started.current = true;
      journey.current.push(journeyEvent("form_start", { section_name: "quote_modal", product_context: presetSubject || presetBiz }));
    }
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  };
  const togglePick = (p: string) => setPicks((ps) => ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]);
  const close = () => { setOpen(false); setTimeout(() => setSent(false), 300); };
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!form.company.trim()) e.company = "Please enter your company.";
    if (!form.country.trim()) e.country = "Please enter your country or region.";
    if (!form.email.trim()) e.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (!form.biz) e.biz = "Please select a business type.";
    if (!form.message.trim()) e.message = "Please tell us about your project.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    journey.current.push(journeyEvent("form_submit", { section_name: "quote_modal", product_context: presetSubject || presetBiz }));
    try {
      const data = await submitEnquiry({
        subject: presetSubject ? `WONLY Enquiry \u2014 ${presetSubject}` : "New WONLY Website Enquiry",
        recipient: "inquiry@wonlyglobal.com",
        name: form.name,
        company: form.company,
        job_title: form.role,
        country: form.country,
        email: form.email,
        phone: form.phone,
        business_type: form.biz,
        volume: form.volume,
        timeline: form.timeline,
        interests: picks.join(", "),
        message: form.message,
        source: "quote_modal",
        journey_session: journey.current[0]?.session_ref || "",
        journey_events: serializeJourney(journey.current),
      });
      if (data.success) { setSent(true); trackLead({ form_location: "quote_modal", business_type: form.biz || "" }); }
      else setErrors({ submit: data.message || "Submission failed. Please email inquiry@wonlyglobal.com." });
    } catch {
      setErrors({ submit: "Network error. Please email inquiry@wonlyglobal.com directly." });
    } finally {
      setSending(false);
    }
  };

  const border = (k: string) => ({ border: `1px solid ${errors[k] ? "#c0564a" : "rgba(34,31,32,0.16)"}` });
  const Err = ({ k }: { k: string }) => errors[k] ? <span className="mt-1 block text-[11px]" style={{ color: "#c0564a" }}>{errors[k]}</span> : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start md:items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(13,13,13,0.75)" }} onClick={close}>
      <div className="relative w-full max-w-2xl my-6 rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 md:px-8 py-5" style={{ background: DARK }}>
          <div>
            <div className={eyebrow} style={{ color: CHAMP }}>{t("Get Solutions & Quote")}</div>
            <div className="mt-1 text-white text-lg font-light">{sent ? t("Request received") : t("Tell us about your project")}</div>
          </div>
          <button onClick={close} aria-label="Close" className="text-white/70 hover:text-white transition-colors"><X size={22} /></button>
        </div>

        {sent ? (
          <div className="p-10 md:p-14 text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}><Check size={22} style={{ color: GOLD }} /></div>
            <h3 className="mt-5 text-xl md:text-2xl font-light" style={{ color: DARK }}>Thank you — we'll be in touch within 24 hours.</h3>
            <p className="mt-3 text-sm font-light" style={{ color: MUTED }}>Our team will reply with tailored specifications, compliance documentation and pricing.</p>
            <button onClick={close} className="mt-7 px-7 py-3 rounded-full text-sm font-medium" style={{ background: GOLD, color: DARK }}>{t("Close")}</button>
          </div>
        ) : (
          <form noValidate onSubmit={submit} className="p-6 md:p-8 max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Full Name")} <span style={{ color: "#c0564a" }}>*</span></span>
                <input className={qInput} style={border("name")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" /><Err k="name" /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Company")} <span style={{ color: "#c0564a" }}>*</span></span>
                <input className={qInput} style={border("company")} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" /><Err k="company" /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Job Title")}</span>
                <input className={qInput} style={border("role")} value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Purchasing Manager" /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Country / Region")} <span style={{ color: "#c0564a" }}>*</span></span>
                <input className={qInput} style={border("country")} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Country / region" /><Err k="country" /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Email")} <span style={{ color: "#c0564a" }}>*</span></span>
                <input type="email" className={qInput} style={border("email")} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" /><Err k="email" /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Phone / WhatsApp")}</span>
                <input className={qInput} style={border("phone")} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 ..." /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Business Type")} <span style={{ color: "#c0564a" }}>*</span></span>
                <select className={qInput} style={{ ...border("biz"), color: form.biz ? "#221F20" : "rgba(34,31,32,0.4)" }} value={form.biz} onChange={(e) => set("biz", e.target.value)}>
                  <option value="" disabled>{t("Select")}…</option>{BIZ_TYPES.map((b) => <option key={b} value={b}>{t(b)}</option>)}
                </select><Err k="biz" /></label>
              <label className="block"><span className={qLabel} style={{ color: MUTED }}>{t("Estimated Volume")}</span>
                <select className={qInput} style={{ ...border("volume"), color: form.volume ? "#221F20" : "rgba(34,31,32,0.4)" }} value={form.volume} onChange={(e) => set("volume", e.target.value)}>
                  <option value="" disabled>{t("Select")}…</option>{VOLUMES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select></label>
              <label className="block sm:col-span-2"><span className={qLabel} style={{ color: MUTED }}>{t("Target Timeline")}</span>
                <select className={qInput} style={{ ...border("timeline"), color: form.timeline ? "#221F20" : "rgba(34,31,32,0.4)" }} value={form.timeline} onChange={(e) => set("timeline", e.target.value)}>
                  <option value="" disabled>{t("Select")}…</option>{TIMELINES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select></label>
            </div>

            <div className="mt-5"><span className={qLabel} style={{ color: MUTED }}>{t("Products of Interest")}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUOTE_PRODUCTS.map((p) => {
                  const on = picks.includes(p);
                  return <button type="button" key={p} onClick={() => togglePick(p)} className="px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors" style={on ? { background: GOLD, color: DARK } : { background: "transparent", color: MUTED, border: `1px solid ${SILVER}88` }}>{p}</button>;
                })}
              </div>
            </div>

            <label className="block mt-5"><span className={qLabel} style={{ color: MUTED }}>{t("Message")} <span style={{ color: "#c0564a" }}>*</span></span>
              <textarea rows={3} className={qInput + " resize-none"} style={border("message")} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Tell us about your project, territory or requirements…" /><Err k="message" /></label>

            {errors.submit ? <div className="mt-4 text-[13px] text-center" style={{ color: "#c0564a" }}>{errors.submit}</div> : null}
            <button type="submit" disabled={sending} className="mt-6 w-full px-8 py-3.5 rounded-full text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-60" style={{ background: GOLD, color: DARK }}>{sending ? t("Sending…") : t("Submit Request")}</button>
            <p className="mt-3 text-center text-[11px] font-light" style={{ color: MUTED }}>We reply within 24 hours. Your details are used only to respond to this enquiry.</p>
          </form>
        )}
      </div>
    </div>
  );
}

/* Sticky header — transparent over a dark hero, frosted once scrolled */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const openQuote = useQuoteStore((s) => s.openQuote);
  const { locale, language, pathname, t } = useLocale();
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
    <header className={`fixed top-0 inset-x-0 z-[70] transition-[background-color,box-shadow] duration-500 ${solid ? "bg-[#F5F1EA]/90 backdrop-blur-md shadow-[0_1px_0_rgba(34,31,32,0.06)]" : "bg-transparent"}`}>
      {!solid && <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.42), rgba(0,0,0,0))" }} />}
      <div className="relative max-w-[1600px] mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        <Link to="/" className="shrink-0" aria-label="WONLY — home">
          <img src={LOGO} alt="WONLY" className="h-5 md:h-6 w-auto transition-[filter] duration-500" style={{ filter: solid ? "none" : "brightness(0) invert(1)" }} />
        </Link>
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <div key={n.label} className="relative" onMouseEnter={() => n.children && setOpenDrop(n.label)} onMouseLeave={() => { setOpenDrop(null); setOpenSub(null); }}>
              {n.href ? (
                <Link to={n.href} className="px-3.5 py-2 text-sm font-light flex items-center gap-1 transition-colors" style={{ color: solid ? DARK : "rgba(255,255,255,0.95)" }}>{t(n.label)}{n.children && <ChevronDown size={13} />}</Link>
              ) : (
                <span className="px-3.5 py-2 text-sm font-light flex items-center gap-1 cursor-default select-none" style={{ color: solid ? DARK : "rgba(255,255,255,0.95)" }}>{t(n.label)}{n.children && <ChevronDown size={13} />}</span>
              )}
              {n.children && openDrop === n.label && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-[300px] rounded-xl bg-[#F5F1EA]/95 backdrop-blur-md shadow-2xl border border-black/5 p-2">
                  {n.children.map((c) => (
                    <div key={c.label} className="relative" onMouseEnter={() => setOpenSub(c.children ? c.label : null)}>
                      <Link to={c.href} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-light rounded-lg hover:bg-black/[0.04] transition-colors" style={{ color: DARK }}>
                        {c.img && <span className="w-9 h-9 rounded-md shrink-0 overflow-hidden flex items-center justify-center p-1 bg-white"><img src={c.img} alt="" loading="lazy" className="max-w-full max-h-full object-contain" /></span>}
                        <span className="leading-tight whitespace-nowrap flex-1">{t(c.label)}</span>
                        {c.children && <ChevronRight size={14} style={{ color: MUTED }} />}
                      </Link>
                      {c.children && openSub === c.label && (
                        <div className="absolute top-0 left-full w-[220px] rounded-xl bg-[#F5F1EA]/95 backdrop-blur-md shadow-2xl border border-black/5 p-2">
                          {c.children.map((sc) => (
                            <Link key={sc.label} to={sc.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-light hover:bg-black/[0.04] transition-colors" style={{ color: DARK }}>
                              {sc.img && <span className="w-7 h-7 rounded-md shrink-0 overflow-hidden flex items-center justify-center p-1 bg-white"><img src={sc.img} alt="" loading="lazy" className="max-w-full max-h-full object-contain" /></span>}
                              <span className="leading-tight whitespace-nowrap">{t(sc.label)}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block" onMouseEnter={() => setOpenDrop("__language")} onMouseLeave={() => setOpenDrop(null)}>
            <button aria-label={t("Select language")} className="h-10 px-3 rounded-full inline-flex items-center gap-2 text-xs border" style={{ color: solid ? DARK : "#fff", borderColor: solid ? "rgba(34,31,32,.18)" : "rgba(255,255,255,.35)" }}>
              <Globe size={15} /><span>{language.nativeLabel}</span><ChevronDown size={12} />
            </button>
            {openDrop === "__language" && (
              <div className="absolute top-full right-0 min-w-[170px] rounded-xl bg-[#F5F1EA]/98 shadow-2xl border border-black/5 p-2">
                {LANGUAGES.map((item) => (
                  <a key={item.code} href={pathForLocale(pathname, item.code)} hrefLang={item.code} lang={item.code} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-black/[0.04]" style={{ color: DARK, fontWeight: item.code === locale ? 600 : 400 }}>
                    <span>{item.nativeLabel}</span><span className="text-[10px] uppercase opacity-50">{item.code}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => openQuote()} className="px-4 md:px-5 py-2.5 rounded-full text-[12px] md:text-[13px] font-medium transition-transform hover:scale-[1.03]" style={{ background: GOLD, color: DARK }}>{t("Get Solutions & Quote")}</button>
        </div>
      </div>
    </header>
    <QuoteModal />
    </>
  );
}

/* Closing CTA band shared by subpages */
export function CtaBand({ eyebrowText = "Get Solutions & Quote", title = "Ready To Open Your Market?", sub = "Tell us about your project or territory — our team replies within 24 hours." }: { eyebrowText?: string; title?: string; sub?: string }) {
  const openQuote = useQuoteStore((s) => s.openQuote);
  return (
    <section className="px-[7vw] py-24 md:py-32 text-center" style={{ background: DARK }}>
      <Reveal className="max-w-3xl mx-auto">
        <div className={eyebrow} style={{ color: CHAMP }}>{eyebrowText}</div>
        <h2 className="mt-5 font-light leading-[1.1] text-[32px] md:text-[56px] text-white">{title}</h2>
        <p className="mt-6 max-w-xl mx-auto text-base font-normal leading-relaxed" style={{ color: "rgba(245,241,234,0.7)" }}>{sub}</p>
        <button onClick={() => openQuote()} className="mt-9 inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-medium transition-transform hover:scale-[1.03]" style={{ background: GOLD, color: DARK }}>
          Get Solutions &amp; Quote <ArrowRight size={15} />
        </button>
      </Reveal>
    </section>
  );
}

/* Footer columns come from the same CMS file (content/settings/navigation.json),
   so header and footer stay in sync from one place in /admin. */
const FOOTER: { h: string; links: { l: string; href?: string }[] }[] = SITE_NAV_DATA.footer;

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="pt-16 pb-10" style={{ background: "#1a1718" }}>
      <div className="max-w-[1400px] mx-auto px-[5vw] md:px-[6vw]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <img src={LOGO} alt="WONLY" className="h-6 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
            <p className="mt-4 text-xs font-normal leading-relaxed" style={{ color: "rgba(245,241,234,0.5)" }}>Global Smart-Security Ecosystem Leader. SSE: 605268.</p>
            <div className="mt-5 flex items-center gap-2.5">
              <a href="https://www.tiktok.com/@wonlyglobal" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 grid place-items-center rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.78.12V9.66a5.7 5.7 0 0 0-.78-.05 5.7 5.7 0 1 0 5.7 5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.26-1.48z"/></svg>
              </a>
              <a href="https://www.youtube.com/@wonlyglobal" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-9 h-9 grid place-items-center rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>
              </a>
              <a href="https://www.instagram.com/wonlyglobal/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 grid place-items-center rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.31-1.46.72-2.13 1.38C1.35 2.65.94 3.32.63 4.11c-.3.76-.5 1.63-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.35 1.35 20.68.94 19.89.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z"/></svg>
              </a>
            </div>
          </div>
          {FOOTER.map((col) => (
            <div key={col.h}>
              <h4 className="text-[11px] tracking-[0.2em] uppercase mb-4" style={{ color: CHAMP }}>{t(col.h)}</h4>
              <ul className="space-y-2.5">
                {col.links.map((item) => {
                  const cls = "text-xs font-light transition-colors hover:text-white";
                  const style = { color: "rgba(245,241,234,0.6)" };
                  return (
                    <li key={item.l}>
                      {item.href
                        ? (/^(mailto:|tel:|https?:)/.test(item.href)
                            ? <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined} className={cls} style={style}>{t(item.l)}</a>
                            : <Link to={item.href} className={cls} style={style}>{t(item.l)}</Link>)
                        : <span className="text-xs font-light" style={style}>{t(item.l)}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t text-center text-[11px] font-light" style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(245,241,234,0.4)" }}>
          <div className="flex items-center justify-center gap-4 mb-3">
            <Link to="/privacy" className="transition-colors hover:text-white" style={{ color: "rgba(245,241,234,0.55)" }}>{t("Privacy Policy")}</Link>
            <span style={{ color: "rgba(245,241,234,0.25)" }}>·</span>
            <Link to="/terms" className="transition-colors hover:text-white" style={{ color: "rgba(245,241,234,0.55)" }}>{t("Terms of Service")}</Link>
          </div>
          © WONLY · SSE 605268 · Global Smart-Security Ecosystem Leader
        </div>
      </div>
    </footer>
  );
}

/** Always-available language control for legacy pages with bespoke headers. */
export function FloatingLanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { locale, language, pathname, t } = useLocale();
  return (
    <div className="fixed bottom-5 left-5 z-[85]" onMouseLeave={() => setOpen(false)}>
      {open && (
        <div className="absolute bottom-12 left-0 min-w-[180px] rounded-xl bg-[#F5F1EA]/98 shadow-2xl border border-black/10 p-2 mb-2">
          {LANGUAGES.map((item) => (
            <a key={item.code} href={pathForLocale(pathname, item.code)} hrefLang={item.code} lang={item.code} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-black/[0.05]" style={{ color: DARK, fontWeight: item.code === locale ? 600 : 400 }}>
              <span>{item.nativeLabel}</span><span className="text-[10px] uppercase opacity-50">{item.code}</span>
            </a>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={t("Select language")} className="h-11 px-4 rounded-full inline-flex items-center gap-2 shadow-xl border border-white/20" style={{ background: "rgba(26,23,24,.94)", color: "#fff" }}>
        <Globe size={16} /><span className="text-xs">{language.nativeLabel}</span><ChevronDown size={12} />
      </button>
    </div>
  );
}
