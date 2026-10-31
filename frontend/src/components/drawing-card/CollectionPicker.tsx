import React from "react";
import type { Collection, DrawingSummary } from "../../types";
import { CollectionMoveOptions } from "./CollectionMoveOptions";

interface CollectionPickerProps {
  drawing: DrawingSummary;
  collections: Collection[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMoveToCollection: (id: string, collectionId: string | null) => void;
}

export const CollectionPicker: React.FC<CollectionPickerProps> = ({
  drawing,
  collections,
  isOpen,
  onToggle,
  onClose,
  onMoveToCollection,
}) => {
  const collectionName = drawing.collectionId
    ? collections.find((collection) => collection.id === drawing.collectionId)
        ?.name || "Collection"
    : "Unorganized";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 flex-wrap justify-start xs:justify-end">
        <div className="relative">
          <button
            onClick={onToggle}
            data-testid={`collection-picker-${drawing.id}`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className="max-w-[120px] truncate rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 cursor-pointer border-neutral-200/60 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
          >
            {collectionName}
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onClose} />
              <div className="ui-menu absolute left-0 xs:left-auto xs:right-0 bottom-full mb-1.5 w-48 z-20 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-150">
                <CollectionMoveOptions
                  collections={collections}
                  currentCollectionId={drawing.collectionId}
                  drawingId={drawing.id}
                  onMoveToCollection={onMoveToCollection}
                  onDone={onClose}
                  optionClassName="ui-menu-item justify-between text-xs"
                  selectedClassName="ui-menu-item-selected"
                  unselectedClassName=""
                  checkSize={12}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
