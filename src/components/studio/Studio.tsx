"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  ANGLES,
  BADGES,
  DEFAULT_CONFIG,
  DRAFT_KEY,
  PALETTE,
  PARTS,
  PATTERNS,
  type AngleId,
  type BadgeId,
  type DesignConfig,
  type Lettering,
  type LogoSlotId,
  type PartId,
  type SavedDesign,
  type ZoneStyle,
  normalizeConfig,
} from "@/lib/design";
import { api } from "@/lib/api";
import { PrintSheet } from "./PrintSheet";

const TEST_DESIGNS_KEY = "jersey-test-designs";
let pendingDraftSave: Promise<SavedDesign> | null = null;

function readTestDesigns(): SavedDesign[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEST_DESIGNS_KEY) ?? "[]") as SavedDesign[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((design) => {
      const config = normalizeConfig(design.config);
      return config ? [{ ...design, config }] : [];
    });
  } catch {
    return [];
  }
}

function writeTestDesigns(designs: SavedDesign[]) {
  localStorage.setItem(TEST_DESIGNS_KEY, JSON.stringify(designs));
}

const JerseyCanvas = dynamic(() => import("./JerseyCanvas").then((mod) => mod.JerseyCanvas), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-400">Loading studio…</div>,
});

type Draft = { name: string; config: DesignConfig; id: string | null };

