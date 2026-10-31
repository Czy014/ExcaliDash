const messages = {
  en: {
    "sidebar.library": "Library",
    "sidebar.allDrawings": "All Drawings",
    "sidebar.unorganized": "Unorganized",
    "sidebar.collections": "Collections",
    "sidebar.newCollection": "New Collection",
    "sidebar.newCollectionPlaceholder": "New Collection...",
    "sidebar.deleteCollection": "Delete Collection",
    "sidebar.deleteCollectionMessage":
      "Are you sure you want to delete this collection? All drawings inside will be moved to Unorganized.",
    "sidebar.trash": "Trash",
    "sidebar.workspace": "Workspace",
    "sidebar.workspaceMenu": "Workspace menu",
    "sidebar.settings": "Settings",
    "settings.language": "Language",
  },
  "zh-CN": {
    "sidebar.library": "资料库",
    "sidebar.allDrawings": "全部绘图",
    "sidebar.unorganized": "未整理",
    "sidebar.collections": "集合",
    "sidebar.newCollection": "新建集合",
    "sidebar.newCollectionPlaceholder": "新建集合…",
    "sidebar.deleteCollection": "删除集合",
    "sidebar.deleteCollectionMessage":
      "确定要删除此集合吗？其中的所有绘图都将移至未整理。",
    "sidebar.trash": "回收站",
    "sidebar.workspace": "工作区",
    "sidebar.workspaceMenu": "工作区菜单",
    "sidebar.settings": "设置",
    "settings.language": "语言",
  },
} as const;

export type Locale = keyof typeof messages;
export type TranslationKey = keyof (typeof messages)["en"];

export const resolveLocale = (value: string | null | undefined): Locale =>
  value?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";

export const translate = (locale: Locale, key: TranslationKey): string =>
  messages[locale][key] ?? messages.en[key];
