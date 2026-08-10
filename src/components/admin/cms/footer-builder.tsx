"use client";

import { useCallback, useState, useTransition } from "react";
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
  FooterColumnInput,
  FooterDocumentContent,
} from "@/server/validations/admin/cms";

function newClientId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function SortableColumn({
  column,
  selected,
  onSelect,
}: {
  column: FooterColumnInput;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.clientId });

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
        "flex w-full items-center gap-3 border px-3 py-3 text-left",
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
        <p className="truncate text-sm font-medium">{column.title}</p>
        <p className="text-xs text-muted-foreground">
          {column.links.length} link{column.links.length === 1 ? "" : "s"}
        </p>
      </div>
    </button>
  );
}

export function FooterBuilder({
  documentId,
  documentStatus,
  scheduledAt,
  initialContent,
  versions,
}: {
  documentId: string;
  documentStatus: string;
  scheduledAt: string | null;
  initialContent: FooterDocumentContent;
  versions: {
    version: number;
    note: string | null;
    createdAt: string;
    author: string;
  }[];
}) {
  const [content, setContent] = useState(initialContent);
  const [selectedColumnId, setSelectedColumnId] = useState(
    initialContent.columns[0]?.clientId ?? "",
  );
  const [scheduleInput, setScheduleInput] = useState(
    scheduledAt ? scheduledAt.slice(0, 16) : "",
  );
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = [...content.columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedColumn =
    columns.find((column) => column.clientId === selectedColumnId) ?? columns[0];

  const updateColumns = useCallback((nextColumns: FooterColumnInput[]) => {
    setContent({ columns: nextColumns });
  }, []);

  const updateColumn = useCallback(
    (clientId: string, patch: Partial<FooterColumnInput>) => {
      updateColumns(
        content.columns.map((column) =>
          column.clientId === clientId ? { ...column, ...patch } : column,
        ),
      );
    },
    [content.columns, updateColumns],
  );

  const addColumn = () => {
    const column: FooterColumnInput = {
      clientId: newClientId("col"),
      title: "New column",
      sortOrder: content.columns.length,
      links: [],
    };
    updateColumns([...content.columns, column]);
    setSelectedColumnId(column.clientId);
  };

  const deleteColumn = (clientId: string) => {
    updateColumns(content.columns.filter((column) => column.clientId !== clientId));
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((c) => c.clientId === active.id);
    const newIndex = columns.findIndex((c) => c.clientId === over.id);
    const reordered = arrayMove(columns, oldIndex, newIndex).map((column, index) => ({
      ...column,
      sortOrder: index,
    }));
    updateColumns(reordered);
  };

  const persist = async () =>
    saveCmsDraft({
      key: "footer",
      type: "footer",
      title: "Footer",
      content,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{documentStatus}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="h-4 w-4" /> Add column
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
                const result = await publishCmsDocument("footer");
                toast[result.ok ? "success" : "error"](
                  result.ok ? "Footer published" : result.error,
                );
              })
            }
          >
            <Upload className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-0 border border-border lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Columns
            </p>
          </div>
          <ScrollArea className="h-[520px] p-3">
            <DndContext
              id="footer-columns-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext
                items={columns.map((column) => column.clientId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {columns.map((column) => (
                    <SortableColumn
                      key={column.clientId}
                      column={column}
                      selected={column.clientId === selectedColumnId}
                      onSelect={() => setSelectedColumnId(column.clientId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>

        <div className="p-4">
          {selectedColumn ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Edit column
                  </p>
                  <h2 className="mt-2 font-display text-2xl">{selectedColumn.title}</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteColumn(selectedColumn.clientId)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Column title</Label>
                <Input
                  value={selectedColumn.title}
                  onChange={(e) =>
                    updateColumn(selectedColumn.clientId, { title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Links</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateColumn(selectedColumn.clientId, {
                        links: [
                          ...selectedColumn.links,
                          {
                            label: "New link",
                            href: "/fr/about",
                            sortOrder: selectedColumn.links.length,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4" /> Add link
                  </Button>
                </div>

                {selectedColumn.links.map((link, index) => (
                  <div
                    key={`${selectedColumn.clientId}-${index}`}
                    className="grid gap-3 border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const links = selectedColumn.links.map((item, i) =>
                            i === index ? { ...item, label: e.target.value } : item,
                          );
                          updateColumn(selectedColumn.clientId, { links });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Href</Label>
                      <Input
                        value={link.href}
                        onChange={(e) => {
                          const links = selectedColumn.links.map((item, i) =>
                            i === index ? { ...item, href: e.target.value } : item,
                          );
                          updateColumn(selectedColumn.clientId, { links });
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateColumn(selectedColumn.clientId, {
                            links: selectedColumn.links.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add a column to begin.</p>
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
                    "footer",
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
