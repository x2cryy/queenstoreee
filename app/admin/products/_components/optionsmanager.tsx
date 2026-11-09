"use client";

import { useActionState, useEffect, useState } from "react";
import { addOption, addValues, deleteOption, deleteValue, generateVariants, type OS } from "../options-actions";
import { Badge } from "../../_components/ui";

export type OptionView = {
  id: string; name: string; kind: string;
  values: { id: string; value: string; used: boolean }[];
};

const KINDS: [string, string][] = [["color", "لون"], ["size", "مقاس"], ["dimension", "أبعاد"], ["custom", "مخصص"]];
const kindLabel = (k: string) => KINDS.find((x) => x[0] === k)?.[1] ?? k;
const PRESETS = [{ label: "اللون", kind: "color" }, { label: "المقاس", kind: "size" }];

function Msg({ st, opt }: { st: OS; opt?: string }) {
  if (opt !== undefined && st.opt !== opt) return null;
  if (st.error) return <p role="alert" style={{ color: "var(--c-bad, #B91C1C)", fontWeight: 600, fontSize: 13, margin: "8px 0 0", overflowWrap: "anywhere" }}>{st.error}</p>;
  if (st.ok) return <p role="status" style={{ color: "var(--c-good, #15803D)", fontWeight: 600, fontSize: 13, margin: "8px 0 0", overflowWrap: "anywhere" }}>{st.ok}</p>;
  return null;
}

