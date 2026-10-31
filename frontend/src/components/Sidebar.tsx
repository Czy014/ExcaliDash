import React, { useState, useEffect } from "react";
import { LayoutGrid, Folder, Plus, Archive, FolderOpen } from "lucide-react";
import type { Collection } from "../types";
import clsx from "clsx";
import { ConfirmModal } from "./ConfirmModal";
import { Logo } from "./Logo";
import { displayFontFamily } from "../utils/displayFont";
import { SidebarItem } from "./sidebar/SidebarItem";
import { SidebarFooter } from "./sidebar/SidebarFooter";
import {
  SidebarContextMenu,
  type SidebarContextMenuState,
} from "./sidebar/SidebarContextMenu";

interface SidebarProps {
  collections: Collection[];
  selectedCollectionId: string | null | undefined;
  onSelectCollection: (id: string | null | undefined) => void;
  onCreateCollection: (name: string) => void;
  onEditCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onDrop?: (e: React.DragEvent, collectionId: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onDrop,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [contextMenu, setContextMenu] =
    useState<SidebarContextMenuState | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName);
      setNewCollectionName("");
      setIsCreating(false);
    }
  };
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editName.trim()) {
      onEditCollection(editingId, editName);
      setEditingId(null);
    }
  };
  const handleItemContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: "item", id });
  };
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: "background" });
  };
  return (
    <>
      <div className="w-full flex flex-col h-full bg-transparent">
        <div className="p-4 sm:p-5 pb-2">
          <h1
            className="text-2xl text-slate-900 dark:text-white flex items-center gap-3 tracking-tight"
            style={{ fontFamily: displayFontFamily }}
          >
            <Logo className="w-10 h-10" />
            <span className="mt-1">ExcaliDash</span>
          </h1>
        </div>
        <nav
          className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-4 sm:space-y-8 custom-scrollbar"
          onContextMenu={handleBackgroundContextMenu}
        >
          <div className="space-y-1">
            <div className="px-6 pb-2 text-xs font-semibold text-slate-400 dark:text-neutral-500">
              Library
            </div>
            <div className="pl-3 pr-2">
              <button
                onClick={() => onSelectCollection(undefined)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border-2",
                  selectedCollectionId === undefined
                    ? "bg-indigo-50 dark:bg-neutral-800 text-indigo-900 dark:text-neutral-200 border-slate-800 dark:border-neutral-700 shadow-[1.5px_1.5px_0px_0px_rgba(30,41,59,0.9)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,0.18)] -translate-y-0.5"
                    : "text-slate-600 dark:text-neutral-400 border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-800 hover:shadow-[1.5px_1.5px_0px_0px_rgba(30,41,59,0.9)] dark:hover:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,0.18)] hover:-translate-y-0.5",
                )}
              >
                <LayoutGrid
                  size={18}
                  className={clsx(
                    selectedCollectionId === undefined
                      ? "text-indigo-900 dark:text-neutral-200"
                      : "text-slate-400 dark:text-neutral-500",
                  )}
                />
                <span className="min-w-0 flex-1 text-left">All Drawings</span>
              </button>
            </div>
            <SidebarItem
              id={null}
              icon={<Archive size={18} />}
              label="Unorganized"
              isActive={selectedCollectionId === null}
              onClick={() => onSelectCollection(null)}
              onDrop={onDrop}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between px-6 pb-2 group/header">
              <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500">
                Collections
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating(true);
                }}
                className="ui-icon-button h-7 w-7 border-transparent bg-transparent shadow-none opacity-0 group-hover/header:opacity-100 dark:bg-transparent"
                title="New Collection"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
            {isCreating && (
              <form
                onSubmit={handleCreateSubmit}
                className="mb-2 pl-3 pr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1 dark:bg-neutral-800">
                  <Folder
                    size={18}
                    className="shrink-0 text-slate-400 dark:text-neutral-500"
                  />
                  <input
                    autoFocus
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="New Collection..."
                    aria-label="Collection name"
                    className="ui-input min-w-0 w-full py-1.5 font-medium"
                    onBlur={() => !newCollectionName && setIsCreating(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setNewCollectionName("");
                        setIsCreating(false);
                      }
                    }}
                  />
                </div>
              </form>
            )}
            {collections
              .filter((c) => c.name !== "Trash")
              .map((collection) => (
                <SidebarItem
                  key={collection.id}
                  id={collection.id}
                  icon={
                    selectedCollectionId === collection.id ? (
                      <FolderOpen size={18} />
                    ) : (
                      <Folder size={18} />
                    )
                  }
                  label={collection.name}
                  isActive={selectedCollectionId === collection.id}
                  onClick={() => onSelectCollection(collection.id)}
                  onDoubleClick={() => {
                    setEditingId(collection.id);
                    setEditName(collection.name);
                  }}
                  onContextMenu={(e) => handleItemContextMenu(e, collection.id)}
                  isEditing={editingId === collection.id}
                  editValue={editName}
                  onEditChange={setEditName}
                  onEditSubmit={handleEditSubmit}
                  onEditBlur={() => setEditingId(null)}
                  onDrop={onDrop}
                />
              ))}
          </div>
        </nav>
        <SidebarFooter
          selectedCollectionId={selectedCollectionId}
          onDrop={onDrop}
        />
      </div>
      {contextMenu && (
        <SidebarContextMenu
          contextMenu={contextMenu}
          collections={collections}
          onClose={() => setContextMenu(null)}
          onCreateCollection={() => setIsCreating(true)}
          onRenameCollection={(collection) => {
            setEditingId(collection.id);
            setEditName(collection.name);
          }}
          onDeleteCollection={setCollectionToDelete}
        />
      )}
      <ConfirmModal
        isOpen={!!collectionToDelete}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? All drawings inside will be moved to Unorganized."
        confirmText="Delete Collection"
        onConfirm={() => {
          if (collectionToDelete) {
            onDeleteCollection(collectionToDelete);
            setCollectionToDelete(null);
          }
        }}
        onCancel={() => setCollectionToDelete(null)}
      />
    </>
  );
};
