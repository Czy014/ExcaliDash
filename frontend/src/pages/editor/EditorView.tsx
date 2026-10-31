import React from "react";
import type { DrawingSnapshotFull } from "../../api";
import { HistoryPreviewCanvas } from "./HistoryPreviewCanvas";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Download,
  History,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { Toaster } from "sonner";
import { GridStepSelector } from "../../components/GridStepSelector";
import { UIOptions, validateEmbeddableUrl } from "./shared";

type EditorViewProps = {
  id?: string;
  autoHideEnabled: boolean;
  autosaveFailing: boolean;
  resolving: boolean;
  canEdit: boolean;
  drawingName: string;
  editorContainerRef: React.RefObject<HTMLDivElement>;
  initialData: any;
  isHeaderVisible: boolean;
  isHistoryOpen: boolean;
  historyPreview: DrawingSnapshotFull | null;
  historyButtonRef: React.RefObject<HTMLButtonElement>;
  isRenaming: boolean;
  isSavingOnLeave: boolean;
  isSceneLoading: boolean;
  loadError: string | null;
  newName: string;
  theme: string;
  onBackClick: () => void;
  onCanvasChange: (
    elements: readonly any[],
    appState: any,
    files?: Record<string, any>,
  ) => void;
  onCanvasDropCapture: (event: React.DragEvent<HTMLDivElement>) => void;
  onExportClick: () => void;
  onLibraryChange: (items: readonly any[]) => void;
  onNavigateHome: () => void;
  onNewNameChange: (value: string) => void;
  onRenameBlur: () => void;
  onRenameStart: () => void;
  onRenameSubmit: (event: React.FormEvent) => void;
  onSetExcalidrawAPI: (api: any) => void;
  gridStep: number;
  onSetGridStep: (gridStep: number) => void;
  onHistoryOpen: () => void;
  onToggleAutoHide: () => void;
  onToggleTheme: () => void;
};

export const EditorView: React.FC<EditorViewProps> = ({
  id,
  autoHideEnabled,
  autosaveFailing,
  resolving,
  canEdit,
  drawingName,
  editorContainerRef,
  initialData,
  isHeaderVisible,
  isHistoryOpen,
  historyPreview,
  historyButtonRef,
  isRenaming,
  isSavingOnLeave,
  isSceneLoading,
  loadError,
  newName,
  theme,
  onBackClick,
  onCanvasChange,
  onCanvasDropCapture,
  onExportClick,
  onLibraryChange,
  onNavigateHome,
  onNewNameChange,
  onRenameBlur,
  onRenameStart,
  onRenameSubmit,
  onSetExcalidrawAPI,
  gridStep,
  onSetGridStep,
  onHistoryOpen,
  onToggleAutoHide,
  onToggleTheme,
}) => (
  <div
    className="h-screen flex flex-col bg-white dark:bg-neutral-950 overflow-hidden"
    onKeyDownCapture={(event) => {
      if (event.altKey && event.shiftKey && event.code === "KeyD") {
        event.preventDefault();
        event.stopPropagation();
        onToggleTheme();
      }
    }}
  >
    <header
      className={clsx(
        "h-16 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 flex items-center px-4 justify-between z-10 fixed top-0 left-0 right-0 transition-all duration-300",
        isHeaderVisible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onBackClick}
          disabled={isSavingOnLeave || resolving}
          className={`flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-wait transition-all duration-200 ${isSavingOnLeave ? "pr-4" : ""}`}
        >
          {isSavingOnLeave ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Saving changes...</span>
            </>
          ) : (
            <ArrowLeft size={20} />
          )}
        </button>
        {isRenaming ? (
          <form onSubmit={onRenameSubmit}>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              onBlur={onRenameBlur}
              className="font-medium text-gray-900 dark:text-white bg-transparent px-2 py-1 border-2 border-indigo-500 rounded-md outline-none min-w-[200px]"
              style={{ width: `${Math.max(200, newName.length * 9 + 20)}px` }}
            />
          </form>
        ) : (
          <h1
            className="font-medium text-gray-900 dark:text-white px-2 py-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded cursor-text"
            onDoubleClick={onRenameStart}
          >
            {drawingName}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-3">
        {canEdit && autosaveFailing ? (
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-800"
            title="Your recent changes could not be saved. Check your connection and try again."
            role="status"
          >
            <CloudOff size={14} />
            Unsaved changes
          </span>
        ) : null}
        {!canEdit ? (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
            Read-only
          </span>
        ) : null}
        {canEdit && id ? (
          <button
            ref={historyButtonRef}
            onClick={onHistoryOpen}
            className="ui-toolbar-button"
            title="Version History"
          >
            <History size={20} />
          </button>
        ) : null}
        <button
          onClick={onToggleAutoHide}
          className="ui-toolbar-button"
          title={autoHideEnabled ? "Disable auto-hide" : "Enable auto-hide"}
        >
          {autoHideEnabled ? (
            <ChevronUp size={20} />
          ) : (
            <ChevronDown size={20} />
          )}
        </button>
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
        <button
          onClick={onExportClick}
          className="ui-toolbar-button"
          title="Export drawing"
        >
          <Download size={20} />
        </button>
      </div>
    </header>
    <div
      ref={editorContainerRef}
      className="relative w-full flex-1"
      onDropCapture={(event) => {
        if (isHistoryOpen || resolving || isSavingOnLeave) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onCanvasDropCapture(event);
      }}
      style={{
        height: isHeaderVisible ? "calc(100vh - 4rem)" : "100vh",
        marginTop: isHeaderVisible ? "4rem" : "0",
      }}
    >
      {loadError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white dark:bg-neutral-950 px-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Unable to open drawing
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {loadError}
            </p>
          </div>
          <button onClick={onNavigateHome} className="ui-button-secondary px-4">
            Back to dashboard
          </button>
        </div>
      ) : initialData ? (
        <Excalidraw
          key={id}
          theme={theme === "dark" ? "dark" : "light"}
          langCode="en"
          initialData={initialData}
          onChange={onCanvasChange}
          onLibraryChange={onLibraryChange}
          excalidrawAPI={onSetExcalidrawAPI}
          UIOptions={UIOptions}
          validateEmbeddable={validateEmbeddableUrl}
          viewModeEnabled={
            !canEdit || isHistoryOpen || resolving || isSavingOnLeave
          }
        >
          <MainMenu>
            <MainMenu.Item onSelect={onToggleTheme} shortcut="Shift+Alt+D">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </MainMenu.Item>
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.Help />
            <MainMenu.Separator />
            <MainMenu.ItemCustom>
              <GridStepSelector gridStep={gridStep} onChange={onSetGridStep} />
            </MainMenu.ItemCustom>
          </MainMenu>
        </Excalidraw>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <span className="text-sm font-medium">
            {isSceneLoading ? "Loading drawing..." : "Preparing canvas..."}
          </span>
        </div>
      )}
      {historyPreview ? (
        <HistoryPreviewCanvas snapshot={historyPreview} theme={theme} />
      ) : null}
      <Toaster position="bottom-center" />
    </div>
  </div>
);