export function OptionsManager({
  productId, options, activeLinked,
}: {
  productId: string; options: OptionView[]; activeLinked: boolean;
}) {
  const [addSt, addAct, addPend] = useActionState<OS, FormData>(addOption, {});
  const [valSt, valAct, valPend] = useActionState<OS, FormData>(addValues, {});
  const [dvSt, dvAct, dvPend] = useActionState<OS, FormData>(deleteValue, {});
  const [doSt, doAct, doPend] = useActionState<OS, FormData>(deleteOption, {});
  const [genSt, genAct, genPend] = useActionState<OS, FormData>(generateVariants, {});
  const [open, setOpen] = useState(options.length === 0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("custom");
  const [values, setValues] = useState("");

  useEffect(() => {
    if (addSt.ok) { setName(""); setValues(""); setKind("custom"); setOpen(false); }
  }, [addSt.n, addSt.ok]);

  const groups = options.filter((o) => o.values.length > 0);
  const total = groups.length ? groups.reduce((m, o) => m * o.values.length, 1) : 0;
  const busy = valPend || dvPend || doPend;
  const card = { border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 12, padding: 12, background: "var(--c-surface, #fff)", minWidth: 0 } as const;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {options.length === 0 ? (
        <p className="ds-desc">المنتج بسيط ولا يحتاج خيارات. أضف خيارًا فقط إذا كان له ألوان أو مقاسات بكميات مختلفة.</p>
      ) : null}

      {options.map((o) => {
        const anyUsed = o.values.some((v) => v.used);
        return (
          <details key={o.id} open style={card}>
            <summary style={{ cursor: "pointer", fontWeight: 700, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ overflowWrap: "anywhere" }}>{o.name}</span>
              <Badge>{kindLabel(o.kind)}</Badge>
              <span className="ds-kpi-hint">{o.values.length} قيمة</span>
            </summary>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {o.values.map((v) => (
                <form key={v.id} action={dvAct} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--c-line, #ECE6DA)", borderRadius: 999, padding: "4px 6px 4px 12px", maxWidth: "100%" }}>
                  <input type="hidden" name="product_id" value={productId} />
                  <input type="hidden" name="option_id" value={o.id} />
                  <input type="hidden" name="value_id" value={v.id} />
                  <span style={{ overflowWrap: "anywhere" }}>{v.value}</span>
                  {v.used ? <span className="ds-kpi-hint">مرتبطة</span> : null}
                  <button type="submit" className="ds-btn" style={{ height: 28, padding: "0 10px" }} disabled={v.used || dvPend} aria-label={"حذف " + v.value}>حذف</button>
                </form>
              ))}
            </div>
            <form action={valAct} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="option_id" value={o.id} />
              <input className="ds-input" style={{ flex: "1 1 180px", minWidth: 0 }} name="values" placeholder="قيم جديدة، افصل بينها بفاصلة" aria-label={"قيم جديدة لخيار " + o.name} />
              <button type="submit" className="ds-btn" disabled={busy}>إضافة قيم</button>
            </form>
            <Msg st={valSt} opt={o.id} />
            <Msg st={dvSt} opt={o.id} />
            <form
              action={doAct}
              style={{ marginTop: 12 }}
              onSubmit={(e) => { if (!window.confirm("حذف الخيار «" + o.name + "» وقيمه؟")) e.preventDefault(); }}
            >
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="option_id" value={o.id} />
              <button type="submit" className="ds-btn" style={{ color: "var(--c-bad, #B91C1C)" }} disabled={anyUsed || busy}>حذف الخيار</button>
              {anyUsed ? <span className="ds-kpi-hint" style={{ marginInlineStart: 8 }}>مرتبط بتركيبات، لا يُحذف.</span> : null}
            </form>
            <Msg st={doSt} opt={o.id} />
          </details>
        );
      })}

      {options.length < 3 ? (
        open ? (
          <form action={addAct} style={card}>
            <input type="hidden" name="product_id" value={productId} />
            <div style={{ fontWeight: 700, marginBottom: 10 }}>خيار جديد</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {PRESETS.map((p) => (
                <button key={p.kind} type="button" className="ds-btn" style={{ height: 32 }} onClick={() => { setName(p.label); setKind(p.kind); }}>{p.label}</button>
              ))}
            </div>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))" }}>
              <div>
                <label className="ds-label" htmlFor="opt-name">اسم الخيار</label>
                <input className="ds-input" id="opt-name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="ds-label" htmlFor="opt-kind">النوع</label>
                <select className="ds-select" id="opt-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                  {KINDS.map((k) => (<option key={k[0]} value={k[0]}>{k[1]}</option>))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="ds-label" htmlFor="opt-values">القيم</label>
              <input className="ds-input" id="opt-values" name="values" value={values} onChange={(e) => setValues(e.target.value)} placeholder="مثال: أسود، أبيض، بني" />
              <div className="ds-desc">افصل بين القيم بفاصلة.</div>
            </div>
            <Msg st={addSt} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="submit" className="ds-btn ds-btn-gold" disabled={addPend}>{addPend ? "جارٍ الحفظ..." : "حفظ الخيار"}</button>
              <button type="button" className="ds-btn" onClick={() => setOpen(false)}>إلغاء</button>
            </div>
          </form>
        ) : (
          <div>
            <button type="button" className="ds-btn ds-btn-gold" disabled={activeLinked} onClick={() => setOpen(true)}>إضافة خيارات</button>
            {activeLinked ? <p className="ds-desc" style={{ marginTop: 8 }}>لا يمكن إضافة خيار جديد وهناك تركيبات فعالة. أوقفها أولًا من القائمة أدناه.</p> : null}
            {addSt.ok ? <Msg st={addSt} /> : null}
          </div>
        )
      ) : null}

      {groups.length > 0 ? (
        <form action={genAct} style={card}>
          <input type="hidden" name="product_id" value={productId} />
          <div style={{ fontWeight: 700 }}>توليد التركيبات</div>
          <p className="ds-desc" style={{ margin: "6px 0 10px" }}>
            عدد التركيبات الممكنة: {total}. تُضاف الناقصة فقط، وما أُنشئ سابقًا لا يتغير.
          </p>
          {total > 100 ? <p role="alert" style={{ color: "var(--c-bad, #B91C1C)", fontWeight: 600, fontSize: 13 }}>العدد يتجاوز 100. قلّل القيم.</p> : null}
          {total > 40 && total <= 100 ? (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <input type="checkbox" name="confirm" /> أؤكد إنشاء حتى {total} تركيبة
            </label>
          ) : null}
          <button type="submit" className="ds-btn ds-btn-gold" disabled={genPend || total === 0 || total > 100}>
            {genPend ? "جارٍ الإنشاء..." : "إنشاء التركيبات"}
          </button>
          <Msg st={genSt} />
        </form>
      ) : null}
    </div>
  );
}
