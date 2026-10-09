/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import { Plus } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const GET_MY_COLLECTIONS = gql`
  query GetMyCollectionsSheet {
    myCollections {
      id
      name
      color
      itemCount
    }
  }
`;

const CREATE_COLLECTION = gql`
  mutation CreateCollectionSheet($name: String!, $color: String) {
    createCollection(name: $name, color: $color) {
      id
      name
      color
      itemCount
    }
  }
`;

const ADD_SAVE_TO_COLLECTION = gql`
  mutation AddSaveToCollectionSheet(
    $contentId: String!
    $collectionId: String!
  ) {
    addSaveToCollection(contentId: $contentId, collectionId: $collectionId)
  }
`;

const GET_CONTENT_SAVE_STATUS = gql`
  query GetContentSaveStatusSheet($contentId: String!) {
    contentSaveStatus(contentId: $contentId) {
      isSaved
      savedInCollections {
        collectionId
        collectionName
      }
    }
  }
`;

const TOGGLE_SAVE_SHEET = gql`
  mutation ToggleSaveSheet($contentId: String!, $collectionId: String) {
    toggleSave(contentId: $contentId, collectionId: $collectionId) {
      saved
      saveCount
      collectionId
    }
  }
`;

type CollectionItem = {
  id: string;
  name: string;
  color?: string | null;
  itemCount: number;
};

type Props = {
  open: boolean;
  contentId: string;
  onSave: (collectionId?: string) => void;
  onClose: () => void;
  // Toggle mode (PostCard + ContentDetail): provide both of these
  onUnsave?: (collectionId?: string) => void;
  lang?: string;
};

