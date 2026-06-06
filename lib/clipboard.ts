"use client";

export type FeedbackKind = "success" | "warning" | "error" | "info";

export type ActionFeedback = {
  kind: FeedbackKind;
  message: string;
};

export function devButtonLog(name: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[button-audit] ${name}`, details);
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || !text.trim()) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("navigator.clipboard failed", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error("fallback copy failed", error);
    return false;
  }
}

export async function copyWithFeedback(
  text: string,
  label: string,
  onFeedback?: (feedback: ActionFeedback) => void
) {
  devButtonLog(label, { textLength: text?.length ?? 0 });
  if (!text || !text.trim()) {
    onFeedback?.({ kind: "warning", message: `${label}: ไม่มีข้อความให้ copy` });
    return false;
  }

  const ok = await copyToClipboard(text);
  onFeedback?.({
    kind: ok ? "success" : "error",
    message: ok ? `${label}: copied ${text.length} characters` : `${label}: copy ไม่สำเร็จ`
  });
  return ok;
}
