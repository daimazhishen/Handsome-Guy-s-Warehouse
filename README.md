# WZP × LH · Love Runtime

一个受原视频启发的纯粒子爱心互动页面。页面无需联网，也不需要安装依赖。

## 直接打开

双击 `index.html`，或将它拖入浏览器。建议使用最新版 Chrome、Edge、Firefox 或 Safari。

打开页面后：

- 荧光粒子会从画面下方汇聚成爱心；
- 点击画面会迸出星火；
- 右上角可以开启声音、重播或进入全屏；
- 爱心下方可以再看一遍或点亮一颗星。

## 修改名字或文案

打开 `app.js`，修改文件顶部的 `LOVE` 配置：

```js
const LOVE = Object.freeze({
  from: "LH",
  to: "WZP",
  line1: "WZP，遇见你之后，",
  line2: "连代码都开始偏心。",
});
```

同时可修改 `index.html` 里的标题、页面描述与代码面板文案。

## 部署

整个文件夹可以原样上传到任意静态网站托管服务；入口文件为 `index.html`。
