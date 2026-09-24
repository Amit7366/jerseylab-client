"use client";

import { useEffect, useState } from "react";
import type { DesignConfig } from "@/lib/design";
import { downloadCanvas, PRINT_PIECES, renderPrintPiece, renderPrintSheet, type PrintPieceId } from "@/lib/printPieces";

export function PrintSheet({ config, name }: { config: DesignConfig; name: string }) {
  const [previews, setPreviews] = useState<Partial<Record<PrintPieceId, string>>>({});

  useEffect(() => {
    const next: Partial<Record<PrintPieceId, string>> = {};
    for (const piece of PRINT_PIECES) {
      next[piece.id] = renderPrintPiece(config, piece.id, 1).toDataURL("image/png");
    }
    setPreviews(next);
  }, [config]);

  function fileName(label: string) {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jersey";
    return `${base}-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
  }

  function downloadPiece(id: PrintPieceId, label: string) {
    downloadCanvas(renderPrintPiece(config, id, 3), fileName(label));
  }

  function downloadSheet() {
    downloadCanvas(renderPrintSheet(config, 2), fileName("print-sheet"));
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-zinc-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">Print pieces</p>
          <p className="mt-1 text-sm text-zinc-300">These update from the live front, back, sleeves, and collar.</p>
        </div>
        <button
          type="button"
          onClick={downloadSheet}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950"
        >
          Download sheet
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PRINT_PIECES.map((piece) => (
          <article key={piece.id} className="rounded-2xl border border-white/10 bg-white p-3 text-zinc-950">
            <div className="flex min-h-56 items-center justify-center">
              {previews[piece.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[piece.id]} alt={piece.label} className="max-h-72 w-full object-contain" />
              ) : (
                <p className="text-sm text-zinc-500">Drawing {piece.label}…</p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">{piece.label}</h2>
              <button
                type="button"
                onClick={() => downloadPiece(piece.id, piece.label)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium"
              >
                Download PNG
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
