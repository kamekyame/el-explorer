import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import solid from "eslint-plugin-solid/configs/typescript";
import tseslint from "typescript-eslint";


export default tseslint.config(
  {
    ignores: ["dist"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  solid,
  {
    plugins: {
      "import": importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          "groups": [
            "builtin",  // 組み込みモジュール
            "external", // npmでインストールした外部ライブラリ
            "internal", // 自作モジュール
            [
              "parent",
              "sibling"
            ],
            "object",
            "type",
            "index"
          ],
          "newlines-between": "always", // グループ毎にで改行を入れる
          "pathGroupsExcludedImportTypes": [
            "builtin"
          ],
          "alphabetize": {
            "order": "asc", // 昇順にソート
            "caseInsensitive": true // 小文字大文字を区別する 
          },

        }
      ],
    },

  },
)
