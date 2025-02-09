import { message, ask } from "@tauri-apps/api/dialog";
import { join } from "@tauri-apps/api/path";
import clsx from "clsx";
import FolderIcon from "flat-color-icons/svg/folder.svg";
import KeyIcon from "flat-color-icons/svg/key.svg";
import MusicIcon from "flat-color-icons/svg/music.svg";
import { BiRegularCut, BiRegularCopy, BiRegularPaste } from "solid-icons/bi";
import { TbFileOff, TbFile } from "solid-icons/tb";
import {
  VsArrowUp,
  VsChevronRight,
  VsSave,
  VsChevronDown,
  VsTrash,
  VsNewFolder,
  VsRefresh,
  VsClose,
} from "solid-icons/vs";
import {
  Component,
  createEffect,
  createSignal,
  createMemo,
  Show,
  For,
  createResource,
  Match,
  Switch,
  batch,
  onMount,
} from "solid-js";

import {
  items,
  changeBaseFolder,
  nowFolderPath,
  selectedItem,
  setSelectedItem,
  toggleTree,
  setCopyItem,
  copyItem,
  copy,
  setNowFolder,
  itemsSortFunc,
  remove,
  getNowFolder,
  editingItemPath,
  createPreFolder,
  setEditingItemPath,
  createFolder,
  setItems,
  getItemKey,
} from "./components/Dir";
import HeaderIcon from "./components/HeaderIcon";
import Info from "./components/Info";
import SaveDialog from "./components/SaveDialog";
import { SongData, Folder, Item } from "./lib/types";

const [isDisplayFile, setIsDisplayFile] = createSignal(false);

type Tree = {
  path: string;
  folderName: string;
  opened: boolean;
  children: Tree[];
};

function createTree(folder: Folder) {
  const tree: Tree = {
    path: folder.path,
    folderName: folder.name,
    children: [],
    opened: folder.opened,
  };
  const children: Tree[] = [];
  if (folder.opened) {
    folder.childrenPath.forEach((childPath) => {
      const child = items.find((item) => item.path === childPath);
      if (child?.type === "folder") {
        children.push(createTree(child));
      }
    });
  }
  tree.children = children;
  return tree;
}

const Tree: Component<{
  tree: Tree;
  entryFunc: (path: string) => Promise<void>;
}> = (props) => {
  return (
    <div>
      <div
        class={clsx(
          "flex items-center gap-1 text-sm p-0.5 rounded w-max",
          "hover:bg-gray-200 ",
          nowFolderPath() === props.tree.path && "bg-orange-200"
        )}
        onClick={() => {
          props.entryFunc(props.tree.path);
        }}
      >
        <div
          class="w-3.5 h-3.5"
          onClick={(e) => {
            e.stopPropagation();
            toggleTree(props.tree.path);
          }}
        >
          <Switch>
            <Match when={props.tree.opened}>
              <VsChevronDown />
            </Match>
            <Match when={!props.tree.opened}>
              <VsChevronRight />
            </Match>
          </Switch>
        </div>
        <div class="w-5 h-5">
          <FolderIcon />
        </div>
        <div class="px-1">{props.tree.folderName}</div>
      </div>
      <div class="ml-2">
        <For each={props.tree.children}>
          {(child) => <Tree tree={child} entryFunc={props.entryFunc} />}
        </For>
      </div>
    </div>
  );
};