export function SaveCollectionSheet({
  open,
  contentId,
  onSave,
  onClose,
  onUnsave,
  lang,
}: Props) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const toggleMode = !!onUnsave;

  const { data: colData, refetch: refetchCols } = (useQuery as any)(
    GET_MY_COLLECTIONS,
    { fetchPolicy: "cache-and-network", skip: !open },
  ) as { data?: { myCollections: CollectionItem[] }; refetch: () => Promise<unknown> };

  const { data: statusData, refetch: refetchStatus } = (useQuery as any)(
    GET_CONTENT_SAVE_STATUS,
    { variables: { contentId }, fetchPolicy: "cache-and-network", skip: !open || !toggleMode },
  ) as {
    data?: {
      contentSaveStatus: {
        isSaved: boolean;
        savedInCollections: { collectionId: string }[];
      };
    };
    refetch: () => Promise<unknown>;
  };

  const [createCollection] = useMutation(CREATE_COLLECTION) as any;
  const [toggleSave] = useMutation(TOGGLE_SAVE_SHEET) as any;
  const [addSaveToCollection] = useMutation(ADD_SAVE_TO_COLLECTION) as any;

  const collections: CollectionItem[] = colData?.myCollections ?? [];
  const savedInIds = new Set(
    (statusData?.contentSaveStatus?.savedInCollections ?? []).map(
      (s: { collectionId: string }) => s.collectionId,
    ),
  );
  const isSaved = statusData?.contentSaveStatus?.isSaved ?? false;

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy("new");
    try {
      const { data: res } = await createCollection({ variables: { name: trimmed } });
      const newCol = res?.createCollection as CollectionItem | undefined;
      setNewName("");
      setCreating(false);
      if (toggleMode) {
        await Promise.all([refetchCols(), refetchStatus()]);
      } else {
        await refetchCols();
      }
      if (newCol) onSave(newCol.id);
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleCollection(col: CollectionItem) {
    if (!toggleMode) {
      onSave(col.id);
      return;
    }
    setBusy(col.id);
    const alreadyIn = savedInIds.has(col.id);
    try {
      if (alreadyIn) {
        await toggleSave({ variables: { contentId, collectionId: col.id } });
        onUnsave!(col.id);
      } else if (isSaved) {
        await addSaveToCollection({ variables: { contentId, collectionId: col.id } });
        onSave(col.id);
      } else {
        await toggleSave({ variables: { contentId, collectionId: col.id } });
        onSave(col.id);
      }
      await Promise.all([refetchStatus(), refetchCols()]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setCreating(false);
          setNewName("");
          onClose();
        }
      }}
    >
      <DrawerContent className="flex flex-col max-h-[85dvh]">
        <DrawerHeader className="shrink-0 text-left px-5 pt-2 pb-3">
          <DrawerTitle className="text-lg font-semibold">
            Save to collection
          </DrawerTitle>
          <p className="text-base text-muted-foreground mt-0.5">
            {toggleMode
              ? "Tap a collection to save · tap again to remove"
              : "Keep what you love, organised"}
          </p>
        </DrawerHeader>

        {/* Scrollable collection list — always stable, never shifts */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1 min-h-0">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-3 w-full py-3 text-left"
          >
            <div
              className="w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center shrink-0"
              style={{ borderColor: "rgb(var(--brand-primary) / 0.5)" }}
            >
              <Plus className="w-5 h-5" style={{ color: "rgb(var(--brand-primary))" }} />
            </div>
            <span className="font-medium text-base" style={{ color: "rgb(var(--brand-primary))" }}>
              New collection
            </span>
          </button>

          {collections.map((col) => {
            const isIn = toggleMode ? savedInIds.has(col.id) : false;
            const isLoading = busy === col.id;
            const isDisabled = toggleMode ? (!isIn && savedInIds.size > 0) : false;
            return (
              <div
                key={col.id}
                className="flex items-center gap-3 w-full py-2.5 rounded-xl"
                style={{ opacity: isLoading ? 0.6 : isDisabled ? 0.35 : 1 }}
              >
                <button
                  onClick={() =>
                    toggleMode && isIn && lang
                      ? (onClose(), router.push(`/${lang}/collections/${col.id}?from=/${lang}/for-you`))
                      : handleToggleCollection(col)
                  }
                  disabled={isLoading || isDisabled}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-lg"
                    style={{ backgroundColor: col.color ?? "rgb(var(--brand-primary))" }}
                  >
                    {(col.name ?? "").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-base truncate"
                      style={{ color: isIn ? "rgb(var(--brand-primary))" : "rgb(var(--color-text))" }}
                    >
                      {col.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{col.itemCount} items</p>
                  </div>
                </button>

                {/* Toggle indicator — only in toggle mode */}
                {toggleMode && (
                  <button
                    onClick={() => handleToggleCollection(col)}
                    disabled={isLoading || isDisabled}
                    className="shrink-0 p-1"
                  >
                    {isLoading ? (
                      <InterlockingBalls size={20} />
                    ) : isIn ? (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgb(var(--brand-primary))" }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-border" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Create form — anchored below list, keyboard pushes it up but list stays */}
        {creating && (
          <div className="shrink-0 px-4 pt-3 pb-2 border-t border-border" data-vaul-no-drag>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="flex-1 bg-surface rounded-xl px-4 py-3 text-base text-default placeholder:text-muted-foreground outline-none border border-border focus:border-primary"
                placeholder="Collection name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="px-3 py-3 rounded-xl text-base text-muted-foreground shrink-0"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || busy === "new"}
                className="px-4 py-3 rounded-xl text-base font-semibold text-white disabled:opacity-40 shrink-0"
                style={{ backgroundColor: "rgb(var(--brand-primary))" }}
              >
                {busy === "new" ? "…" : "Create"}
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0 px-4 pt-3 pb-8">
          <button
            onClick={() => {
              if (!toggleMode) onSave(undefined);
              onClose();
            }}
            className="w-full py-4 rounded-2xl font-semibold text-base text-white"
            style={{ backgroundColor: "rgb(var(--brand-primary))" }}
          >
            {savedInIds.size > 0 ? "Done" : "Close"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
