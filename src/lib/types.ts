export const songKeys = {
  songName: {
    name: "ソング名",
    keyStr: "SONGNAME",
    required: true,
  },
  folder: {
    name: "フォルダ名",
    keyStr: "FOLDER",
    required: true,
  },
  security: {
    name: "保護状態",
    keyStr: "SECURITY",
    required: true,
    enum: ["ON", "OFF"],
  },
  model: {
    name: "モデル名",
    keyStr: "MODEL",
    required: true,
  },
  partUk: {
    name: "上鍵盤",
    keyStr: "PART_UK",
    required: true,
    enum: ["OFF", "PLAY"],
  },
  partLk: {
    name: "下鍵盤",
    keyStr: "PART_LK",
    required: true,
    enum: ["OFF", "PLAY"],
  },
  partPk: {
    name: "ペダル鍵盤",
    keyStr: "PART_PK",
    required: true,
    enum: ["OFF", "PLAY"],
  },
  partLead: {
    name: "リード",
    keyStr: "PART_LEAD",
    required: true,
    enum: ["OFF", "PLAY"],
  },
  partKbp: {
    name: "キーボードパーカッション",
    keyStr: "PART_KBP",
    required: true,
    enum: ["OFF", "PLAY"],
  },
  partCtrl: {
    name: "コントロール",
    keyStr: "PART_CTRL",
    required: true,
    enum: ["OFF", "PLAY"],
  },
  partXg: {
    name: "XG",
    keyStr: "PART_XG",
    required: false,
    enum: ["OFF", "PLAY"],
  },
  midfile: {
    name: "MIDIファイル名",

    keyStr: "MIDFILE",
    required: false,
  },
  blkfile001: {
    name: "バンクデータ1",
    keyStr: "BLKFILE_001",
    required: true,
  },
  blkfile002: {
    name: "バンクデータ2",
    keyStr: "BLKFILE_002",
    required: false,
  },
  blkfile003: {
    name: "バンクデータ3",
    keyStr: "BLKFILE_003",
    required: false,
  },
  blkfile004: {
    name: "バンクデータ4",
    keyStr: "BLKFILE_004",
    required: false,
  },
  blkfile005: {
    name: "バンクデータ5",
    keyStr: "BLKFILE_005",
    required: false,
  },
  secfile: {
    name: "セキュリティファイル名",
    keyStr: "SECFILE",
    required: false,
  },
} as const satisfies {
  [key: string]: {
    name: string;
    keyStr: string;
    required: boolean;
    enum?: readonly string[];
  };
};

export type SongData = {
  -readonly [key in keyof typeof songKeys]:
    | (typeof songKeys[key] extends { enum: readonly string[] }
      ? (typeof songKeys[key]["enum"][number])
      : string)
    | (typeof songKeys[key] extends { required: true } ? never : undefined);
};

export type PartState = "OFF" | "PLAY";

export type Item = File | Folder | Song;
export type Items = Item[];
type ItemBase = {
  name: string;
  /**
   * `folder` : フォルダパス、
   * `file` : ファイルパス<br>、
   * `song` : ソング情報の入ったフォルダパス */
  path: string;
  parentPath?: string;
};
export type File = ItemBase & {
  type: "file";
};
export type Folder = ItemBase & {
  type: "folder";
  opened: boolean;
  childrenPath: string[];
};
export type Song = ItemBase & {
  type: "song";
  songId: string;
  original: SongData;
  changed: SongData;
};
