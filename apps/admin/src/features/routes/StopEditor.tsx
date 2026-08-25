import { FormEvent, useState } from "react";
import type { CanonicalStop, CanonicalStopDraft } from "../../api";
import { translations } from "../../i18n/translations";
import { Button } from "../../ui";

type Locale = "ar" | "en";

export type StopEditorProps = {
  stop: CanonicalStop;
  used: boolean;
  busy: boolean;
  locale: Locale;
  onSave: (id: string, draft: CanonicalStopDraft) => void | boolean | Promise<void | boolean>;
};

function draftFromStop(stop: CanonicalStop): CanonicalStopDraft {
  return {
    stop_key: stop.stop_key,
    service_region_key: stop.service_region_key,
    name_ar: stop.name_ar,
    name_en: stop.name_en,
    latitude: stop.latitude,
    longitude: stop.longitude
  };
}

export function StopEditor({ stop, used, busy, locale, onSave }: StopEditorProps) {
  const text = translations[locale];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => draftFromStop(stop));
  const editable = stop.status === "active" && !used;

  if (!editable) {
    return <div className="stop-editor-form__summary">
      <strong>{locale === "ar" ? stop.name_ar : stop.name_en}</strong>
      <span className="technical-value" dir="ltr">{stop.stop_key}</span>
    </div>;
  }

  function cancel() {
    setDraft(draftFromStop(stop));
    setEditing(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const saved = await onSave(stop.id, draft);
    if (saved !== false) setEditing(false);
  }

  return <form className="field-grid stop-editor-form" onSubmit={(event) => void submit(event)}>
    <p className="muted stop-editor-form__help">{text.routeManualCoordinates}</p>
    <label className="field">{text.routeStopKey}<input className="technical-value" name="stop_key" readOnly dir="ltr" value={draft.stop_key} /></label>
    <label className="field">{text.routeRegion}<input className="technical-value" name="service_region_key" readOnly={!editing} dir="ltr" required value={draft.service_region_key} onChange={(event) => setDraft({ ...draft, service_region_key: event.target.value })} /></label>
    <label className="field">{text.routeNameAr}<input name="name_ar" readOnly={!editing} dir="rtl" required value={draft.name_ar} onChange={(event) => setDraft({ ...draft, name_ar: event.target.value })} /></label>
    <label className="field">{text.routeNameEn}<input name="name_en" readOnly={!editing} dir="ltr" required value={draft.name_en} onChange={(event) => setDraft({ ...draft, name_en: event.target.value })} /></label>
    <label className="field">{text.latitude}<input className="technical-value" name="latitude" type="number" min="-90" max="90" step="0.000001" readOnly={!editing} dir="ltr" required value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })} /></label>
    <label className="field">{text.longitude}<input className="technical-value" name="longitude" type="number" min="-180" max="180" step="0.000001" readOnly={!editing} dir="ltr" required value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: Number(event.target.value) })} /></label>
    <div className="button-row">
      {!editing && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(true)}>{text.routeEditStop}</Button>}
      {editing && <>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={cancel}>{text.routeCancelStopEdit}</Button>
        <Button type="submit" size="sm" disabled={busy}>{text.routeSaveStopEdit}</Button>
      </>}
    </div>
  </form>;
}
