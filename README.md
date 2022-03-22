# usi-tee-ws

[Universal Shogi Interface プロトコル](http://shogidokoro.starfree.jp/usi.html)のやりとりを中継して HTTP/WebSocket 経由で出力します。

## install

### Node.js

実行には [Node.js](https://nodejs.org/ja/) が必要です。（Node.js のバージョンは 16.10 以降を推奨）
Linux環境で Node.js をインストールする方法は [パッケージマネージャを利用した Node.js のインストール](https://nodejs.org/ja/download/package-manager/)  などを参照してください。

### yarn パッケージマネージャの有効化 (Windows, Node.js 16.10 以降)

`Windows+X`キー もしくは スタートボタンを右クリック で開かれるメニューより、「Windows PowerShell（管理者）」もしくは「Windows Terminal（管理者）」を選択し、Windows PowerShell（管理者）を起動して以下のコマンドをそれぞれ入力します。

- yarn パッケージマネージャの有効化

```
corepack enable
```

参考: [Installation | Yarn - Package Manager](https://yarnpkg.com/getting-started/install)

- yarn パッケージマネージャ (`yarn.ps1`) の実行許可

```
Set-ExecutionPolicy RemoteSigned
```

参考: [PowerShellでglobalでインストールしたyarnを実行する方法と、スクリプトの実行が無効になっているってエラーの解決方法](https://www.suzu6.net/posts/335-windows11-npm-install-global-yarn/)

### usi-tee-ws 依存パッケージのインストール

このファイルがあるディレクトリにて、以下のコマンドを入力します。もしくは、このディレクトリにある `pkginstall.cmd` を実行します。

```
yarn install
```

## usage

起動時には、 ENGINE : USI対応の実行ファイル の指定が必要です。[将棋所](http://shogidokoro.starfree.jp/index.html)・[ShogiGUI](http://shogigui.siganus.com/) などに登録可能な起動ファイル（※）の例は `bin/` ディレクトリ内にありますので、これらのファイルを参考に、各自の環境に合わせて編集してください。

※ [ShogiGUI](http://shogigui.siganus.com/)に `Windows コマンド スクリプト (*.cmd)` 形式の起動ファイルを用いてエンジンを追加する場合、表示するファイルの種類を `実行ファイル (*.exe)` から `すべてのファイル (*.*)` に変更してから、起動ファイルを選択する必要があります。

```
usage:
server.ts [-h] [-v] [-p PORT] [-c CWD] engine ...
```

- `-h` : 使い方情報の表示
- `-v` : バージョン情報の表示
- `-p` / `--port` : ローカルHTTPサーバーの待機ポート番号（デフォルト: `8080`）
- `-c` / `--cwd` : USIエンジンの実行用ディレクトリ（デフォルト：`.`）
- `engine` : USIエンジンの実行ファイル（`-c`/`--cwd`オプションを指定した場合は、それに対する相対ディレクトリ、もしくは絶対ディレクトリで指定）
- `...` (engineargs) : USIエンジンの実行オプション

usi-tee-ws サーバー起動後は、指定したポート番号に対応したURLに対し、ブラウザを開いて閲覧します。
同時に複数のサーバーが同じポート番号で待機する事は出来ないため、複数のUSIエンジンを同時に起動する場合は異なるポート番号で起動できるよう用意するか、起動しようとしているのと同じポート番号を使用しているものをあらかじめ終了しておく必要があります。

### USIプロトコルの表示 (port 8081 で起動した場合)

- http://localhost:8081/

### 評価値ゲージの表示 (port 8081 で起動した場合)

OBS Studio の ブラウザソース(BrowserSource) でこれを表示する場合、幅1320、高さ96 のサイズ指定を推奨します。エンジン起動前に OBS Studio を起動した場合はこれらの URL にはアクセスできないため、エンジン起動後に作成した ブラウザソース(BrowserSource) を選択して 「再読み込み」 を行います。

- http://localhost:8081/bar.html
- http://localhost:8081/bar.html?engine=Suisho5 (エンジン名表示をする例)
- http://localhost:8081/bar.html?engine=DeepSuisho (エンジン名表示をする例)
- http://localhost:8081/bar.html?engine=DeepSuisho&wfn=atan&coef=355 (エンジン名表示&評価値→勝率変換をシグモイド関数から逆正接関数に変更・係数を1200から355に変更)

### 読み筋の表示 (port 8081 で起動した場合)

- http://localhost:8081/pv.html
