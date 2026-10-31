export type DraftScope = {
  service: string;
  account: string;
  drawingId: string;
  pageId: string;
};

export type DrawingDraft = DraftScope & {
  formatVersion: 1;
  baseVersion: number | null;
  revision: number;
  updatedAt: number;
  elements: readonly any[];
  appState: Record<string, any>;
  files: Record<string, any>;
};

const key = (scope: DraftScope) => [
  scope.service,
  scope.account,
  scope.drawingId,
  scope.pageId,
];

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("excalidash-drafts", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("drafts", {
        keyPath: ["service", "account", "drawingId", "pageId"],
      });
      store.createIndex("drawing", ["service", "account", "drawingId"]);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Draft storage is blocked"));
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new Error("Draft transaction failed"));
  });

export const writeDraft = async (draft: DrawingDraft): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction("drafts", "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore("drafts");
    const request = store.get(key(draft));
    request.onsuccess = () => {
      if (!request.result || request.result.revision <= draft.revision) {
        store.put(draft);
      }
    };
    await done;
  } finally {
    database.close();
  }
};

export const listDrafts = async (
  scope: Omit<DraftScope, "pageId">,
): Promise<DrawingDraft[]> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction("drafts", "readonly");
    const done = transactionDone(transaction);
    const request = transaction
      .objectStore("drafts")
      .index("drawing")
      .getAll([scope.service, scope.account, scope.drawingId]);
    await done;
    return (request.result as DrawingDraft[])
      .filter((draft) => draft.formatVersion === 1)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    database.close();
  }
};

export const clearConfirmedDraft = async (
  scope: DraftScope,
  confirmedRevision: number,
): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction("drafts", "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore("drafts");
    const request = store.get(key(scope));
    request.onsuccess = () => {
      if (request.result && request.result.revision <= confirmedRevision) {
        store.delete(key(scope));
      }
    };
    await done;
  } finally {
    database.close();
  }
};
