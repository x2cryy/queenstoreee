"use client";

import { useState } from "react";

export type ReceiptData = {
  number: string;
  date: string;
  status: string;
  customer: string;
  phone: string;
  place: string;
  address: string;
  items: { name: string; qty: number; price: string; total: string }[];
  subtotal: string;
  discount: string;
  delivery: string;
  total: string;
  paid: string;
  remaining: string;
  payLabel: string;
  payStatus: string;
  paidN: number;
  remN: number;
  closed: boolean;
};

const GOLD = "#B89B6A";
const INK = "#17140F";
const CREAM = "#FBF7EF";
const MUTED = "#6B6458";
const LINE = "#E6DCC8";
const FONT = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif';

const W = 1080;
const M = 60;
const CARD_Y = 320;
const CARD_H = 222;
const TH_Y = CARD_Y + CARD_H + 34;
const TH_H = 56;
const ROW_H = 64;
const TOT_H = 52;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function seal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, dateText: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.2);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r - 66, 0, Math.PI * 2);
  ctx.stroke();

  const label = "QUEEN STORE  \u2022  ORDER RECEIPT  \u2022  ";
  ctx.font = "700 21px " + FONT;
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < label.length; i++) {
    ctx.save();
    ctx.rotate((i / label.length) * Math.PI * 2);
    ctx.translate(0, -(r - 38));
    ctx.fillText(label[i], 0, 0);
    ctx.restore();
  }
  ctx.font = "700 62px Georgia, serif";
  ctx.fillText("Q", 0, -8);
  ctx.font = "600 19px " + FONT;
  ctx.fillText(dateText, 0, 38);
  ctx.restore();
}

