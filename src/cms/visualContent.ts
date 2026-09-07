export type VisualItem = { type: "text" | "image"; value: string; alt?: string; target?: "src" | "background" | "poster" };
export type CmsSeo = { title?: string; description?: string; canonical?: string; ogImage?: string; robots?: string };
export type CmsLayout = { order?: string[]; hidden?: string[] };
export type TranslationStatus = "pending" | "ai_draft" | "confirmed";
export type VisualContent = { visual?: Record<string, VisualItem>; seo?: CmsSeo; layout?: CmsLayout; translationStatus?: TranslationStatus };

export function visualElementKey(element: Element) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName !== "BODY") {
    const parent: Element | null = current.parentElement;
    const siblings = parent ? Array.from(parent.children).filter(child => child.tagName === current!.tagName) : [];
    const explicit = current.getAttribute("data-cms-key") || current.id;
    parts.unshift(explicit ? `${current.tagName.toLowerCase()}#${explicit}` : `${current.tagName.toLowerCase()}:${siblings.indexOf(current) + 1}`);
    current = parent;
  }
  return parts.join(">");
}

export function editableTextElements(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,p,li,button,label,figcaption,a,span")).filter(element =>
    Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
  );
}

export function editableImageElements(root: Document) {
  const direct = Array.from(root.querySelectorAll<HTMLElement>("img,video[poster],[data-cms-image]"));
  const backgrounds = Array.from(root.querySelectorAll<HTMLElement>("body *")).filter(element => {
    const background = root.defaultView?.getComputedStyle(element).backgroundImage ?? "none";
    return background !== "none" && background.includes("url(");
  });
  return Array.from(new Set([...direct, ...backgrounds]));
}

export function editableSections(root: Document) {
  const container = root.querySelector("main") ?? root.body;
  const semantic = Array.from(container.querySelectorAll<HTMLElement>("section,article")).filter(element =>
    !element.parentElement?.closest("section,article"),
  );
  if (semantic.length > 1) return semantic;
  return Array.from(container.children).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

export function applyLayoutContent(root: Document, layout?: CmsLayout) {
  const sections = editableSections(root);
  sections.forEach(section => { section.dataset.cmsSectionKey ||= visualElementKey(section); });
  const byKey = new Map(sections.map(section => [section.dataset.cmsSectionKey!, section]));
  const hidden = new Set(layout?.hidden ?? []);
  sections.forEach(section => { section.hidden = hidden.has(section.dataset.cmsSectionKey!); });
  const desired = (layout?.order ?? []).map(key => byKey.get(key)).filter((section): section is HTMLElement => Boolean(section));
  const current = sections.filter(section => desired.includes(section));
  if (desired.length && desired.some((section, index) => current[index] !== section)) desired.forEach(section => section.parentElement?.appendChild(section));
}

export function applySeoContent(seo?: CmsSeo) {
  if (!seo) return;
  if (seo.title) document.title = seo.title;
  const setMeta = (selector: string, attribute: "name" | "property", key: string, value?: string) => {
    if (!value) return;
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.appendChild(element); }
    element.content = value;
  };
  setMeta('meta[name="description"]', "name", "description", seo.description);
  setMeta('meta[name="robots"]', "name", "robots", seo.robots);
  setMeta('meta[property="og:title"]', "property", "og:title", seo.title);
  setMeta('meta[property="og:description"]', "property", "og:description", seo.description);
  setMeta('meta[property="og:image"]', "property", "og:image", seo.ogImage);
  if (seo.canonical) {
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = seo.canonical;
  }
}

export function applyVisualContent(root: Document, values: Record<string, VisualItem>) {
  editableTextElements(root).forEach(element => {
    const item = values[visualElementKey(element)];
    if (item?.type === "text" && element.textContent !== item.value) element.textContent = item.value;
  });
  editableImageElements(root).forEach(element => {
    const item = values[visualElementKey(element)];
    if (item?.type !== "image") return;
    if (element.tagName === "IMG") {
      const image = element as HTMLImageElement;
      image.closest("picture")?.querySelectorAll("source").forEach(source => { source.srcset = ""; });
      image.srcset = "";
      image.removeAttribute("data-src");
      image.removeAttribute("data-srcset");
      if (image.src !== item.value) image.src = item.value;
      if (item.alt !== undefined) image.alt = item.alt;
    } else if (element.tagName === "VIDEO") (element as HTMLVideoElement).poster = item.value;
    else element.style.backgroundImage = `url("${item.value.replace(/"/g, "%22")}")`;
  });
}
