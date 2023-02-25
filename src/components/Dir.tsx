import { message } from "@tauri-apps/api/dialog";
import {
  readDir,
  copyFile,
  createDir,
  removeDir,
  removeFile,
} from "@tauri-apps/api/fs";
import { join, basename, sep, publicDir } from "@tauri-apps/api/path";
import { minimatch } from "minimatch";
import { batch, createSignal } from "solid-js";
import { createStore, unwrap } from "solid-js/store";

import { readNamFile, writeNamFile } from "../lib/nam";
import { Folder, Item, Song, SongData, File } from "../lib/types";

/** 除外ファイル(globパターン) */
const exclusionFiles = [
  "ELS_SONG.NAM",
  "*.C02",
  "System Volume Information",
  ".*",
];

export const [items, setItems] = createStore<Item[]>([]);
export const [nowFolderPath, _setNowFolderPath] = createSignal<string>();
export const [selectedItem, setSelectedItem] = createSignal<Item>();
export const [copyItem, setCopyItem] = createSignal<{
  type: "copy" | "cut";
  item: Item;
}>();
export const [editingItemPath, setEditingItemPath] = createSignal<string>();

/** 指定したフォルダを開く */
export async function setNowFolder(path: string) {
  console.info("Load folder", path);
  try {
    await readFolder(path);
  } catch (e) {
    console.error(e);
  }

  _setNowFolderPath(path);

  // ツリーの要素をオープン
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItems((children) => children.path === path, "opened" as any, true);
}