const List: Component<{ path: string }> = (props) => {
  createEffect(() => {
    changeBaseFolder(props.path);
  });
  const [isSaveDialog, setIsSaveDialog] = createSignal(false);

  const [breadcrumbs] = createResource(nowFolderPath, async () => {
    let path = nowFolderPath()?.replaceAll(/\/|\\/g, "/");
    if (path?.endsWith("/")) path = path.slice(0, -1);
    const list = path?.split("/");
    return list ?? [];
  });

  /** nowFolderPathが変更されたらリストの子要素も更新される */
  const children = createMemo(() => {
    const children_ = getNowFolder()?.childrenPath.flatMap((childPath) => {
      const child = items.find((item) => getItemKey(item) === childPath);
      if (child === undefined) return [];
      if (child.type === "file" && isDisplayFile() === false) return [];
      return [child];
    });
    children_?.sort(itemsSortFunc);
    return children_;
  });

  const changed = createMemo(() => {
    for (const item of children() ?? []) {
      if (item.type !== "song") continue;
      for (const [key, originalValue] of Object.entries(item.original)) {
        if (item.changed[key as keyof SongData] !== originalValue) {
          return true;
        }
      }
    }
    return false;
  });

  const tree = createMemo(() => {
    if (items[0] === undefined || items[0].type !== "folder") return;
    return createTree(items[0]);
  });

  const showUnSavedDialog = () => {
    message("保存されていない変更があります。", { type: "warning" });
  };

  createEffect(() => {
    const paths: string[] = [];
    items.forEach((item) => {
      if (paths.includes(item.path)) {
        console.error("duplicate path: " + item.path);
      } else {
        paths.push(item.path);
      }
    });
  });

  /** フォルダに入る */
  const entry = async (path: string) => {
    if (changed()) {
      showUnSavedDialog();
      return;
    }
    batch(async () => {
      // 選択解除
      setSelectedItem(undefined);

      // 引数のフォルダを現在のフォルダに設定
      setNowFolder(path);
    });
  };

  /** 上の階層に */
  const up = async () => {
    if (changed()) {
      showUnSavedDialog();
      return;
    }
    // 選択解除
    setSelectedItem(undefined);

    // 親フォルダを現在のフォルダに設定
    const nowFolder = getNowFolder();
    if (nowFolder?.parentPath === undefined) return;
    setNowFolder(nowFolder.parentPath);
  };

  const deleteItem = async () => {
    if (changed()) {
      message(
        "変更を保留中のソングがあります。\n変更を保存または破棄してから削除の操作を行ってください。",
        { type: "error" }
      );
    } else {
      const selected = selectedItem();
      if (selected === undefined) return;

      const ok = await ask(
        `${selected.type}: ${selected.name}を削除します。\n変更は元に戻せません。よろしいですか？`,
        { type: "warning" }
      );
      if (ok) {
        remove(selected);
      }
    }
  };

  const paste = () => {
    if (changed()) {
      message(
        "変更を保留中のソングがあります。\n変更を保存または破棄してから貼り付けてください。",
        { type: "error" }
      );
    } else {
      copy();
    }
  };

  const discardChanges = () => {
    children()?.forEach((child) => {
      if (child.type !== "song") return;
      setItems(
        (item) => item.path === child.path,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "changed" as any,
        child.original
      );
    });
  };

  return (
    <div class="grid grid-rows-[max-content_max-content_minmax(0,1fr)] h-full select-none">
      <div class="flex flex-row items-center gap-2 m-1">
        <HeaderIcon
          icon={VsArrowUp}
          enable={getNowFolder()?.parentPath !== undefined}
          onClick={up}
          title="上のフォルダへ"
        />
        <div class="h-full my-1 border border-gray-500" />
        <HeaderIcon
          icon={VsSave}
          enable={changed()}
          onClick={() => {
            setIsSaveDialog(true);
          }}
          title="変更を保存"
        />
        <HeaderIcon
          icon={VsClose}
          enable={changed()}
          onClick={discardChanges}
          title="変更を破棄"
        />
        <div class="h-full my-1 border border-gray-500" />
        <HeaderIcon
          icon={VsRefresh}
          onClick={() => {
            const path = nowFolderPath();
            if (path === undefined) return;
            setNowFolder(path);
          }}
          title="再読み込み"
        />

        <div class="h-full my-1 border border-gray-500" />
        <HeaderIcon
          icon={BiRegularCut}
          enable={Boolean(selectedItem())}
          onClick={() => {
            const item = selectedItem();
            if (item === undefined) return;
            if (item.type === "song" && item.original.security === "ON") {
              message("セキュリティが設定されている曲は切り取りできません。", {
                type: "error",
              });
              return;
            }
            setCopyItem({ type: "cut", item });
          }}
          title={"切り取り"}
        />
        <HeaderIcon
          icon={BiRegularCopy}
          enable={Boolean(selectedItem())}
          onClick={() => {
            const item = selectedItem();
            if (item === undefined) return;
            if (item.type === "song" && item.original.security === "ON") {
              message("セキュリティが設定されている曲はコピーできません。", {
                type: "error",
              });
              return;
            }
            setCopyItem({ type: "copy", item });
          }}
          title={"コピー"}
        />
        <HeaderIcon
          icon={BiRegularPaste}
          enable={Boolean(copyItem())}
          onClick={paste}
          title={"貼り付け"}
        />
        <div class="h-full my-1 border border-gray-500" />
        <HeaderIcon
          icon={VsNewFolder}
          onClick={() => {
            createPreFolder();
          }}
          title="新しいフォルダ"
        />
        <HeaderIcon
          icon={VsTrash}
          enable={Boolean(selectedItem())}
          onClick={deleteItem}
          title="削除"
        />
        <div class="h-full my-1 border border-gray-500" />
        <HeaderIcon
          icon={isDisplayFile() ? TbFile : TbFileOff}
          onClick={() => {
            setIsDisplayFile((v) => !v);
          }}
          title={
            isDisplayFile()
              ? "曲以外のファイルを非表示"
              : "曲以外のファイルを表示"
          }
        />
      </div>
      <div class="px-2 border flex flex-row items-center gap-2 bg-gray-100">
        <For each={breadcrumbs()}>
          {(name, i) => (
            <>
              <span class="">{name}</span>
              {i() < (breadcrumbs()?.length ?? 0) - 1 && (
                <VsChevronRight class="text-gray-500" />
              )}
            </>
          )}
        </For>
      </div>
      <div class="flex-grow flex overflow-y-auto">
        <div
          class={clsx(
            "bg-gray-100 p-2 flex-col gap-0.5 w-[10rem] shrink-0 shadow-inner overflow-x-auto",
            "hidden sm:flex"
          )}
        >
          <Show when={tree()} keyed>
            {(item) => <Tree tree={item} entryFunc={entry} />}
          </Show>
        </div>
        <ul
          class="divide-y flex-grow shrink-auto h-full min-w-[200px] overflow-y-auto border-x border-gray-400"
          onClick={() => {
            setSelectedItem(undefined);
          }}
        >
          <For each={children()}>
            {(data) => {
              let ref: HTMLInputElement | undefined = undefined;

              onMount(() => {
                if (editingItemPath() === data.path) {
                  setTimeout(() => ref?.focus(), 0);
                }
              });
              return (
                <li
                  class={clsx(
                    "px-4 flex flex-row shrink-0 items-center gap-2",
                    selectedItem() === data
                      ? "bg-orange-400 hover:bg-orange-500"
                      : "hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editingItemPath() === data.path) return;
                    setSelectedItem(data);
                  }}
                  onDblClick={() => {
                    if (data.type === "folder") entry(data.path);
                  }}
                >
                  <div class="w-6 shrink-0">
                    {data.type === "folder" && <FolderIcon />}
                    {data.type === "song" && data.changed.midfile && (
                      <MusicIcon />
                    )}
                  </div>
                  <div
                    class={clsx(
                      "py-2 flex-grow truncate",
                      editingItemPath() !== data.path && "pointer-events-none"
                    )}
                  >
                    <input
                      ref={(ref_) => {
                        ref = ref_;
                      }}
                      class="w-full pl-1 outline-offset-[-1px] bg-transparent"
                      value={data.name}
                      disabled={editingItemPath() !== data.path}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          ref?.blur();
                        }
                      }}
                      onBlur={(e) => {
                        createFolder(data.path, e.currentTarget.value);
                        setEditingItemPath();
                      }}
                    />
                  </div>
                  <div class="w-6 shrink-0">
                    {data.type === "song" && data.changed.security === "ON" && (
                      <KeyIcon />
                    )}
                  </div>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={selectedItem()} keyed>
          {(item) => (
            <div class={clsx("w-96 shrink-0 overflow-y-auto", "shadow-inner")}>
              <Info item={item} />
            </div>
          )}
        </Show>
      </div>
      <Show when={isSaveDialog()}>
        <div
          class="absolute h-full w-full bg-black/75 flex justify-center items-center"
          onClick={() => {
            setIsSaveDialog(false);
          }}
        >
          <SaveDialog />
        </div>
      </Show>
    </div>
  );
};

export default List;
