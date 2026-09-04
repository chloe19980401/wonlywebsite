export type InquiryJourneyEventName =
  | "cta_click" | "form_open" | "form_start" | "form_submit"
  | "form_error" | "form_abandon" | "contact_click";

export type InquiryJourneyEvent = {
  event_name: InquiryJourneyEventName;
  event_at: string;
  session_ref: string;
  page_path: string;
  page_title: string;
  cta_name?: string;
  section_name?: string;
  language?: string;
  product_context?: string;
  error_type?: string;
};

const SESSION_KEY = "wonly_inquiry_journey_session";

function sessionRef(): string {
  if (typeof window === "undefined") return "";
  let value = window.sessionStorage.getItem(SESSION_KEY) || "";
  if (!value) {
    value = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `journey-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

export function journeyEvent(
  event_name: InquiryJourneyEventName,
  context: Partial<Omit<InquiryJourneyEvent, "event_name" | "event_at" | "session_ref">> = {},
): InquiryJourneyEvent {
  return {
    event_name,
    event_at: new Date().toISOString(),
    session_ref: sessionRef(),
    page_path: typeof window === "undefined" ? "" : window.location.pathname,
    page_title: typeof document === "undefined" ? "" : document.title,
    language: typeof document === "undefined" ? "" : document.documentElement.lang,
    ...context,
  };
}

export function serializeJourney(events: InquiryJourneyEvent[]): string {
  return JSON.stringify(events.slice(0, 99));
}