function LogoChoices({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BadgeId;
  onChange: (id: BadgeId) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {BADGES.map((badge) => (
          <button
            key={badge.id}
            type="button"
            onClick={() => onChange(badge.id)}
            className={`rounded-xl px-2 py-2 text-sm ${value === badge.id ? "bg-white text-zinc-950" : "border border-white/10 hover:bg-white/5"}`}
          >
            {badge.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Swatches({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {PALETTE.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={value === color.hex}
            onClick={() => onChange(color.hex)}
            className={`h-7 w-7 rounded-full border ${value === color.hex ? "border-white ring-2 ring-white/70" : "border-white/20"}`}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function Studio() {
  const [config, setConfig] = useState<DesignConfig>(DEFAULT_CONFIG);
  const [name, setName] = useState("Home jersey");
  const [designId, setDesignId] = useState<string | null>(null);
  const [zone, setZone] = useState<PartId>("front");
  const [angle, setAngle] = useState<AngleId>("front");
  const [view, setView] = useState<"studio" | "print">("studio");
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [download, setDownload] = useState<((filename: string) => void) | null>(null);

  const onDownloadReady = useCallback((fn: (filename: string) => void) => {
    setDownload(() => fn);
  }, []);

  const loadMine = useCallback(async () => {
    const list = await api<SavedDesign[]>("/designs");
    setDesigns(list);
    return list;
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("token");

    let draft: Draft | null = null;
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Draft;
        const config = normalizeConfig(parsed.config);
        if (config) draft = { ...parsed, config };
      } catch {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    }
    if (draft) {
      setConfig(draft.config);
      setName(draft.name || "Home jersey");
      setDesignId(draft.id);
    }
    if (!token) {
      setDesigns(readTestDesigns());
      return;
    }

    async function persistDraft(current: Draft) {
      if (!pendingDraftSave) {
        const body = JSON.stringify({ name: current.name, config: current.config });
        pendingDraftSave = (
          current.id
            ? api<SavedDesign>(`/designs/${current.id}`, { method: "PATCH", body })
            : api<SavedDesign>("/designs", { method: "POST", body })
        ).finally(() => {
          pendingDraftSave = null;
        });
      }
      const saved = await pendingDraftSave;
      sessionStorage.removeItem(DRAFT_KEY);
      return saved;
    }

    (async () => {
      try {
        if (draft) {
          const saved = await persistDraft(draft);
          if (!active) return;
          setDesignId(saved.id);
          setName(saved.name);
          setConfig(saved.config);
          setStatus("Design saved to your account.");
        }
        const list = await loadMine();
        if (active) setDesigns(list);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load designs");
      }
    })();

    return () => {
      active = false;
    };
  }, [loadMine]);

  function updateZone(patch: Partial<ZoneStyle>) {
    setConfig((current) => ({ ...current, [zone]: { ...current[zone], ...patch } }));
    setStatus("");
  }

  function setLogo(slot: LogoSlotId, id: BadgeId) {
    setConfig((current) => ({ ...current, logos: { ...current.logos, [slot]: id } }));
    setStatus("");
  }

  function setLettering(patch: Partial<Lettering>) {
    setConfig((current) => ({ ...current, lettering: { ...current.lettering, ...patch } }));
    setStatus("");
  }

  async function save() {
    setError("");
    setStatus("");
    const token = localStorage.getItem("token");
    if (!token) {
      const saved: SavedDesign = {
        id: designId ?? crypto.randomUUID(),
        name,
        config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [saved, ...readTestDesigns().filter((design) => design.id !== saved.id)];
      writeTestDesigns(next);
      setDesignId(saved.id);
      setDesigns(next);
      setStatus("Saved on this page for testing.");
      return;
    }

    setSaving(true);
    try {
      const saved = designId
        ? await api<SavedDesign>(`/designs/${designId}`, {
            method: "PATCH",
            body: JSON.stringify({ name, config }),
          })
        : await api<SavedDesign>("/designs", {
            method: "POST",
            body: JSON.stringify({ name, config }),
          });
      setDesignId(saved.id);
      setDesigns((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setStatus("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function openDesign(design: SavedDesign) {
    setConfig(normalizeConfig(design.config) ?? DEFAULT_CONFIG);
    setName(design.name);
    setDesignId(design.id);
    setStatus("");
    setError("");
  }

  async function removeDesign(id: string) {
    setError("");
    if (!localStorage.getItem("token")) {
      const next = readTestDesigns().filter((design) => design.id !== id);
      writeTestDesigns(next);
      setDesigns(next);
      if (designId === id) {
        setDesignId(null);
        setName("Home jersey");
        setConfig(DEFAULT_CONFIG);
      }
      return;
    }
    try {
      await api<null>(`/designs/${id}`, { method: "DELETE" });
      setDesigns((current) => current.filter((item) => item.id !== id));
      if (designId === id) {
        setDesignId(null);
        setName("Home jersey");
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  function downloadPng() {
    const filename = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jersey"}.png`;
    download?.(filename);
  }

  const active = config[zone];

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col lg:flex-row">
      <div className="relative min-h-[52vh] flex-1">
        <div className="absolute left-4 top-4 z-10 flex rounded-full border border-white/10 bg-zinc-950/80 p-1 text-xs backdrop-blur">
          <button
            type="button"
            onClick={() => setView("studio")}
            className={`rounded-full px-3 py-1.5 font-medium ${view === "studio" ? "bg-white text-zinc-950" : "text-zinc-300"}`}
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => setView("print")}
            className={`rounded-full px-3 py-1.5 font-medium ${view === "print" ? "bg-white text-zinc-950" : "text-zinc-300"}`}
          >
            Print pieces
          </button>
        </div>
        {view === "print" ? (
          <PrintSheet config={config} name={name} />
        ) : (
          <JerseyCanvas config={config} angle={angle} selected={zone} onSelect={setZone} onDownloadReady={onDownloadReady} />
        )}
        {view === "studio" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950/80 p-1.5 backdrop-blur">
            {ANGLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAngle(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${angle === item.id ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10"}`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={downloadPng}
              disabled={!download}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/10 disabled:opacity-40"
            >
              Download PNG
            </button>
          </div>
        </div>
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-5 overflow-y-auto border-white/10 bg-zinc-950 px-5 py-5 lg:w-96 lg:border-l">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Jersey studio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Design the kit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Click a part of the polo, or pick it below. Drag to rotate and scroll to zoom.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          Name
          <input
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          {PARTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setZone(item.id)}
              className={`rounded-full px-3 py-2 text-sm ${zone === item.id ? "bg-white text-zinc-950" : "border border-white/10 hover:bg-white/5"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Swatches label="Base color" value={active.color} onChange={(hex) => updateZone({ color: hex })} />
        <Swatches label="Stripe color" value={active.stripeColor} onChange={(hex) => updateZone({ stripeColor: hex })} />

        <fieldset>
          <legend className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">Pattern</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PATTERNS.map((pattern) => (
              <button
                key={pattern.id}
                type="button"
                onClick={() => updateZone({ pattern: pattern.id })}
                className={`rounded-xl px-3 py-2 text-left text-sm ${active.pattern === pattern.id ? "bg-white text-zinc-950" : "border border-white/10 hover:bg-white/5"}`}
              >
                {pattern.label}
              </button>
            ))}
          </div>
        </fieldset>

        {zone === "front" ? (
          <>
            <LogoChoices label="Left chest logo" value={config.logos.frontLeft} onChange={(id) => setLogo("frontLeft", id)} />
            <LogoChoices label="Center logo" value={config.logos.frontCenter} onChange={(id) => setLogo("frontCenter", id)} />
            <LogoChoices label="Right chest logo" value={config.logos.frontRight} onChange={(id) => setLogo("frontRight", id)} />
            <label className="flex flex-col gap-2 text-sm">
              Team name
              <input
                value={config.lettering.teamName}
                maxLength={16}
                onChange={(event) => setLettering({ teamName: event.target.value })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
              />
            </label>
          </>
        ) : null}

        {zone === "back" ? (
          <>
            <label className="flex flex-col gap-2 text-sm">
              Name
              <input
                value={config.lettering.playerName}
                maxLength={14}
                onChange={(event) => setLettering({ playerName: event.target.value })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Number
              <input
                value={config.lettering.number}
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => setLettering({ number: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Sponsor
              <input
                value={config.lettering.sponsor}
                maxLength={18}
                onChange={(event) => setLettering({ sponsor: event.target.value })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
              />
            </label>
          </>
        ) : null}

        {zone === "leftSleeve" ? (
          <LogoChoices label="Sleeve logo" value={config.logos.leftSleeve} onChange={(id) => setLogo("leftSleeve", id)} />
        ) : null}
        {zone === "rightSleeve" ? (
          <LogoChoices label="Sleeve logo" value={config.logos.rightSleeve} onChange={(id) => setLogo("rightSleeve", id)} />
        ) : null}

        {zone === "front" || zone === "back" ? (
          <Swatches label="Letter color" value={config.lettering.color} onChange={(hex) => setLettering({ color: hex })} />
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={saving || name.trim().length === 0}
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save design"}
        </button>
        {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <section>
            <h2 className="text-sm font-medium">My designs</h2>
            {designs.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">Saved kits show up here.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {designs.map((design) => (
                  <li key={design.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                    <button type="button" onClick={() => openDesign(design)} className="truncate text-left text-sm hover:text-white">
                      {design.name}
                    </button>
                    <button type="button" onClick={() => removeDesign(design.id)} className="text-xs text-zinc-400 hover:text-white">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
      </aside>
    </div>
  );
}
