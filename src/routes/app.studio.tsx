import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Image as ImageIcon, Sparkles, Download, Share2, Wand2, Plus, X, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";

export const Route = createFileRoute("/app/studio")({
  component: Studio,
});

const presets = [
  { id: "poster", label: "Poster", ratio: "3:4", w: 600, h: 800, size: "1024x1536" },
  { id: "banner", label: "Web banner", ratio: "16:9", w: 800, h: 450, size: "1536x1024" },
  { id: "story", label: "IG Story", ratio: "9:16", w: 450, h: 800, size: "1024x1536" },
  { id: "square", label: "IG Post", ratio: "1:1", w: 600, h: 600, size: "1024x1024" },
  { id: "ad", label: "Ad creative", ratio: "4:5", w: 600, h: 750, size: "1024x1536" },
];

type Stage = "queued" | "generating" | "ready";
interface Job {
  id: string;
  prompt: string;
  preset: typeof presets[number];
  stage: Stage;
  createdAt: number;
  swatch: string;
  imageUrl?: string;
  error?: string;
}

const swatches = [
  "linear-gradient(135deg,#a78bfa,#fbbf24)",
  "linear-gradient(135deg,#7dd3fc,#f0abfc)",
  "linear-gradient(135deg,#86efac,#a5f3fc)",
  "linear-gradient(135deg,#fda4af,#fdba74)",
  "linear-gradient(135deg,#c4b5fd,#fde68a)",
  "linear-gradient(135deg,#67e8f9,#c084fc)",
];

function fileBase(id: string) {
  return `gradlead-${id}-${Date.now()}`;
}

async function downloadImage(url: string, filename: string) {
  try {
    if (url.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = await (await fetch(url)).blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(obj);
    }
    toast.success("Downloaded", { description: filename });
  } catch {
    window.open(url, "_blank");
  }
}

function Studio() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [composing, setComposing] = useState(false);

  async function enqueue(job: Job) {
    setJobs((prev) => [job, ...prev]);
    await new Promise((r) => setTimeout(r, 400));
    setJobs((p) => p.map((x) => (x.id === job.id ? { ...x, stage: "generating" } : x)));
    try {
      const res = await api.aiImage({ prompt: job.prompt, size: job.preset.size });
      setJobs((p) => p.map((x) => (x.id === job.id ? { ...x, stage: "ready", imageUrl: res.image, error: undefined } : x)));
    } catch (e) {
      const msg = (e as Error).message;
      setJobs((p) => p.map((x) => (x.id === job.id ? { ...x, stage: "ready", imageUrl: undefined, error: msg } : x)));
      toast.error("Generation failed", { description: msg });
    }
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
          <p className="mt-1 text-sm text-muted-foreground">Generate posters, banners, stories and ad creatives with GPT Image 2. Download or share with one click.</p>
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
                    <div className="relative" style={{ aspectRatio: `${j.preset.w}/${j.preset.h}` }}>
                      {j.imageUrl ? (
                        <img src={j.imageUrl} alt={j.prompt} className="h-full w-full object-cover" />
                      ) : (
                        <div className="relative grid h-full w-full place-items-center text-white" style={{ background: j.swatch }}>
                          <div className="px-4 text-center text-sm font-semibold leading-snug drop-shadow">{j.prompt.slice(0, 60)}</div>
                        </div>
                      )}
                      {j.stage === "generating" && (
                        <div className="absolute inset-0 grid place-items-center bg-foreground/30 backdrop-blur-sm">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <div className="font-medium">{j.preset.label}</div>
                          <div className="text-muted-foreground">{j.preset.ratio}</div>
                        </div>
                        {j.stage === "queued" && <span className="text-xs text-muted-foreground">Queued…</span>}
                        {j.stage === "generating" && <span className="text-xs text-muted-foreground">Generating…</span>}
                        {j.stage === "ready" && j.imageUrl && (
                          <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span>
                        )}
                      </div>

                      {j.stage === "ready" && j.error && (
                        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                          <div className="flex items-center gap-1.5 font-medium"><AlertCircle className="h-3.5 w-3.5" /> Generation failed</div>
                          <p className="mt-1 break-words text-destructive/80">{j.error}</p>
                          <button onClick={() => enqueue({ ...j, id: crypto.randomUUID(), stage: "queued", imageUrl: undefined, error: undefined })} className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"><Wand2 className="h-3 w-3" /> Retry</button>
                        </div>
                      )}

                      {j.stage === "ready" && j.imageUrl && (
                        <div className="mt-3 space-y-2">
                          <div className="rounded-lg border border-border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                            <div className="truncate font-medium text-foreground/80">{fileBase(j.preset.id)}.png</div>
                            <div>PNG · GPT Image 2</div>
                          </div>
                          <button onClick={() => downloadImage(j.imageUrl!, `${fileBase(j.preset.id)}.png`)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg gradient-brand px-3 py-2 text-xs font-semibold text-white shadow-glow">
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                          <div className="flex gap-1.5">
                            <button onClick={() => { navigator.clipboard?.writeText(j.imageUrl!); toast.success("Image data copied"); }} className="grid h-7 flex-1 place-items-center rounded-md border border-border hover:bg-accent"><Share2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => enqueue({ ...j, id: crypto.randomUUID(), stage: "queued", imageUrl: undefined, error: undefined })} className="grid h-7 flex-1 place-items-center rounded-md border border-border hover:bg-accent"><Wand2 className="h-3.5 w-3.5" /></button>
                          </div>
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
            enqueue({ id: crypto.randomUUID(), prompt, preset, stage: "queued", createdAt: Date.now(), swatch: swatches[Math.floor(Math.random() * swatches.length)] });
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
