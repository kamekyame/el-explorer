import { open } from "@tauri-apps/api/dialog";
import { sep } from "@tauri-apps/api/path";
import clsx from "clsx";
import KeyIcon from "flat-color-icons/svg/key.svg";
import { VsAdd, VsEdit, VsTrash } from "solid-icons/vs";
import { Component, createMemo, createSignal, For, JSX, Show } from "solid-js";

import { updateSongData } from "./Dir";
import { Item, Song, SongData, songKeys } from "../lib/types";

const parts = {
  partUk: { name: "上鍵盤", class: "bg-red-700 text-white" },
  partLk: { name: "下鍵盤", class: "bg-blue-700 text-white" },
  partPk: { name: "ペダル鍵盤", class: "bg-green-700 text-white" },
  partLead: { name: "リード", class: "bg-pink-700 text-white" },
  partKbp: {
    name: "キーボード\nパーカッション",
    class: "bg-cyan-700 text-white",
  },
  partCtrl: { name: "コントロール", class: "bg-gray-300 text-black" },
  partXg: { name: "XG", class: "bg-gray-300 text-black" },
} as const;

const SongPartButton: Component<{ item: Song; part: keyof typeof parts }> = (
  props
) => {
  const nowValue = createMemo(() => {
    return props.item.changed[props.part];
  });

  return (
    <div class={clsx("m-1 flex flex-col gap-1")}>
      <div
        class={clsx(
          "rounded-md bg-gray-200 text-center text-sm py-0 font-bold",
          nowValue() === "OFF" ? "text-gray-500" : "text-red-500"
        )}
      >
        {nowValue()}
      </div>
      <div
        class={clsx(
          "text-center text-sm font-bold rounded-md h-10",
          "flex flex-col items-center justify-center",
          parts[props.part].class
        )}
        onClick={() => {
          updateSongData(
            props.item,
            props.part,
            nowValue() === "OFF" ? "PLAY" : "OFF"
          );
        }}
      >
        <For each={parts[props.part].name.split("\n")}>
          {(line) => <span>{line}</span>}
        </For>
      </div>
    </div>
  );
};

const listKeys = [
  "songName",
  "folder",
  "model",
  "midfile",
  "blkfile001",
  "blkfile002",
  "blkfile003",
  "blkfile004",
  "blkfile005",
  "secfile",
] as const satisfies readonly (keyof SongData)[];
const editableKeys = [
  "songName",
] as const satisfies readonly typeof listKeys[number][];
type EditKey = typeof editableKeys[number];

const SongInfo: Component<{ item: Song }> = (props) => {
  const [refs, setRefs] = createSignal<Record<string, HTMLInputElement>>({});

  const song = () => ({ ...props.item.changed, songId: props.item.songId });

  const [editingKey, setEditingKey] = createSignal<EditKey>();

  const onValueChange: JSX.CustomEventHandlersCamelCase<HTMLInputElement>["onChange"] =
    (e) => {
      const key = editingKey();
      if (key === undefined) return;

      updateSongData(props.item, key, e.currentTarget.value);
      setEditingKey();
    };

  const onEditClick = (key: EditKey) => {
    setTimeout(() => refs()[key]?.focus(), 0); // setTimeoutがないと2回目以降のクリックでしかフォーカスが効かない
    setEditingKey(key);
  };

  const addMidfile = async () => {
    const result = await open({
      title: "MIDIファイルを選択",
      filters: [{ name: "MIDIファイル", extensions: ["mid"] }],
      multiple: false,
    });
    if (typeof result !== "string") return;
    // result = result.replaceAll("\\", "/");
    console.log(result);
    updateSongData(props.item, "midfile", result);
  };
  const deleteMidfile = async () => {
    updateSongData(props.item, "midfile", undefined);
  };

  return (
    <>
      <dl
        class={clsx(
          "[&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:p-2 [&>div]:px-4",
          "[&>*:nth-child(even)]:bg-gray-100",
          "[&_dt]:w-1/3 [&_dt]:shrink-0",
          "[&_dd]:w-2/3 [&_dd]:flex [&_dd]:items-center [&_dd]:gap-2",
          "[&_dd_input]:flex-grow [&_dd_input]:w-full [&_dd_input]:p-0.5 [&_dd_input]:bg-transparent [&_dd_input]:border [&_dd_input]:rounded [&_dd_input:enabled]:border-black [&_dd_input:disabled]:border-transparent"
        )}
      >
        <div>
          <dt>ID</dt>
          <dd>
            <input type="text" value={song().songId} disabled />
          </dd>
        </div>
        <div>
          <dt>{songKeys.songName.name}</dt>
          <dd>
            <input
              ref={(el) => setRefs((refs) => ({ ...refs, songName: el }))}
              type="text"
              value={song().songName ?? ""}
              placeholder="未指定"
              disabled={editingKey() !== "songName"}
              onChange={onValueChange}
              onBlur={() => setEditingKey()}
            />
            <VsEdit onClick={() => onEditClick("songName")} />
          </dd>
        </div>
        <div>
          <dt>{songKeys.folder.name}</dt>
          <dd>
            <input type="text" value={song().folder} disabled />
          </dd>
        </div>
        <div>
          <dt>{songKeys.model.name}</dt>
          <dd>
            <input
              type="text"
              value={song().model}
              placeholder="未指定"
              disabled
            />
          </dd>
        </div>
        <div>
          <dt>{songKeys.midfile.name}</dt>
          <dd>
            <input
              type="text"
              value={(song().midfile ?? sep).split(sep).at(-1)}
              placeholder="未指定"
              disabled
            />
            <VsAdd onClick={addMidfile} />
            <VsTrash onClick={deleteMidfile} />
          </dd>
        </div>
        <div>
          <dt>バンクデータ</dt>
          <dd>
            <div>
              <For
                each={[
                  song().blkfile001,
                  song().blkfile002,
                  song().blkfile003,
                  song().blkfile004,
                  song().blkfile005,
                ]}
              >
                {(blkfile) => (
                  <Show when={blkfile}>
                    <input type="text" value={blkfile} disabled />
                  </Show>
                )}
              </For>
            </div>
          </dd>
        </div>
        <div>
          <dt>{songKeys.secfile.name}</dt>
          <dd>
            <input
              type="text"
              value={song().secfile ?? ""}
              placeholder="未指定"
              disabled
            />
          </dd>
        </div>
      </dl>
      <div class="grid grid-cols-4 grid-rows-3 mt-2">
        <SongPartButton part="partUk" item={props.item} />
        <SongPartButton part="partLk" item={props.item} />
        <SongPartButton part="partPk" item={props.item} />
        <SongPartButton part="partXg" item={props.item} />
        <SongPartButton part="partLead" item={props.item} />
        <SongPartButton part="partKbp" item={props.item} />
        <SongPartButton part="partCtrl" item={props.item} />
      </div>
    </>
  );
};

const Info: Component<{ item: Item }> = (props) => {
  const security = () => {
    return props.item.type === "song" && props.item.original?.security === "ON";
  };
  return (
    <div>
      <div class={clsx("flex m-3 pb-1 gap-2 items-center", "border-b-2")}>
        <h1 class="flex-grow">{props.item.name}</h1>
        <Show when={security()}>
          <div class="shrink-0 w-6">
            <KeyIcon />
          </div>
        </Show>
      </div>
      {props.item.type === "song" && <SongInfo item={props.item} />}
    </div>
  );
};

export default Info;