/** ソングデータの更新 */
export function updateSongData<T extends keyof SongData>(
  song_: Song,
  key: T,
  value: SongData[T]
) {
  batch(() => {
    const index = items.findIndex(
      (item) => item.path === song_.path && item.type === "song"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItems([index], "changed" as any, key, value);

    // ソング名の変更時はnameも変更
    if (key === "songName" && value !== undefined) {
      setItems([index], "name", value);
    }
  });
}

/** ツリーオープン・クローズ切替 */
export async function toggleTree(path: string) {
  let opened;

  setItems(
    (item) => item.path === path,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "opened" as any,
    (v) => {
      opened = !v;
      return opened;
    }
  );

  if (opened) {
    console.log("load", path);
    try {
      await readFolder(path);
    } catch (e) {
      console.error(e);
    }
  }
}

function getDuplicationName(name_: string, exists: string[]) {
  let returnName = name_;
  while (exists.includes(returnName)) {
    const m = returnName.match(/(.*)(\d{3})$/);
    if (m) {
      // 同名ファイルのカウントされたファイルが存在していたら、カウントを+1する
      const [, name, nStr] = m;
      const n = Number(nStr) + 1;
      returnName = `${name}${String(n).padStart(3, "0")}`;
    } else {
      // 同名ファイルが存在していたら、末尾に_001を付ける
      returnName = `${returnName}_001`;
    }
  }
  return returnName;
}

async function copyDir(from: string, to: string) {
  const children = await readDir(from);
  console.log("createDir", to);
  createDir(to, { recursive: true });
  for (const child of children) {
    const fromPath = `${from}/${child.name}`;
    const toPath = `${to}/${child.name}`;
    console.log("copy", fromPath, toPath);
    if (child.children) {
      await copyDir(fromPath, toPath);
    } else {
      await copyFile(fromPath, toPath);
    }
  }
}

export async function createPreFolder() {
  const nowFolder = getNowFolder();
  if (nowFolder === undefined) return;
  const folderName = getDuplicationName(
    "新しいフォルダ",
    await getItemNames(nowFolder)
  );
  const newFolder: Folder = {
    type: "folder",
    name: folderName,
    path: await join(nowFolder.path, folderName),
    parentPath: nowFolder.path,
    opened: false,
    childrenPath: ["aaa"],
  };
  console.log(nowFolder, "newFolder", newFolder);
  batch(() => {
    setItems(
      (item) => item.path === nowFolder.path,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "childrenPath" as any,
      (childrenPath) => [...childrenPath, newFolder.path]
    );
    setItems([...items, newFolder]);
    setEditingItemPath(newFolder.path);
  });
  console.log(items);
}

export async function createFolder(prePath: string, newName: string) {
  const newPath = await join(prePath, "..", newName);
  const preItem = items.find((item) => item.path === prePath);
  const parent = items.find((item) => item.path === preItem?.parentPath);
  if (parent === undefined || parent.type !== "folder") return;
  console.log(preItem);
  console.log(prePath, newPath, newName);
  // console.log(parent.childrenPath.filter((path) => path !== prePath));

  try {
    await createDir(newPath);
    setItems((item) => item.path === prePath, "name", newName);
    setItems((item) => item.path === prePath, "path", newPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItems((item) => item.path === parent.path, "childrenPath" as any, [
      ...parent.childrenPath.filter((path) => path !== prePath),
      newPath,
    ]);
    console.log(items);
  } catch (e) {
    console.error(e);
    message("フォルダの作成に失敗しました", { type: "error" });
    setItems(items.filter((item) => item.path !== newPath));
  }
}

export async function remove(removeItem: Item) {
  const parent = items.find((item) => item.path === removeItem.parentPath);
  if (parent === undefined || parent.type !== "folder") return;

  if (removeItem.type === "folder") {
    await removeDir(removeItem.path);
  } else if (removeItem.type === "file") {
    await removeFile(removeItem.path);
  } else if (removeItem.type === "song") {
    await removeDir(removeItem.path, { recursive: true });
    setItems(
      items.filter((item) => {
        if (item.path === removeItem.path) return false;
        else return true;
      })
    );
    await writeNamFile(parent);
  }
  await readFolder(parent.path);
  setSelectedItem();
}

export function getNowFolder() {
  const item = items.find((item) => item.path === nowFolderPath());
  if (item?.type === "folder") return item;
}

export async function copy() {
  const copyitem = copyItem();
  if (copyitem === undefined) return;
  const type = copyitem.type;
  const from = copyitem.item;
  const fromParent = items.find((item) => item.path === from.parentPath);
  console.log(from, fromParent);
  if (fromParent?.type !== "folder") return;

  const to = getNowFolder();
  console.log("from ", from, "to", to);
  if (to === undefined) return;
  const isSameFolder = to.childrenPath.includes(from.path);

  // 移動元と移動先が同じフォルダだったら無視
  if (type === "cut" && isSameFolder) {
    console.log("move to same folder.");
    return;
  }

  if (from.type === "song") {
    const toSongs = to.childrenPath.flatMap((childPath) => {
      const child = items.find((item) => item.path === childPath);
      if (child?.type === "song") return [child];
      return [];
    });
    const existSongNames = toSongs.map((song) => song.name);
    const songName = getDuplicationName(from.name, existSongNames);

    const existSongFolderNames = await getItemNames(to);
    const folderName = getDuplicationName("SONG_001", existSongFolderNames);

    const existSongIds = toSongs.map((song) => song.songId);
    const newId = getDuplicationName("S001", existSongIds);
    console.log(existSongFolderNames);
    console.log(
      "final songname",
      songName,
      "foldername",
      folderName,
      "new id",
      newId
    );

    const songData = structuredClone(unwrap(from.original));
    songData.songName = songName;
    songData.folder = folderName;

    const newSong: Song = {
      type: "song",
      name: songName,
      path: `${to.path}/${folderName}`,
      songId: newId,
      original: songData,
      changed: structuredClone(songData),
      parentPath: to.path,
    };
    setItems([...items, newSong]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItems((children) => children.path === to.path, "childrenPath" as any, [
      ...to.childrenPath,
      newSong.path,
    ]);

    console.log("copy song", from.path, newSong.path);
    copyDir(from.path, newSong.path);

    // 削除する場合にはコピーしてから
    if (type === "cut") {
      const deletedItem = items.filter((item) => item.path !== from.path);
      setItems(deletedItem);

      const deletedChildrenId = fromParent.childrenPath.filter(
        (childPath) => childPath !== from.path
      );
      setItems(
        (item) => item.path === fromParent.path,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "childrenPath" as any,
        deletedChildrenId
      );

      await removeDir(from.path, { recursive: true });
    }

    await writeNamFile(fromParent);
    if (fromParent.path !== to.path) {
      await writeNamFile(to);
    }
  } else if (from.type === "folder") {
    const names = await getItemNames(to);
    console.log(names);
    const folderName = getDuplicationName(from.name, names);

    await copyDir(from.path, `${to.path}/${folderName}`);
    if (type === "cut") {
      await removeDir(from.path, { recursive: true });
    }
  } else if (from.type === "file") {
    const names = await getItemNames(to);
    const fileName = getDuplicationName(from.name, names);

    await copyFile(from.path, `${to.path}/${fileName}`);
    if (type === "cut") {
      await removeFile(from.path);
    }
  }

  setCopyItem(undefined);
  await readFolder(fromParent.path);
  await readFolder(to.path);
}

async function getItemNames(folder: Folder) {
  const children = await readDir(folder.path);
  return children.flatMap((child) => {
    if (child.name) return [child.name];
    return [];
  });
}

/** フォルダの子要素を読み込み */
export async function readFolder(parentPath: string) {
  const entries = await readDir(parentPath);

  const namFile = entries.find((entry) => entry.name === "ELS_SONG.NAM");
  // console.log("namFile path", namFile?.path);
  const songs = namFile ? await readNamFile(namFile.path, parentPath) : [];

  const folderFiles: (Folder | File)[] = entries.flatMap((entry) => {
    const { name, children, path } = entry;
    if (!name) return []; // nameがないものは無視

    // nameがないものや構成ファイル、C02ファイル、OS固有のファイルは無視
    for (const exclusionFile of exclusionFiles) {
      if (minimatch(name, exclusionFile)) return [];
    }

    // Songの対象フォルダだったら無視
    if (songs.some((song) => song.path === path)) return [];

    let item: Folder | File;
    if (children) {
      // childrenがあるものはFolder

      const oldFolder = items.find(
        (item): item is Folder => item.type === "folder" && item.path === path
      );
      const childrenPath = oldFolder?.childrenPath;
      item = {
        type: "folder",
        name: name,
        path,
        childrenPath: childrenPath ?? [],
        parentPath: parentPath,
        opened: false,
      };
    } else {
      // childrenがないものはFile
      item = {
        type: "file",
        name,
        path,
        parentPath: parentPath,
      };
    }
    return [item];
  });

  const addItem = [...folderFiles, ...songs];

  const promises = items.map(async (item) => {
    if (item.path === parentPath) return item;
    if ((await join(item.path, "..")) === parentPath) return;
    return item;
  });
  const deletedItems = (await Promise.all(promises)).filter(
    (item): item is Item => Boolean(item)
  );

  batch(() => {
    setItems([...deletedItems, ...addItem]);
    setItems(
      (item) => item.path === parentPath,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "childrenPath" as any,
      addItem.map((item) => item.path)
    );
  });
}

export async function changeBaseFolder(baseFolderPath: string) {
  let name = baseFolderPath.split(sep)[0];
  try {
    name = await basename(baseFolderPath, "");
  } catch {
    //
  }
  const root: Folder = {
    type: "folder",
    name,
    path: baseFolderPath,
    childrenPath: [],
    opened: true,
  };
  setItems([root]);
  setNowFolder(root.path);
}

export function itemsSortFunc(
  a: Song | File | Folder,
  b: Song | File | Folder
) {
  if (a.type === "folder" && b.type !== "folder") return -1;
  if (a.type !== "folder" && b.type === "folder") return 1;
  return a.name.localeCompare(b.name);
}
