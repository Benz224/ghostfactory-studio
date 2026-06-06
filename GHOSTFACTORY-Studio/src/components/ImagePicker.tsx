"use client";

import { ImagePlus, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export function ImagePreview({ src, label, className = "" }: { src?: string; label: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`thumb relative ${className}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={label} className="h-full w-full object-cover" onError={() => setFailed(true)} src={src} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-[#2563EB]">
          <ImagePlus size={34} />
          <span className="text-xs font-semibold text-[#64748B]">{label}</span>
        </div>
      )}
    </div>
  );
}

export function ImagePicker({
  value,
  label,
  note = "JPG, PNG, WebP up to 5MB. Recommended 1:1.",
  onChange,
  onError
}: {
  value?: string;
  label: string;
  note?: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
}) {
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      onError?.("Please upload JPG, PNG, or WebP.");
      return;
    }
    if (file.size > maxBytes) {
      onError?.("Image must be 5MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result) onChange(reader.result);
      else onError?.("Could not read image file.");
    };
    reader.onerror = () => onError?.("Could not read image file.");
    try {
      reader.readAsDataURL(file);
    } catch {
      onError?.("Could not read image file.");
    }
  }

  return (
    <div className="space-y-3">
      <ImagePreview label={label} src={value} />
      <div className="flex flex-wrap gap-2">
        <label className="btn cursor-pointer">
          <ImagePlus size={16} />
          {value ? "Change Image" : "Upload Image"}
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} type="file" />
        </label>
        {value ? (
          <button className="btn" onClick={() => onChange("")} type="button">
            <X size={16} />
            Remove
          </button>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-[#64748B]">{note}</p>
    </div>
  );
}
