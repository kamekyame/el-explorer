/* @refresh reload */
import { getTauriVersion, getVersion } from "@tauri-apps/api/app";
import { open, message } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { arch, platform, type, version } from "@tauri-apps/api/os";
import { open as openLink } from "@tauri-apps/api/shell";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";

import "./globals.css";
import List from "./List";

const [path, setPath] = createSignal<string>("f:\\");
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
  console.log("inquiry");

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
  // "https://docs.google.com/forms/d/e/1FAIpQLSdLgSGMhXzutGoAxCdBXvR1ovNcf5q6LTcT7yy6TSsfNDlG3A/viewform?usp=pp_url&entry.1969709165=%E3%81%82%E3%81%82%E3%81%82%E3%81%82%E3%81%82"
  await openLink(formUrl.href);
  // window.location.href = "https://google.com";
});

await listen("about", async () => {
  console.log("about");
  const msg = [
    "作者：kamekyame(Twitter: @SuzuTomo2001)",
    "",
    "バグ報告や機能リクエスト等は「ヘルプ⇒お問い合わせ」よりお願いします。",
    "",
    "Copyright (c) 2023 kamekyame",
  ];
  await message(msg.join("\n"), { title: "EL-Explorerについて" });
});

const App = () => {
  return (
    <>
      <div class="w-screen h-screen">
        <List path={path()} />
      </div>
      <div id="dialog" class="absolute" />
    </>
  );
};

render(() => <App />, document.getElementById("app") as HTMLElement);
