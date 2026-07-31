import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Image as ImageIcon, Sparkles, Download, Share2, Wand2, Plus, X, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/studio")({
  component: Studio,
});

const presets = [
  { id: "poster", label: "Poster", ratio: "3:4", w: 600, h: 800 },
  { id: "banner", label: "Web banner", ratio: "16:9", w: 800, h: 450 },
  { id: "story", label: "IG Story", ratio: "9:16", w: 450, h: 800 },
  { id: "square", label: "IG Post", ratio: "1:1", w: 600, h: 600 },
  { id: "ad", label: "Ad creative", ratio: "4:5", w: 600, h: 750 },
];

type Stage = "queued" | "generating" | "ready";
interface Job {
  id: string;
  prompt: string;
  preset: typeof presets[number];
  stage: Stage;
  createdAt: number;
  swatch: string;
}

const swatches = [
  "linear-gradient(135deg,#a78bfa,#fbbf24)",
  "linear-gradient(135deg,#7dd3fc,#f0abfc)",
  "linear-gradient(135deg,#86efac,#a5f3fc)",
  "linear-gradient(135deg,#fda4af,#fdba74)",
  "linear-gradient(135deg,#c4b5fd,#fde68a)",
  "linear-gradient(135deg,#67e8f9,#c084fc)",
];

function Studio() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [composing, setComposing] = useState(false);

  function enqueue(j: Job) {
    setJobs((prev) => [j, ...prev]);
    setTimeout(() => setJobs((p) => p.map((x) => x.id === j.id ? { ...x, stage: "generating" } : x)), 500);
    setTimeout(() => setJobs((p) => p.map((x) => x.id === j.id ? { ...x, stage: "ready" } : x)), 2500 + Math.random() * 1500);
  }

  const lanes: { key: Stage; label: string; tint: string; Icon: typeof Sparkles }[] = [
    { key: "queued", label: "Queued", tint: "gradient-soft", Icon: Clock },
    { key: "generating", label: "Generating", tint: "gradient-peach", Icon: Loader2 },
    { key: "ready", label: "Ready to share", tint: "gradient-mint", Icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Creative Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate posters, banners, stories and ad creatives. Download or share with one click.</p>
        </div>
        <button onClick={() => setComposing(true)} className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow">
          <Plus className="h-4 w-4" /> New creative
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {lanes.map(({ key, label, tint, Icon }) => {
          const items = jobs.filter((j) => j.stage === key);
          return (
            <div key={key} className="flex min-h-[320px] flex-col rounded-2xl border border-border bg-card/70 p-3 shadow-soft">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${tint}`}>
                    <Icon className={`h-3.5 w-3.5 text-foreground/80 ${key === "generating" ? "animate-spin" : ""}`} />
                  </span>
                  <div className="text-sm font-semibold">{label}</div>
                </div>
                <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</div>
              </div>
              <div className="space-y-3">
                {items.map((j) => (
                  <div key={j.id} className="overflow-hidden rounded-xl border border-border bg-background">
                    <div
                      className="relative grid place-items-center text-white"
                      style={{
                        background: j.swatch,
                        aspectRatio: `${j.preset.w}/${j.preset.h}`,
                      }}
                    >
                      <div className="px-4 text-center text-sm font-semibold leading-snug drop-shadow">
                        {j.prompt.slice(0, 60)}
                      </div>
                      {j.stage === "generating" && (
                        <div className="absolute inset-0 grid place-items-center bg-foreground/30 backdrop-blur-sm">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <div className="text-xs">
                        <div className="font-medium">{j.preset.label}</div>
                        <div className="text-muted-foreground">{j.preset.ratio}</div>
                      </div>
                      {j.stage === "ready" && (
                        <div className="flex gap-1.5">
                          <button onClick={() => toast.success("Downloaded")} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-accent"><Download className="h-3.5 w-3.5" /></button>
                          <button onClick={() => toast.success("Share link copied")} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-accent"><Share2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => enqueue({ ...j, id: crypto.randomUUID(), stage: "queued", swatch: swatches[Math.floor(Math.random()*swatches.length)] })} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-accent"><Wand2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No creatives</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {composing && (
        <Composer
          onClose={() => setComposing(false)}
          onSubmit={(prompt, preset) => {
            enqueue({ id: crypto.randomUUID(), prompt, preset, stage: "queued", createdAt: Date.now(), swatch: swatches[Math.floor(Math.random()*swatches.length)] });
            setComposing(false);
            toast.success("Creative queued");
          }}
        />
      )}
    </div>
  );
}

function Composer({ onClose, onSubmit }: { onClose: () => void; onSubmit: (prompt: string, preset: typeof presets[number]) => void }) {
  const [prompt, setPrompt] = useState("Festive product launch poster with bold typography");
  const [preset, setPreset] = useState(presets[0]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /><div className="text-sm font-semibold">New creative</div></div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Prompt</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Format</div>
            <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-3">
              {presets.map((p) => (
                <button key={p.id} onClick={() => setPreset(p)} className={`rounded-xl border px-3 py-2 text-left text-xs ${preset.id === p.id ? "border-primary bg-accent" : "border-border bg-background hover:bg-accent"}`}>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-muted-foreground">{p.ratio}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={() => onSubmit(prompt, preset)} className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow">
            <Sparkles className="h-4 w-4" /> Generate
          </button>
        </div>
      </div>
    </div>
  );
}
