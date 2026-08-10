"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
import { GripVertical, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  NavigationDocumentContent,
  NavigationItemInput,
} from "@/server/validations/admin/cms";

function newClientId() {
  return `nav_${crypto.randomUUID().slice(0, 8)}`;
}

function SortableNavRow({
  item,
  depth,
  selected,
  onSelect,
}: {
  item: NavigationItemInput;
  depth: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.clientId });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        paddingLeft: `${12 + depth * 16}px`,
      }}
      className={cn(
        "flex w-full items-center gap-3 border px-3 py-2.5 text-left",
        selected ? "border-accent bg-accent/10" : "border-border bg-card",
        isDragging && "opacity-60",
      )}
    >
      <span
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.label}</p>
        <p className="truncate text-xs text-muted-foreground">{item.href || "—"}</p>
      </div>
      {item.isMega && <Badge variant="outline">Mega</Badge>}
    </button>
  );
}

export function NavigationBuilder({
  documentId,
  documentStatus,
  scheduledAt,
  initialContent,
  versions,
}: {
  documentId: string;
  documentStatus: string;
  scheduledAt: string | null;
  initialContent: NavigationDocumentContent;
  versions: {
    version: number;
    note: string | null;
    createdAt: string;
    author: string;
  }[];
}) {
  const [content, setContent] = useState(initialContent);
  const [selectedId, setSelectedId] = useState(initialContent.items[0]?.clientId ?? "");
  const [scheduleInput, setScheduleInput] = useState(
    scheduledAt ? scheduledAt.slice(0, 16) : "",
  );
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const roots = useMemo(
    () =>
      content.items
        .filter((item) => !item.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [content.items],
  );

  const flatRows = useMemo(() => {
    const rows: { item: NavigationItemInput; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const siblings = content.items
        .filter((item) => (item.parentId ?? null) === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (const item of siblings) {
        rows.push({ item, depth });
        walk(item.clientId, depth + 1);
      }
    };
    walk(null, 0);
    return rows;
  }, [content.items]);

  const selectedItem =
    content.items.find((item) => item.clientId === selectedId) ?? content.items[0];

  const updateItems = useCallback((items: NavigationItemInput[]) => {
    setContent((prev) => ({ ...prev, items }));
  }, []);

  const updateItem = useCallback(
    (clientId: string, patch: Partial<NavigationItemInput>) => {
      updateItems(
        content.items.map((item) =>
          item.clientId === clientId ? { ...item, ...patch } : item,
        ),
      );
    },
    [content.items, updateItems],
  );

  const addItem = (parentId: string | null = null) => {
    const siblings = content.items.filter(
      (item) => (item.parentId ?? null) === parentId,
    );
    const item: NavigationItemInput = {
      clientId: newClientId(),
      parentId,
      label: parentId ? "Sub link" : "New link",
      href: "/fr/shop",
      imageUrl: null,
      sortOrder: siblings.length,
      isMega: false,
      openInNew: false,
    };
    updateItems([...content.items, item]);
    setSelectedId(item.clientId);
  };

  const deleteItem = (clientId: string) => {
    const childIds = new Set<string>();
    const collect = (id: string) => {
      childIds.add(id);
      content.items
        .filter((item) => item.parentId === id)
        .forEach((child) => collect(child.clientId));
    };
    collect(clientId);
    updateItems(content.items.filter((item) => !childIds.has(item.clientId)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = content.items.find((item) => item.clientId === active.id);
    const overItem = content.items.find((item) => item.clientId === over.id);
    if (!activeItem || !overItem) return;
    if ((activeItem.parentId ?? null) !== (overItem.parentId ?? null)) return;

    const parentId = activeItem.parentId ?? null;
    const siblings = content.items
      .filter((item) => (item.parentId ?? null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const oldIndex = siblings.findIndex((item) => item.clientId === active.id);
    const newIndex = siblings.findIndex((item) => item.clientId === over.id);
    const reordered = arrayMove(siblings, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    const reorderedIds = new Set(reordered.map((item) => item.clientId));
    updateItems([
      ...content.items.filter((item) => !reorderedIds.has(item.clientId)),
      ...reordered,
    ]);
  };

  const persist = async () => {
    return saveCmsDraft({
      key: "navigation",
      type: "navigation",
      title: "Navigation",
      content,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{documentStatus}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addItem()}>
            <Plus className="h-4 w-4" /> Add link
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await persist();
                toast[result.ok ? "success" : "error"](
                  result.ok ? "Draft saved" : result.error,
                );
              })
            }
          >
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const saveResult = await persist();
                if (!saveResult.ok) {
                  toast.error(saveResult.error);
                  return;
                }
                const result = await publishCmsDocument("navigation");
                toast[result.ok ? "success" : "error"](
                  result.ok ? "Navigation published" : result.error,
                );
              })
            }
          >
            <Upload className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-0 border border-border lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Menu tree · header
            </p>
          </div>
          <ScrollArea className="h-[520px] p-3">
            <DndContext
              id="navigation-tree-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={flatRows.map((row) => row.item.clientId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {flatRows.map(({ item, depth }) => (
                    <SortableNavRow
                      key={item.clientId}
                      item={item}
                      depth={depth}
                      selected={item.clientId === selectedId}
                      onSelect={() => setSelectedId(item.clientId)}
                    />
                  ))}
                  {!flatRows.length && (
                    <p className="px-2 text-sm text-muted-foreground">
                      No navigation items yet.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>

        <div className="p-4">
          {selectedItem ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Edit item
                  </p>
                  <h2 className="mt-2 font-display text-2xl">{selectedItem.label}</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteItem(selectedItem.clientId)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={selectedItem.label}
                    onChange={(e) =>
                      updateItem(selectedItem.clientId, { label: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Href</Label>
                  <Input
                    value={selectedItem.href ?? ""}
                    onChange={(e) =>
                      updateItem(selectedItem.clientId, { href: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mega menu image URL</Label>
                <Input
                  value={selectedItem.imageUrl ?? ""}
                  onChange={(e) =>
                    updateItem(selectedItem.clientId, { imageUrl: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <Label>Mega menu</Label>
                  <Switch
                    checked={selectedItem.isMega}
                    onCheckedChange={(checked) =>
                      updateItem(selectedItem.clientId, { isMega: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <Label>Open in new tab</Label>
                  <Switch
                    checked={selectedItem.openInNew}
                    onCheckedChange={(checked) =>
                      updateItem(selectedItem.clientId, { openInNew: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Parent</Label>
                <select
                  className="flex h-11 w-full border border-input bg-transparent px-4 text-sm"
                  value={selectedItem.parentId ?? ""}
                  onChange={(e) =>
                    updateItem(selectedItem.clientId, {
                      parentId: e.target.value || null,
                    })
                  }
                >
                  <option value="">Top level</option>
                  {roots
                    .filter((item) => item.clientId !== selectedItem.clientId)
                    .map((item) => (
                      <option key={item.clientId} value={item.clientId}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(selectedItem.clientId)}
              >
                <Plus className="h-4 w-4" /> Add child link
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an item to edit.</p>
          )}

          <div className="mt-8 space-y-3 border-t border-border pt-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Schedule publish
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
              disabled={isPending || !scheduleInput}
              onClick={() =>
                startTransition(async () => {
                  const saveResult = await persist();
                  if (!saveResult.ok) {
                    toast.error(saveResult.error);
                    return;
                  }
                  const result = await scheduleCmsPublish(
                    "navigation",
                    new Date(scheduleInput).toISOString(),
                  );
                  toast[result.ok ? "success" : "error"](
                    result.ok ? "Publish scheduled" : result.error,
                  );
                })
              }
            >
              Schedule
            </Button>
          </div>

          <div className="mt-8 space-y-2 border-t border-border pt-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Version history
            </p>
            {versions.map((version) => (
              <div
                key={version.version}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm">v{version.version}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(version.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await restoreCmsVersion(
                        documentId,
                        version.version,
                      );
                      if (result.ok) window.location.reload();
                      else toast.error(result.error);
                    })
                  }
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
