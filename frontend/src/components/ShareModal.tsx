import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Link as LinkIcon,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";
import * as api from "../api";
import { GeneralAccessSection } from "./share-modal/GeneralAccessSection";
import {
  calculateExpiresAt,
  DEFAULT_EDIT_EXPIRY_OPTION,
  toDatetimeLocalFromIso,
} from "./share-modal/shareUtils";

type Props = {
  anchorRef: React.RefObject<HTMLElement>;
  drawingId: string;
  drawingName: string;
  isOpen: boolean;
  onClose: () => void;
};

export const ShareModal: React.FC<Props> = ({
  drawingId,
  isOpen,
  onClose,
  anchorRef,
}) => {
  const [position, setPosition] = useState({ right: 12, top: 72 });
  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        right: Math.max(
          12,
          Math.min(window.innerWidth - rect.right, window.innerWidth - 472),
        ),
        top: rect.bottom + 8,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [anchorRef, isOpen]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<{
    linkShares: api.DrawingLinkShareRow[];
  } | null>(null);

  const [linkPermission, setLinkPermission] = useState<"view" | "edit">("view");
  const [expiryOption, setExpiryOption] = useState("1h");
  const [customExpiry, setCustomExpiry] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareableEditorUrl = `${origin}/shared/${drawingId}`;

  const activeLink = useMemo(() => {
    const now = Date.now();
    return (
      (sharing?.linkShares || []).find((s) => {
        if (s.revokedAt) return false;
        if (!s.expiresAt) return true;
        const ts = Date.parse(String(s.expiresAt));
        if (!Number.isFinite(ts)) return false;
        return ts > now;
      }) || null
    );
  }, [sharing]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activeLink) return;
    setLinkPermission(activeLink.permission);
    if (activeLink.expiresAt) {
      setExpiryOption("custom");
      setCustomExpiry(toDatetimeLocalFromIso(activeLink.expiresAt));
    } else {
      setExpiryOption("never");
      setCustomExpiry("");
    }
  }, [activeLink, isOpen]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDrawingSharing(drawingId);
      setSharing(data);
    } catch (err: unknown) {
      let message = "Failed to load sharing settings";
      if (api.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data?.message === "string"
            ? err.response.data.message
            : null;
        if (serverMessage) message = serverMessage;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [drawingId]);

  useEffect(() => {
    if (!isOpen) return;
    setLinkPermission("view");
    setExpiryOption("1h");
    setCustomExpiry("");
    setIsCopied(false);
    void refresh();
  }, [isOpen, refresh]);

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; sharing still works via visible link text.
    }
  };

  const handleUpdateLink = async (
    newPermission?: "view" | "edit",
    newExpiry?: string | null,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const perm = newPermission ?? linkPermission;
      setLinkPermission(perm);
      let expiresAt =
        newExpiry !== undefined
          ? newExpiry
          : calculateExpiresAt(expiryOption, customExpiry);
      if (perm === "edit" && expiresAt === null) {
        expiresAt = calculateExpiresAt(DEFAULT_EDIT_EXPIRY_OPTION);
        setExpiryOption(DEFAULT_EDIT_EXPIRY_OPTION);
      }
      await api.createLinkShare(drawingId, { permission: perm, expiresAt });
      await refresh();
      void handleCopy(shareableEditorUrl);
    } catch (err: unknown) {
      let message = "Failed to update link";
      if (api.isAxiosError(err)) {
        const serverMessage =
          typeof err.response?.data?.message === "string"
            ? err.response.data.message
            : null;
        if (serverMessage) message = serverMessage;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!activeLink) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.revokeLinkShare(drawingId, activeLink.id);
      await refresh();
    } catch {
      setError("Failed to revoke link");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  const currentLinkUrl = activeLink ? shareableEditorUrl : "";

  return createPortal(
    <>
      {/* Click-outside backdrop (completely transparent, no blur) */}
      <div
        className="fixed inset-0 z-[150] bg-transparent cursor-default"
        onClick={onClose}
      />

      {/* The popover container positioned under the share button */}
      <div
        style={position}
        role="dialog"
        aria-label="Share drawing"
        className="fixed z-[160] flex max-h-[calc(100dvh-5rem)] w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border-2 border-slate-800 bg-white font-sans shadow-[3px_3px_0px_0px_rgba(30,41,59,0.9)] animate-in fade-in slide-in-from-top-3 duration-200 dark:border-neutral-600 dark:bg-neutral-900 dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.18)]"
      >
        {/* Content */}
        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertTriangle size={16} strokeWidth={2} />
              {error}
            </div>
          )}

          <GeneralAccessSection
            activeLink={activeLink}
            linkPermission={linkPermission}
            expiryOption={expiryOption}
            customExpiry={customExpiry}
            setLinkPermission={setLinkPermission}
            setExpiryOption={setExpiryOption}
            setCustomExpiry={setCustomExpiry}
            handleUpdateLink={handleUpdateLink}
            handleRevokeLink={handleRevokeLink}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t-2 border-slate-100 px-4 py-3 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/50">
          <button
            onClick={() => handleCopy(currentLinkUrl)}
            disabled={!activeLink}
            className={clsx(
              "w-full py-2.5",
              isCopied ? "ui-button-success" : "ui-button-secondary",
              !activeLink && "cursor-not-allowed opacity-40 shadow-none",
            )}
          >
            {isCopied ? (
              <Check size={14} strokeWidth={2.5} />
            ) : (
              <LinkIcon size={14} strokeWidth={2.5} />
            )}
            {isCopied ? "Copied Link!" : "Copy Link"}
          </button>
        </div>

        {isLoading && (
          <div
            className="absolute inset-0 bg-white/20 dark:bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-[300] pointer-events-none rounded-[14px]"
            role="status"
            aria-label="Updating sharing settings"
          >
            <div className="ui-popover p-4">
              <RefreshCw
                size={24}
                strokeWidth={2.5}
                className="animate-spin text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};
