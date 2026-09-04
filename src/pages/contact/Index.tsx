import { useRef, useState } from "react";
import { Mail, MessageCircle, MapPin, ArrowUpRight, Check } from "lucide-react";
import { SiteHeader, SiteFooter, GOLD, DARK, CHAMP, MUTED } from "@/lib/site-ui";
import { trackLead } from "@/lib/analytics";
import { useSeo } from "@/lib/seo";
import { submitEnquiry } from "@/lib/form-config";
import { useLocale } from "@/lib/i18n";
import { journeyEvent, serializeJourney, type InquiryJourneyEvent } from "@/lib/inquiry-journey";

/* ── CMS 联系页文案: content/settings/contact.json（在 /admin 站点后台编辑）──
   每个字段都有代码默认值兜底，JSON 缺失或留空不会让页面变空白。 */
const C_RAW = import.meta.glob("/content/settings/contact.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const C_CMS = (() => { try { return JSON.parse(Object.values(C_RAW)[0] || "{}"); } catch { return {}; } })() as Record<string, any>;
const C = {
  eyebrow: C_CMS.hero?.eyebrow?.trim() || "Contact",
  title: C_CMS.hero?.title?.trim() || "Let's Open Your Market",
  titleHighlight: C_CMS.hero?.titleHighlight?.trim() || "Together",
  subtitle: C_CMS.hero?.subtitle?.trim() || "Distributor, project or OEM/ODM enquiry — our overseas team replies within 24 hours with specifications, compliance documents and pricing.",
  email: (C_CMS.email || "").trim() || "inquiry@wonlyglobal.com",
  emailNote: (C_CMS.emailNote || "").trim() || "Overseas sales & partnership enquiries",
  whatsapp: (C_CMS.whatsapp || "").trim() || "+1 (205) 240-1832",
  whatsappLink: (C_CMS.whatsappLink || "").trim() || "https://wa.me/12052401832",
  whatsappNote: (C_CMS.whatsappNote || "").trim() || "Fastest response — message us anytime",
  hqTitle: (C_CMS.hqTitle || "").trim() || "Zhejiang, China",
  hqNote: (C_CMS.hqNote || "").trim() || "WONLY · SSE: 605268",
  prevSiteLabel: (C_CMS.prevSiteLabel || "").trim() || "en.wanglianfang.com",
  prevSiteUrl: (C_CMS.prevSiteUrl || "").trim() || "http://en.wanglianfang.com/",
  prevSiteNote: (C_CMS.prevSiteNote || "").trim() || "Full product library while the new site is being built",
  regionsBold: (C_CMS.regionsBold || "").trim() || "Priority regions:",
  regionsLine1: (C_CMS.regionsLine1 || "").trim() || "Middle East · Southeast Asia · Central Asia",
  regionsLine2: (C_CMS.regionsLine2 || "").trim() || "Radiating to Africa, Latin America and Oceania.",
};
const label = "text-[11px] tracking-[0.12em] uppercase";
const input = "mt-1.5 w-full rounded-lg px-4 py-2.5 text-sm text-[#221F20] bg-[#faf8f4] placeholder-black/25 focus:outline-none";

export default function Contact() {
  const { t } = useLocale();
  useSeo({
    title: "Contact | WONLY",
    description: "Contact WONLY for distributor, project or OEM/ODM enquiries. Email inquiry@wonlyglobal.com or message us on WhatsApp — replies within 24 hours.",
    path: "/contact",
  });

  const [form, setForm] = useState({ name: "", company: "", role: "", country: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const journey = useRef<InquiryJourneyEvent[]>([journeyEvent("form_open", { section_name: "contact_form" })]);
  const started = useRef(false);

  const set = (k: keyof typeof form, v: string) => {
    if (!started.current) {
      started.current = true;
      journey.current.push(journeyEvent("form_start", { section_name: "contact_form" }));
    }
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  };
  const border = (k: string) => ({ border: `1px solid ${errors[k] ? "#c0564a" : "rgba(34,31,32,0.16)"}` });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!form.company.trim()) e.company = "Please enter your company.";
    if (!form.country.trim()) e.country = "Please enter your country or region.";
    if (!form.email.trim()) e.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (!form.message.trim()) e.message = "Please tell us about your enquiry.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    journey.current.push(journeyEvent("form_submit", { section_name: "contact_form" }));
    try {
      const data = await submitEnquiry({
        subject: "New WONLY Contact Enquiry",
        recipient: "inquiry@wonlyglobal.com",
        name: form.name,
        company: form.company,
        job_title: form.role,
        country: form.country,
        email: form.email,
        phone: form.phone,
        message: form.message,
        source: "contact_page",
        journey_session: journey.current[0]?.session_ref || "",
        journey_events: serializeJourney(journey.current),
      });
      if (data.success) { setSent(true); trackLead({ form_location: "contact_page" }); }
      else setErrors({ submit: data.message || "Submission failed. Please email inquiry@wonlyglobal.com." });
    } catch {
      setErrors({ submit: "Network error. Please email inquiry@wonlyglobal.com directly." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-w-[320px] bg-[#F5F1EA] text-[#221F20]">
      <SiteHeader />

      {/* Hero */}
      <section className="text-white px-[6vw] pt-[150px] pb-[90px]" style={{ background: "radial-gradient(120% 90% at 78% 20%, #2a2627 0%, #0d0d0d 72%)" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="text-[12px] tracking-[0.3em] uppercase font-bold" style={{ color: CHAMP }}>{t(C.eyebrow)}</div>
          <h1 className="mt-4 font-light leading-[1.05] tracking-[-1px] text-[clamp(34px,5vw,64px)]">{C.title} <span style={{ color: CHAMP }}>{C.titleHighlight}</span></h1>
          <p className="mt-5 max-w-[520px] text-[15px] leading-[1.7]" style={{ color: "rgba(245,241,234,0.72)" }}>
            {C.subtitle}
          </p>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-[6vw] py-[70px] grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-[56px]">
        {/* Channels */}
        <div>
          <h2 className="text-[13px] tracking-[0.28em] uppercase font-bold mb-6" style={{ color: GOLD }}>{t("Get in Touch")}</h2>

          <a href={`mailto:${C.email}`} className="flex gap-4 py-5 border-b border-[#e4ddcf] group">
            <span className="w-[42px] h-[42px] shrink-0 rounded-xl grid place-items-center bg-white border border-[#e4ddcf]"><Mail size={19} style={{ color: GOLD }} /></span>
            <span>
              <span className="block text-[12px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>{t("Email")}</span>
              <span className="block text-[16px] font-semibold mt-0.5 group-hover:text-[#B08D4F] transition-colors">{C.email}</span>
              <span className="block text-[13px] mt-0.5" style={{ color: MUTED }}>{C.emailNote}</span>
            </span>
          </a>

          <a href={C.whatsappLink} target="_blank" rel="noopener noreferrer" className="flex gap-4 py-5 border-b border-[#e4ddcf] group">
            <span className="w-[42px] h-[42px] shrink-0 rounded-xl grid place-items-center bg-white border border-[#e4ddcf]"><MessageCircle size={19} style={{ color: GOLD }} /></span>
            <span>
              <span className="block text-[12px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>WhatsApp</span>
              <span className="block text-[16px] font-semibold mt-0.5 group-hover:text-[#B08D4F] transition-colors">{C.whatsapp}</span>
              <span className="block text-[13px] mt-0.5" style={{ color: MUTED }}>{C.whatsappNote}</span>
            </span>
          </a>

          <div className="flex gap-4 py-5 border-b border-[#e4ddcf]">
            <span className="w-[42px] h-[42px] shrink-0 rounded-xl grid place-items-center bg-white border border-[#e4ddcf]"><MapPin size={19} style={{ color: GOLD }} /></span>
            <span>
              <span className="block text-[12px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>{t("Headquarters")}</span>
              <span className="block text-[16px] font-semibold mt-0.5">{C.hqTitle}</span>
              <span className="block text-[13px] mt-0.5" style={{ color: MUTED }}>{C.hqNote}</span>
            </span>
          </div>

          <a href={C.prevSiteUrl} target="_blank" rel="noopener noreferrer" className="flex gap-4 py-5 border-b border-[#e4ddcf] group">
            <span className="w-[42px] h-[42px] shrink-0 rounded-xl grid place-items-center bg-white border border-[#e4ddcf]"><ArrowUpRight size={19} style={{ color: GOLD }} /></span>
            <span>
              <span className="block text-[12px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>{t("Previous Site")}</span>
              <span className="block text-[16px] font-semibold mt-0.5 group-hover:text-[#B08D4F] transition-colors">{C.prevSiteLabel}</span>
              <span className="block text-[13px] mt-0.5" style={{ color: MUTED }}>{C.prevSiteNote}</span>
            </span>
          </a>

          <div className="mt-8 text-[13px] leading-[1.9]" style={{ color: MUTED }}>
            <b className="text-[#221F20]">{C.regionsBold}</b> {C.regionsLine1}<br />
            {C.regionsLine2}
          </div>
        </div>

        {/* Form */}
        <div>
          <div className="bg-white border border-[#e4ddcf] rounded-2xl p-[34px] shadow-[0_30px_60px_-40px_rgba(34,31,32,0.3)]">
            {sent ? (
              <div className="py-14 text-center">
                <div className="mx-auto w-12 h-12 rounded-full grid place-items-center" style={{ background: `${GOLD}22` }}><Check size={22} style={{ color: GOLD }} /></div>
                <h3 className="mt-5 text-xl font-light" style={{ color: DARK }}>Thank you — we'll be in touch within 24 hours.</h3>
                <p className="mt-3 text-sm font-light" style={{ color: MUTED }}>Your enquiry has been sent to our overseas team.</p>
              </div>
            ) : (
              <form noValidate onSubmit={submit}>
                <h3 className="text-[22px] font-normal">{t("Send an Enquiry")}</h3>
                <p className="text-[13px] mt-1.5 mb-5" style={{ color: MUTED }}>Tell us about your project or territory. Fields marked <span style={{ color: "#c0564a" }}>*</span> are required.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block"><span className={label} style={{ color: MUTED }}>{t("Full Name")} <span style={{ color: "#c0564a" }}>*</span></span>
                    <input className={input} style={border("name")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />{errors.name && <span className="mt-1 block text-[11px]" style={{ color: "#c0564a" }}>{errors.name}</span>}</label>
                  <label className="block"><span className={label} style={{ color: MUTED }}>{t("Company")} <span style={{ color: "#c0564a" }}>*</span></span>
                    <input className={input} style={border("company")} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" />{errors.company && <span className="mt-1 block text-[11px]" style={{ color: "#c0564a" }}>{errors.company}</span>}</label>
                  <label className="block"><span className={label} style={{ color: MUTED }}>{t("Job Title")}</span>
                    <input className={input} style={border("role")} value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Purchasing Manager" /></label>
                  <label className="block"><span className={label} style={{ color: MUTED }}>{t("Country / Region")} <span style={{ color: "#c0564a" }}>*</span></span>
                    <input className={input} style={border("country")} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Country / region" />{errors.country && <span className="mt-1 block text-[11px]" style={{ color: "#c0564a" }}>{errors.country}</span>}</label>
                  <label className="block"><span className={label} style={{ color: MUTED }}>{t("Email")} <span style={{ color: "#c0564a" }}>*</span></span>
                    <input type="email" className={input} style={border("email")} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />{errors.email && <span className="mt-1 block text-[11px]" style={{ color: "#c0564a" }}>{errors.email}</span>}</label>
                  <label className="block"><span className={label} style={{ color: MUTED }}>{t("Phone / WhatsApp")}</span>
                    <input className={input} style={border("phone")} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+.." /></label>
                </div>
                <label className="block mt-4"><span className={label} style={{ color: MUTED }}>{t("Message")} <span style={{ color: "#c0564a" }}>*</span></span>
                  <textarea className={input + " min-h-[110px] resize-y"} style={border("message")} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Products, quantities, target market, timeline…" />{errors.message && <span className="mt-1 block text-[11px]" style={{ color: "#c0564a" }}>{errors.message}</span>}</label>
                {errors.submit && <div className="mt-4 text-[13px] text-center" style={{ color: "#c0564a" }}>{errors.submit}</div>}
                <button type="submit" disabled={sending} className="mt-5 w-full py-[15px] rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: DARK }}>{sending ? t("Sending…") : `${t("Submit Enquiry")} →`}</button>
                <div className="mt-3 text-[12px] text-center" style={{ color: MUTED }}>Or email us directly at inquiry@wonlyglobal.com — we reply within 24 hours.</div>
              </form>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