async function render(d: ReceiptData): Promise<Blob | null> {
  try {
    await document.fonts.load("700 30px " + FONT);
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts */
  }

  const totals: { label: string; value: string; kind?: "strong" | "due" }[] = [{ label: "المجموع الفرعي", value: d.subtotal }];
  if (d.discount) totals.push({ label: "الخصم", value: "-" + d.discount });
  if (d.delivery) totals.push({ label: "التوصيل", value: d.delivery });
  totals.push({ label: "الإجمالي", value: d.total, kind: "strong" });
  totals.push({ label: "المدفوع", value: d.paid });
  if (d.remaining) totals.push({ label: "المتبقي", value: d.remaining, kind: "due" });

  const rowsY = TH_Y + TH_H;
  const itemsEnd = rowsY + d.items.length * ROW_H + 30;
  const H = itemsEnd + totals.length * TOT_H + 14 + 60 + 290 + 40;

  const logoImg = await new Promise<HTMLImageElement>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(im); im.src = "/brand/q-mark.svg"; });
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const xR = W - M;
  ctx.direction = "rtl";
  ctx.textBaseline = "middle";

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  rr(ctx, 14, 14, W - 28, H - 28, 18);
  ctx.stroke();
  ctx.lineWidth = 1;
  rr(ctx, 24, 24, W - 48, H - 48, 12);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.fillRect(24, 24, W - 48, 166);
  ctx.fillStyle = GOLD;
  ctx.fillRect(24, 190, W - 48, 4);
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.font = "700 60px " + FONT;
  ctx.fillText("QUEEN STORE", W / 2, 96);
  if (logoImg.naturalWidth) ctx.drawImage(logoImg, W / 2 - 22, 34, 44, 44);
  ctx.direction = "rtl";
  ctx.font = "600 28px " + FONT;
  ctx.fillStyle = "#E9DFC9";
  ctx.fillText("وصل طلب", W / 2, 150);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = "500 22px " + FONT;
  ctx.fillText("رقم الطلب", xR, 238);
  ctx.fillStyle = INK;
  ctx.direction = "ltr";
  ctx.font = "700 42px " + FONT;
  ctx.fillText(d.number, xR, 282);
  ctx.direction = "rtl";

  let pill = { text: "بانتظار الدفع", fill: "", stroke: INK, color: INK };
  if (d.closed) pill = { text: d.status, fill: "#E7E1D4", stroke: "#E7E1D4", color: INK };
  else if (d.paidN > 0 && d.remN <= 0) pill = { text: "مسدّد بالكامل", fill: "#2F7D4F", stroke: "#2F7D4F", color: "#FFFFFF" };
  else if (d.paidN > 0) pill = { text: "دفع جزئي", fill: "#B7791F", stroke: "#B7791F", color: "#FFFFFF" };
  rr(ctx, M + 4, 236, 290, 56, 28);
  if (pill.fill) {
    ctx.fillStyle = pill.fill;
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = pill.stroke;
  ctx.stroke();
  ctx.fillStyle = pill.color;
  ctx.textAlign = "center";
  ctx.font = "700 26px " + FONT;
  ctx.fillText(pill.text, M + 4 + 145, 265);

  ctx.fillStyle = "#FFFFFF";
  rr(ctx, M, CARD_Y, W - 2 * M, CARD_H, 16);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  const info: [string, string, boolean][] = [
    ["العميل", d.customer, false],
    ["الهاتف", d.phone, true],
    ["العنوان", [d.place, d.address].filter(Boolean).join("، "), false],
    ["التاريخ", d.date, false],
  ];
  info.forEach(([label, value, ltr], i) => {
    const y = CARD_Y + 40 + i * 46;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    ctx.fillStyle = MUTED;
    ctx.font = "500 23px " + FONT;
    ctx.fillText(label, xR - 24, y);
    ctx.fillStyle = INK;
    ctx.font = "600 26px " + FONT;
    ctx.direction = ltr ? "ltr" : "rtl";
    ctx.fillText(fit(ctx, value || "-", 690), xR - 170, y);
  });

  ctx.direction = "rtl";
  ctx.fillStyle = INK;
  rr(ctx, M, TH_Y, W - 2 * M, TH_H, 12);
  ctx.fill();
  ctx.fillStyle = "#E9DFC9";
  ctx.font = "700 23px " + FONT;
  ctx.textAlign = "right";
  ctx.fillText("المادة", xR - 20, TH_Y + 28);
  ctx.textAlign = "center";
  ctx.fillText("الكمية", 500, TH_Y + 28);
  ctx.fillText("السعر", 350, TH_Y + 28);
  ctx.fillText("الإجمالي", 170, TH_Y + 28);

  d.items.forEach((it, i) => {
    const y = rowsY + i * ROW_H;
    if (i % 2 === 0) {
      ctx.fillStyle = "#F4EDDD";
      ctx.fillRect(M, y, W - 2 * M, ROW_H);
    }
    ctx.fillStyle = INK;
    ctx.font = "600 25px " + FONT;
    ctx.textAlign = "right";
    ctx.fillText(fit(ctx, it.name, 450), xR - 20, y + 32);
    ctx.textAlign = "center";
    ctx.fillText(String(it.qty), 500, y + 32);
    ctx.font = "500 24px " + FONT;
    ctx.fillText(it.price, 350, y + 32);
    ctx.font = "700 25px " + FONT;
    ctx.fillText(it.total, 170, y + 32);
  });
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, itemsEnd - 14);
  ctx.lineTo(W - M, itemsEnd - 14);
  ctx.stroke();

  let y = itemsEnd;
  totals.forEach((t) => {
    if (t.kind === "strong") {
      ctx.fillStyle = GOLD;
      rr(ctx, M, y, W - 2 * M, TOT_H + 14, 12);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = "700 32px " + FONT;
      ctx.textAlign = "right";
      ctx.fillText(t.label, xR - 20, y + 33);
      ctx.textAlign = "left";
      ctx.fillText(t.value, M + 20, y + 33);
      y += TOT_H + 14;
      return;
    }
    ctx.fillStyle = t.kind === "due" ? "#9A2F2F" : INK;
    ctx.font = (t.kind === "due" ? "700 28px " : "500 26px ") + FONT;
    ctx.textAlign = "right";
    ctx.fillText(t.label, xR - 20, y + 26);
    ctx.textAlign = "left";
    ctx.fillText(t.value, M + 20, y + 26);
    y += TOT_H;
  });

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = "500 23px " + FONT;
  ctx.fillText("طريقة الدفع: " + d.payLabel + " (" + d.payStatus + ")", xR - 20, y + 34);
  y += 60;

  const issued = new Date().toLocaleDateString("en-GB");
  seal(ctx, M + 150, y + 130, 118, issued);
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = "700 30px " + FONT;
  ctx.fillText("شكراً لاختياركم QUEEN STORE", xR - 20, y + 100);
  ctx.fillStyle = MUTED;
  ctx.font = "500 21px " + FONT;
  ctx.fillText("هذا الوصل يعكس حالة الطلب وقت إصداره", xR - 20, y + 148);
  ctx.fillText("صدر بتاريخ " + issued, xR - 20, y + 184);

  return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
}

export default function ReceiptShare({ data }: { data: ReceiptData }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fname = "receipt-" + data.number + ".png";

  async function make(): Promise<Blob | null> {
    const b = await render(data);
    if (!b) setMsg("تعذّر إنشاء صورة الوصل");
    return b;
  }

  function download(b: Blob) {
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const b = await make();
      if (!b) return;
      const file = new File([b], fname, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "وصل الطلب " + data.number });
        } catch (e) {
          if ((e as { name?: string }).name !== "AbortError") setMsg("تعذّرت المشاركة، استعمل زر التحميل");
        }
      } else {
        download(b);
        setMsg("جهازك لا يدعم مشاركة الملفات مباشرة، تم تحميل الصورة");
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const b = await make();
      if (b) download(b);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="qp-btn" onClick={share} disabled={busy}>
        {busy ? "جارٍ التجهيز" : "مشاركة الوصل كصورة"}
      </button>
      <button type="button" className="qp-btn" onClick={save} disabled={busy}>
        تحميل الصورة
      </button>
      {msg ? (
        <span role="status" style={{ fontSize: 13 }}>
          {msg}
        </span>
      ) : null}
    </>
  );
}
