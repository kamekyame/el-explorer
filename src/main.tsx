/* @refresh reload */
import { getTauriVersion, getVersion } from "@tauri-apps/api/app";
import { open, message, ask } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { arch, platform, type, version } from "@tauri-apps/api/os";
import { relaunch } from "@tauri-apps/api/process";
import { open as openLink } from "@tauri-apps/api/shell";
import { checkUpdate, installUpdate } from "@tauri-apps/api/updater";
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

await listen("open", async () => {
  await openDialog();
});

await listen("inquiry", async () => {
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
});

await listen("about", async () => {
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
});

async function myCheckUpdate() {
  const { manifest, shouldUpdate } = await checkUpdate();
  if (shouldUpdate === false || manifest === undefined) return;
  console.log();
  const askMsg = [
    `新しいバージョン（v${manifest.version}）が利用可能です。`,
    "更新しますか？（更新が終わると自動で再起動します。）",
  ].join("\n");
  const yes = await ask(askMsg);
  if (yes) {
    await installUpdate();
    await relaunch();
  }
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
