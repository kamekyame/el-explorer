import clsx from "clsx";
import {
  VsChevronRight,
  VsSave,
  VsLoading,
  VsCheck,
  VsError,
} from "solid-icons/vs";
import { createSignal, Match, Switch, For } from "solid-js";

import { items, getNowFolder } from "./Dir";
import { writeNamFile } from "../lib/nam";
import { SongData, songKeys } from "../lib/types";

export type ChangeLine = {
  songId: string;
  name: string;
  key: keyof SongData;
  v?: string;
  n?: string;
};

const ChangeDialog = () => {
  const [state, setState] = createSignal<"confim" | "saving" | "error" | "ok">(
    "confim"
  );

  const changes = () => {
    const changes = getNowFolder()?.childrenPath.flatMap((childPath) => {
      const item = items.find((item) => item.path === childPath);
      if (item?.type !== "song") return [];
      const changes: ChangeLine[] = [];
      Object.entries(songKeys).forEach(([key_]) => {
        const key = key_ as keyof SongData;
        const v = item.original[key];
        const n = item.changed[key];
        if (v === n) return;
        changes.push({
          songId: item.songId,
          name: item.original.songName,
          key,
          v,
          n,
        });
      });
      return [...changes];
    });
    return changes ?? [];
  };

  return (
    <div
      class="bg-white p-3 rounded flex flex-col gap-3"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Switch>
        <Match when={state() === "confim"}>
          <h1 class="m-1 font-bold">下記の変更点を書き込みますか？</h1>
          <table
            class={clsx(
              "table-auto [&_th]:p-2",
              "[&_td]:py-1 [&_td]:px-2",
              "[&>*:nth-child(even)]:bg-gray-100"
            )}
          >
            <thead>
              <tr class="border-b border-black divide-x">
                <th>ID</th>
                <th>ソング名</th>
                <th>項目</th>
                <th>変更前</th>
                <th />
                <th>変更後</th>
              </tr>
            </thead>
            <For each={changes()}>
              {(item) => {
                return (
                  <tr class="divide-x">
                    <td class="text-center">{item.songId}</td>
                    <td class="text-left">{item.name}</td>
                    <td class="text-center">{songKeys[item.key].name}</td>
                    <td class="text-center">{item.v}</td>
                    <td class="text-center">
                      <VsChevronRight />
                    </td>
                    <td class="text-center text-red-500 font-bold">{item.n}</td>
                  </tr>
                );
              }}
            </For>
          </table>
          <div class="flex flex-row-reverse">
            <button
              class="bg-red-700 text-white py-1 px-2 mx-2 rounded flex gap-1 items-center"
              onClick={async () => {
                setState("saving");

                try {
                  // 書き込み
                  const folder = getNowFolder();
                  if (folder) {
                    await writeNamFile(folder);
                    setState("ok");
                  } else {
                    setState("error");
                  }
                } catch (e) {
                  setState("error");
                  console.error(e);
                }
              }}
            >
              <VsSave />
              書き込む
            </button>
          </div>
        </Match>
        <Match when={state() === "saving"}>
          <div class="flex justify-center">
            <div class="animate-spin text-blue-500">
              <VsLoading size="30px" />
            </div>
          </div>
          <h1 class="font-bold">書き込み中...</h1>
        </Match>
        <Match when={state() === "ok"}>
          <div class="flex justify-center">
            <div class="text-green-500">
              <VsCheck size="30px" />
            </div>
          </div>
          <h1 class="m-1 font-bold">書き込み完了</h1>
        </Match>
        <Match when={state() === "error"}>
          <div class="flex justify-center">
            <div class="text-red-500">
              <VsError size="30px" />
            </div>
          </div>
          <h1 class="m-1 font-bold">書き込み失敗</h1>
        </Match>
      </Switch>
    </div>
  );
};
export default ChangeDialog;
