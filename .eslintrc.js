module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "solid", "import", "disable-autofix"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:solid/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    "import/order"
      : [
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
      ]
  },

};
