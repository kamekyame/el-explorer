/* @refresh reload */
import { getTauriVersion, getVersion } from "@tauri-apps/api/app";
import {
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from "@tauri-apps/api/menu";
import { open, message, ask } from "@tauri-apps/plugin-dialog";
import { arch, platform, type, version } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { open as openLink } from "@tauri-apps/plugin-shell";
import { check } from "@tauri-apps/plugin-updater";
import { createSignal, Show } from "solid-js";
import { render } from "solid-js/web";

import "./globals.css";
import List from "./List";

const [path, setPath] = createSignal<string>();
const openDialog = async () => {
  const result = await open({
    multiple: false,
    directory: true,
    recursive: true,
  });

  if (typeof result === "string") setPath(result);
};

const openMenuItem = await MenuItem.new({
  text: "開く",
  action: async () => {
    await openDialog();
  },
});

const inquiryMenuItem = await MenuItem.new({
  text: "お問い合わせ",
  action: async () => {
    const status = [
      `version : ${await getVersion()}`,
      `tauri version : ${await getTauriVersion()}`,
      "",
      `os version : ${await version()}`,
      `arch : ${await arch()}`,
      `platform : ${await platform()}`,
      `type : ${await type()}`,
    ].join("\n");

    const formUrl = new URL(
      "https://docs.google.com/forms/d/e/1FAIpQLSdLgSGMhXzutGoAxCdBXvR1ovNcf5q6LTcT7yy6TSsfNDlG3A/viewform"
    );
    const sp = formUrl.searchParams;
    sp.set("usp", "pp_url");
    sp.set("entry.1969709165", status);
    await openLink(formUrl.href);
  },
});

const updateMenuItem = await MenuItem.new({
  text: "アップデートの確認",
  action: async () => {
    const noUpdate = !(await myCheckUpdate());
    if (noUpdate) {
      const msg = ["利用可能なアップデートはありません。"];
      await message(msg.join("\n"), { title: "アップデートの確認" });
    }
  },
});

const aboutMenuItem = await MenuItem.new({
  text: "このアプリについて",
  action: async () => {
    console.log("about");
    const msg = [
      "アプリバージョン：v" + (await getVersion()),
      "作者：kamekyame(Twitter: @SuzuTomo2001)",
      "",
      "バグ報告や機能リクエスト等は「ヘルプ⇒お問い合わせ」よりお願いします。",
      "",
      "Copyright (c) 2023 kamekyame",
    ];
    await message(msg.join("\n"), { title: "EL-Explorerについて" });
  },
});

const fileSubMenu = await Submenu.new({
  text: "ファイル",
  items: [openMenuItem],
});

const helpSubMenu = await Submenu.new({
  text: "ヘルプ",
  items: [
    inquiryMenuItem,
    await PredefinedMenuItem.new({ item: "Separator" }),
    updateMenuItem,
    await PredefinedMenuItem.new({ item: "Separator" }),
    aboutMenuItem,
  ],
});

const menu = await Menu.new({
  items: [fileSubMenu, helpSubMenu],
});

await menu.setAsAppMenu();

async function myCheckUpdate() {
  const updateData = await check();
  if (!updateData) return false;
  console.log();
  const askMsg = [
    `新しいバージョン（v${updateData.version}）が利用可能です。`,
    "更新しますか？（更新が終わると自動で再起動します。）",
  ].join("\n");
  const yes = await ask(askMsg);
  if (yes) {
    await updateData.downloadAndInstall();
    await relaunch();
  }
  return true;
}
myCheckUpdate();

const App = () => {
  return (
    <>
      <div class="w-screen h-screen">
        <Show
          when={path()}
          keyed
          fallback={
            <div class="w-full h-full flex items-center justify-center">
              <div>
                「ファイル」→「開く」より対象のフォルダを開いてください。
              </div>
            </div>
          }
        >
          {(path) => <List path={path} />}
        </Show>
      </div>
      <div id="dialog" class="absolute" />
    </>
  );
};

render(() => <App />, document.getElementById("app") as HTMLElement);
