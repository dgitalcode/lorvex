"use client";

import { useCallback, useMemo, useReducer, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  History,
  Eye,
  EyeOff,
  Redo2,
  Undo2,
  CalendarClock,
  Save,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  publishCmsDocument,
  restoreCmsVersion,
  saveCmsDraft,
  scheduleCmsPublish,
} from "@/server/actions/admin/cms";
import type {
  HomepageDocumentContent,
  HomepageSectionInput,
} from "@/server/validations/admin/cms";

type HistoryState = {
  past: HomepageDocumentContent[];
  present: HomepageDocumentContent;
  future: HomepageDocumentContent[];
};

type HistoryAction =
  | { type: "SET"; payload: HomepageDocumentContent }
  | { type: "REPLACE"; payload: HomepageDocumentContent }
  | { type: "UNDO" }
  | { type: "REDO" };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "SET":
      return {
        past: [...state.past, state.present],
        present: action.payload,
        future: [],
      };
    case "REPLACE":
      return { past: [], present: action.payload, future: [] };
    case "UNDO":
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1]!,
        future: [state.present, ...state.future],
      };
    case "REDO":
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0]!,
        future: state.future.slice(1),
      };
    default:
      return state;
  }
}

function SortableSectionRow({
  section,
  selected,
  onSelect,
}: {
  section: HomepageSectionInput;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.key });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex w-full items-center gap-3 border px-3 py-3 text-left transition-colors",
        selected
          ? "border-accent bg-accent/10"
          : "border-border bg-card hover:bg-muted/40",
        isDragging && "opacity-60",
      )}
    >
      <span
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {section.title || section.key}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {section.type} · #{section.sortOrder}
        </p>
      </div>
      {section.isVisible ? (
        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

function HeroFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-title">Hero title</Label>
        <Input
          id="hero-title"
          value={String(content.title ?? "")}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-subtitle">Hero subtitle</Label>
        <Textarea
          id="hero-subtitle"
          rows={3}
          value={String(content.subtitle ?? "")}
          onChange={(e) => onChange({ ...content, subtitle: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-image">Image URL</Label>
        <Input
          id="hero-image"
          value={String(content.imageUrl ?? "")}
          onChange={(e) => onChange({ ...content, imageUrl: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-video">Video URL</Label>
        <Input
          id="hero-video"
          value={String(content.videoUrl ?? "")}
          onChange={(e) => onChange({ ...content, videoUrl: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hero-cta-primary">Primary CTA href</Label>
          <Input
            id="hero-cta-primary"
            value={String(content.ctaPrimaryHref ?? "")}
            onChange={(e) =>
              onChange({ ...content, ctaPrimaryHref: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-cta-secondary">Secondary CTA href</Label>
          <Input
            id="hero-cta-secondary"
            value={String(content.ctaSecondaryHref ?? "")}
            onChange={(e) =>
              onChange({ ...content, ctaSecondaryHref: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

function StatsFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const items = Array.isArray(content.items)
    ? (content.items as { value?: string; label?: string }[])
    : [];

  const updateItem = (index: number, patch: { value?: string; label?: string }) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange({ ...content, items: next });
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { value: "0", label: "Label" }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: items.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="grid gap-3 border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              value={item.value ?? ""}
              onChange={(e) => updateItem(index, { value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={item.label ?? ""}
              onChange={(e) => updateItem(index, { label: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(index)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        Add stat
      </Button>
    </div>
  );
}

export function HomepageBuilder({
  documentId,
  documentStatus,
  scheduledAt,
  publishedAt,
  initialContent,
  liveSections,
  versions,
}: {
  documentId: string;
  documentStatus: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  initialContent: HomepageDocumentContent;
  liveSections: {
    key: string;
    type: string;
    title: string | null;
    isVisible: boolean;
    sortOrder: number;
  }[];
  versions: {
    version: number;
    note: string | null;
    createdAt: string;
    author: string;
  }[];
}) {
  const [history, dispatchHistory] = useReducer(historyReducer, {
    past: [],
    present: initialContent,
    future: [],
  });
  const [selectedKey, setSelectedKey] = useState(
    initialContent.sections[0]?.key ?? "",
  );
  const [previewWidth, setPreviewWidth] = useState(360);
  const [scheduleInput, setScheduleInput] = useState(
    scheduledAt ? scheduledAt.slice(0, 16) : "",
  );
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sections = history.present.sections;
  const selectedSection = sections.find((s) => s.key === selectedKey) ?? sections[0];

  const sortedPreviewSections = useMemo(
    () =>
      [...sections]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter((s) => s.isVisible),
    [sections],
  );

  const updateContent = useCallback(
    (next: HomepageDocumentContent) => {
      dispatchHistory({ type: "SET", payload: next });
    },
    [],
  );

  const updateSection = useCallback(
    (key: string, patch: Partial<HomepageSectionInput>) => {
      updateContent({
        sections: sections.map((section) =>
          section.key === key ? { ...section, ...patch } : section,
        ),
      });
    },
    [sections, updateContent],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.key === active.id);
    const newIndex = sections.findIndex((s) => s.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(sections, oldIndex, newIndex).map(
      (section, index) => ({
        ...section,
        sortOrder: index + 1,
      }),
    );

    updateContent({ sections: reordered });
  };

  const handleSaveDraft = () => {
    startTransition(async () => {
      const result = await saveCmsDraft({
        key: "homepage",
        type: "homepage",
        title: "Homepage",
        content: history.present,
      });
      if (result.ok) {
        toast.success("Draft saved");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const saveResult = await saveCmsDraft({
        key: "homepage",
        type: "homepage",
        title: "Homepage",
        content: history.present,
      });
      if (!saveResult.ok) {
        toast.error(saveResult.error);
        return;
      }
      const result = await publishCmsDocument("homepage");
      if (result.ok) {
        toast.success("Homepage published");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRestore = (version: number) => {
    startTransition(async () => {
      const result = await restoreCmsVersion(documentId, version);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored v${version}`);
      window.location.reload();
    });
  };

  const handleSchedule = () => {
    if (!scheduleInput) {
      toast.error("Choose a publish date and time");
      return;
    }
    startTransition(async () => {
      const iso = new Date(scheduleInput).toISOString();
      const saveResult = await saveCmsDraft({
        key: "homepage",
        type: "homepage",
        title: "Homepage",
        content: history.present,
      });
      if (!saveResult.ok) {
        toast.error(saveResult.error);
        return;
      }
      const result = await scheduleCmsPublish("homepage", iso);
      if (result.ok) {
        toast.success("Publish scheduled");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{documentStatus}</Badge>
        {publishedAt && (
          <span className="text-xs text-muted-foreground">
            Last published {formatDateTime(publishedAt)}
          </span>
        )}
        {scheduledAt && (
          <span className="text-xs text-muted-foreground">
            Scheduled {formatDateTime(scheduledAt)}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!history.past.length || isPending}
            onClick={() => dispatchHistory({ type: "UNDO" })}
          >
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!history.future.length || isPending}
            onClick={() => dispatchHistory({ type: "REDO" })}
          >
            <Redo2 className="h-4 w-4" /> Redo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handlePublish}
          >
            <Upload className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div
        className="grid min-h-[640px] gap-0 border border-border"
        style={{
          gridTemplateColumns: `minmax(0, 1fr) 4px minmax(280px, ${previewWidth}px)`,
        }}
      >
        <div className="grid min-h-0 grid-cols-1 gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Sections
              </p>
            </div>
            <ScrollArea className="h-[560px] p-3">
              <DndContext
                id="homepage-sections-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <SortableSectionRow
                        key={section.key}
                        section={section}
                        selected={section.key === selectedKey}
                        onSelect={() => setSelectedKey(section.key)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>

          <div className="min-w-0 p-4">
            {selectedSection ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Edit · {selectedSection.type}
                  </p>
                  <h2 className="mt-2 font-display text-2xl">
                    {selectedSection.title || selectedSection.key}
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Section title</Label>
                    <Input
                      value={selectedSection.title ?? ""}
                      onChange={(e) =>
                        updateSection(selectedSection.key, {
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Input
                      value={selectedSection.subtitle ?? ""}
                      onChange={(e) =>
                        updateSection(selectedSection.key, {
                          subtitle: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Visible on storefront</p>
                    <p className="text-xs text-muted-foreground">
                      Hidden sections stay in CMS but won&apos;t render live.
                    </p>
                  </div>
                  <Switch
                    checked={selectedSection.isVisible}
                    onCheckedChange={(checked) =>
                      updateSection(selectedSection.key, { isVisible: checked })
                    }
                  />
                </div>

                <Separator />

                {selectedSection.type === "hero" && (
                  <HeroFields
                    content={selectedSection.content}
                    onChange={(content) =>
                      updateSection(selectedSection.key, { content })
                    }
                  />
                )}

                {selectedSection.type === "stats" && (
                  <StatsFields
                    content={selectedSection.content}
                    onChange={(content) =>
                      updateSection(selectedSection.key, { content })
                    }
                  />
                )}

                {selectedSection.type !== "hero" &&
                  selectedSection.type !== "stats" && (
                    <div className="space-y-2">
                      <Label>Content JSON</Label>
                      <Textarea
                        rows={8}
                        value={JSON.stringify(selectedSection.content, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value) as Record<
                              string,
                              unknown
                            >;
                            updateSection(selectedSection.key, { content: parsed });
                          } catch {
                            // ignore invalid JSON while typing
                          }
                        }}
                      />
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a section to edit.
              </p>
            )}
          </div>
        </div>

        <div
          className="hidden cursor-col-resize bg-border lg:block"
          onMouseDown={(event) => {
            event.preventDefault();
            const startX = event.clientX;
            const startWidth = previewWidth;
            const onMove = (moveEvent: MouseEvent) => {
              const delta = startX - moveEvent.clientX;
              setPreviewWidth(Math.min(560, Math.max(280, startWidth + delta)));
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          aria-hidden
        />

        <aside className="hidden min-h-0 flex-col border-t border-border bg-muted/20 lg:flex lg:border-t-0 lg:border-l">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Live preview
            </p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {sortedPreviewSections.map((section, index) => (
                <div
                  key={section.key}
                  className={cn(
                    "rounded-md border border-border bg-card p-4",
                    section.key === selectedKey && "ring-1 ring-accent",
                  )}
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {index + 1}. {section.type}
                  </p>
                  <p className="mt-2 font-display text-lg">
                    {section.title || section.key}
                  </p>
                  {section.subtitle && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.subtitle}
                    </p>
                  )}
                </div>
              ))}
              {!sortedPreviewSections.length && (
                <p className="text-sm text-muted-foreground">
                  No visible sections in draft.
                </p>
              )}
            </div>

            <Separator className="my-6" />

            <div>
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Version history
              </p>
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.version}
                    className="flex items-start justify-between gap-2 rounded-md border border-border bg-card p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">v{version.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {version.author} ·{" "}
                        {formatDateTime(version.createdAt)}
                      </p>
                      {version.note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {version.note}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleRestore(version.version)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Schedule publish
              </p>
              <Input
                type="datetime-local"
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isPending}
                onClick={handleSchedule}
              >
                Schedule
              </Button>
            </div>

            <Separator className="my-6" />

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Live production sections
              </p>
              <div className="space-y-2">
                {liveSections.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-md border border-dashed border-border px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{section.title || section.key}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {section.isVisible ? "visible" : "hidden"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
