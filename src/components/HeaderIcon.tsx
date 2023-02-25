import clsx from "clsx";
import { IconTypes } from "solid-icons";
import { Component, mergeProps } from "solid-js";
import { Dynamic } from "solid-js/web";

const Icon: Component<{
  icon: IconTypes;
  enable?: boolean;
  onClick: () => void;
  title: string;
}> = (props_) => {
  const props = mergeProps({ enable: true }, props_);

  return (
    <div
      class={clsx(
        "p-1", // size設定
        "rounded border border-transparent", // border設定
        "flex justify-center items-center", // flex設定
        props.enable
          ? "text-black hover:bg-blue-100 hover:border hover:border-blue-200"
          : "text-gray-500"
      )}
      onClick={() => {
        props.enable ? props.onClick() : undefined;
      }}
      title={props.title}
    >
      <Dynamic component={props.icon} size="24px" />
    </div>
  );
};
export default Icon;
