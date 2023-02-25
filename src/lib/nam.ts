import {
  copyFile,
  exists,
  readBinaryFile,
  removeFile,
  writeBinaryFile,
} from "@tauri-apps/api/fs";
import { basename, join } from "@tauri-apps/api/path";
import Encoding from "encoding-japanese";
import { batch } from "solid-js";

import { Folder, PartState, Song, SongData, songKeys } from "./types";
import { items, setItems, updateSongData } from "../components/Dir";

function checkPartState(s?: string): s is PartState {
  if (s === "OFF" || s === "PLAY") return true;
  else return false;
}

export async function readNamFile(namPath: string, parent: string) {
  const namBinary = await readBinaryFile(namPath);
  const text = new TextDecoder("shift-jis").decode(namBinary);
  return await readNam(text, parent);
}

export async function readNam(text: string, parentPath: string) {
  const songIds: Set<string> = new Set();
  const rawDatas: { songId: string; key: string; value: string }[] = [];

  for await (const line of text.split(/\r\n|\n/)) {
    const m = line.match(/^(.+):(.+)=(.+)$/);
    if (m === null) continue;
    const songId = m[1];
    const key = m[2].trim();
    const value = m[3].trim();
    // console.log(id, key, value);

    songIds.add(songId);
    rawDatas.push({ songId, key, value });
  }
  // console.log(parentPath, ids);
  console.log(parentPath, rawDatas);

  const datas: Song[] = [];
  const promises: Promise<void>[] = [];
  songIds.forEach((songId) => {
    const getValue = (key: string) => {
      return rawDatas.find((d) => d.songId === songId && d.key === key)?.value;
    };

    const func = async () => {
      const name = getValue("SONGNAME");
      if (name === undefined) return;

      const security = getValue("SECURITY");
      if (security !== "ON" && security !== "OFF") return;

      const folder = getValue("FOLDER");
      if (folder === undefined) return;
      const path = await join(parentPath, folder);

      const model = getValue("MODEL");
      if (model === undefined) return;

      const partUk = getValue("PART_UK");
      if (!checkPartState(partUk)) return;

      const partLk = getValue("PART_LK");
      if (!checkPartState(partLk)) return;

      const partPk = getValue("PART_PK");
      if (!checkPartState(partPk)) return;

      const partLead = getValue("PART_LEAD");
      if (!checkPartState(partLead)) return;

      const partKbp = getValue("PART_KBP");
      if (!checkPartState(partKbp)) return;

      const partCtrl = getValue("PART_CTRL");
      if (!checkPartState(partCtrl)) return;

      const partXg = getValue("PART_XG");
      if (partXg !== undefined && !checkPartState(partXg)) return;

      let midfile = getValue("MIDFILE");
      if (midfile !== undefined) {
        midfile = await join(path, midfile);
      }

      const blkfile001 = getValue("BLKFILE_001");
      if (blkfile001 === undefined) return;
      const blkfile002 = getValue("BLKFILE_002");
      const blkfile003 = getValue("BLKFILE_003");
      const blkfile004 = getValue("BLKFILE_004");
      const blkfile005 = getValue("BLKFILE_005");

      const secfile = getValue("SECFILE");

      const songData: SongData = {
        songName: name,
        folder,
        security,
        model,
        partUk,
        partLk,
        partPk,
        partLead,
        partKbp,
        partCtrl,
        partXg,
        midfile,
        blkfile001,
        blkfile002,
        blkfile003,
        blkfile004,
        blkfile005,
        secfile,
      };

      datas.push({
        type: "song",
        name,
        path,
        parentPath,
        songId,
        original: songData,
        changed: structuredClone(songData),
      });
    };
    promises.push(func());
  });
  await Promise.all(promises);
  return datas;
}

function createNamLine(id: string, key: string, value: string) {
  return `${id}:${key.padEnd(13)}= ${value}`;
}

export async function writeNamFile(folder: Folder) {
  // 行の形式↓
  // S001:SONGNAME     = AAAAAAAAAAAAAAAAA

  const path = folder.path + "/ELS_SONG.NAM";
  const songs =
    folder.childrenPath.flatMap((childPath) => {
      const child = items.find((item) => item.path === childPath);
      if (child === undefined) return [];
      if (child.type !== "song") return [];
      return child;
      // c.type === "song"
    }) ?? [];
  songs.sort((a, b) => a.songId.localeCompare(b.songId));

  const promises = songs.map(async (song) => {
    console.log(song);
    if (song.original.midfile !== song.changed.midfile) {
      if (song.original.midfile !== undefined) {
        if (await exists(song.original.midfile)) {
          await removeFile(song.original.midfile);
        }
      }
      if (song.changed.midfile !== undefined) {
        const fileName = await basename(song.changed.midfile, "");
        const toFileName = await join(song.path, fileName);
        await copyFile(song.changed.midfile, toFileName);
        updateSongData(song, "midfile", toFileName);
        // song.changed.midfile = toFileName;
      }
    }
  });
  await Promise.all(promises);

  // 変更点を反映
  batch(() => {
    songs.forEach((song) => {
      setItems(
        (children) => children.path === song.path,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "original" as any,
        song.changed
      );
    });
  });

  // バックアップファイルの作成
  await copyFile(path, path + ".backup");

  const line: string[] = [];
  for await (const song of songs) {
    // songs.forEach((song) => {
    for await (const [key_, value] of Object.entries(songKeys)) {
      // Object.entries(songKeys).forEach(([key_, value]) => {
      const key = key_ as keyof typeof songKeys;
      const keyStr = value.keyStr;
      let valueStr = song.changed[key];
      if (key === "midfile" && valueStr !== undefined) {
        valueStr = await basename(valueStr, "");
      }
      // console.log(song.songId, key, valueStr);
      if (valueStr === undefined) continue;
      line.push(createNamLine(song.songId, keyStr, valueStr));
    }
  }

  const text = line.join("\r\n");
  console.log(path);
  console.log(text);

  const unicodeArray = Encoding.stringToCode(text);
  const sjisArray = Encoding.convert(unicodeArray, "SJIS", "UNICODE");
  await writeBinaryFile(path, sjisArray);
}
