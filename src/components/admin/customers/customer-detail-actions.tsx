"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UserStatus } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addCustomerTag,
  createCustomerTag,
  removeCustomerTag,
  updateCustomerStatus,
} from "@/server/actions/admin/customers";

type Tag = { id: string; name: string; color: string | null };
type Assignment = { tag: Tag };

type Props = {
  userId: string;
  status: UserStatus;
  tags: Assignment[];
  allTags: Tag[];
};

export function CustomerDetailActions({
  userId,
  status,
  tags,
  allTags,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newTagName, setNewTagName] = useState("");
  const [selectedTag, setSelectedTag] = useState(allTags[0]?.id ?? "");

  const assignedIds = new Set(tags.map((t) => t.tag.id));
  const availableTags = allTags.filter((t) => !assignedIds.has(t.id));

  function refresh() {
    router.refresh();
  }

  function handleStatus(value: UserStatus) {
    startTransition(async () => {
      const result = await updateCustomerStatus({ userId, status: value });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Customer status updated");
        refresh();
      }
    });
  }

  function handleAddTag() {
    if (!selectedTag) return;
    startTransition(async () => {
      const result = await addCustomerTag({ userId, tagId: selectedTag });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tag added");
        refresh();
      }
    });
  }

  function handleRemoveTag(tagId: string) {
    startTransition(async () => {
      const result = await removeCustomerTag({ userId, tagId });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tag removed");
        refresh();
      }
    });
  }

  function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCustomerTag({ name: newTagName });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tag created");
        setNewTagName("");
        refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Account status</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={status} onValueChange={handleStatus} disabled={pending}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["ACTIVE", "SUSPENDED", "DELETED"] as UserStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.length ? (
              tags.map(({ tag }) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="gap-2"
                  style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                >
                  {tag.name}
                  <button
                    type="button"
                    className="opacity-60 hover:opacity-100"
                    onClick={() => handleRemoveTag(tag.id)}
                    disabled={pending}
                    aria-label={`Remove ${tag.name}`}
                  >
                    ×
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tags assigned.</p>
            )}
          </div>
          {availableTags.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select tag" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddTag} disabled={pending}>
                Add
              </Button>
            </div>
          )}
          <form onSubmit={handleCreateTag} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="newTag" className="sr-only">
                New tag
              </Label>
              <Input
                id="newTag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Create new tag…"
                required
              />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
