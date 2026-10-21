# xqgjs

一个类似 jQuery 的轻量浏览器工具库：DOM 快捷方法、表单校验、本地存储、Cookie、XHR 封装，
外加几个可以独立使用的组件。

[English documents](./README.md) · [更新日志](./CHANGELOG.md)

- 零运行时依赖
- 同时提供 UMD（script / CommonJS / AMD）与 ESM 产物，各自带压缩版
- 输出 ES2017，不再支持 IE，也不内置 polyfill
- 三条消费路径（CJS / ESM / 浏览器全局）都有 TypeScript 声明

```js
// 版本信息与 package.json 保持同步
console.log(gjs.info);
// {name: 'gjs', date: '2026-10-20', version: 'v2.0.0'}
```

## 安装

### script 标签（UMD）

```html
<script src="https://xqgj.cc/xqcdn/libs/xqgjs/xqgjs.min.js"></script>
<script>
    gjs('#app').html('hello');
    $g('#app').addCls('ready'); // $g 是 gjs 的别名
</script>
```

### ESM

```html
<script type="module">
    import gjs from './node_modules/xqgjs/lib/xqgjs-esm.min.js';
    gjs('#app').html('hello');
</script>
```

### 打包器

```js
import gjs from 'xqgjs'; // 命中 lib/xqgjs-esm.js 与 lib/xqgjs-esm.d.mts
```

```js
const gjs = require('xqgjs'); // 命中 lib/xqgjs.js 与 lib/xqgjs.d.ts
```

### 入口一览

| 引入路径         | 实际文件                    | 格式   |
| ---------------- | --------------------------- | ------ |
| `xqgjs`          | `lib/xqgjs-esm.js`（ESM）/ `lib/xqgjs.js`（CJS） | 自动   |
| `xqgjs/esm`      | `lib/xqgjs-esm.js`          | ESM    |
| `xqgjs/min`      | `lib/xqgjs.min.js`          | UMD    |
| `xqgjs/esm.min`  | `lib/xqgjs-esm.min.js`      | ESM    |
| `xqgjs/loading`  | `lib/loading/js/loading.js` | script |
| `xqgjs/mourn`    | `lib/mourn/mourn.js`        | script |

最后两个是组件入口，引进来就会自动挂载，所以 `package.json` 里把它们写进了 `sideEffects`，
避免打包器做 tree-shaking 时把它们删掉。

## 使用

### 包装元素

```js
gjs('h3')          // 第一个匹配元素；没匹配到就是长度为 0 的实例
gjs(document.body) // 直接传元素
```

实例是类数组结构：`[0]` 是元素，`length` 是 `0` 或 `1`。

```js
gjs('#box')
    .addCls('active')
    .css({ color: '#0ff', 'font-size': '14px' })
    .text('done')
    .on('click', () => console.log('clicked'));
```

实例方法：`setAttr`、`getAttr`、`delAttr`、`text`、`html`、`css`、`each`、`on`、`off`、
`addCls`、`delCls`、`toggleCls`、`hasCls`。

### DOM 快捷方法

```js
gjs.gId('app');            // document.getElementById
gjs.gCls('item');          // getElementsByClassName 的实时集合
gjs.gTag('li');
gjs.gName('q');
gjs.dom('#app');           // document.querySelector
gjs.domAll('.item');       // document.querySelectorAll
gjs.cElem('div');          // createElement，参数就是标签名
gjs.cText('hi');           // createTextNode
gjs.addElem(parent, child);
gjs.insertElem(parent, newElem, refElem); // refElem 传 null 表示追加
gjs.replaceElem(parent, newElem, oldElem);
gjs.cloneElem(elem, true); // 第二个参数是 isDeep
gjs.delElem(parent, child);
gjs.parent(elem);          // parentNode，*Elem 版本返回 parentElement
gjs.child(elem);           // childNodes
gjs.first(elem) / gjs.last(elem) / gjs.next(elem) / gjs.prev(elem)
```

每个遍历方法都有跳过文本节点的 `*Elem` 版本：
`parentElem`、`childElem`、`firstElem`、`lastElem`、`nextElem`、`prevElem`。

### 遍历与就绪

```js
gjs.each([1, 2, 3], (index, value) => {
    if (value === 2) return false; // 返回 false 跳出
});

gjs.ready((api) => {
    // 文档已解析完时会立即执行
});
```

`each` 支持数组、`NodeList` 和普通对象，返回传入的原集合。

### 表单校验

所有校验方法都只接收一个值并返回布尔值。非字符串一律返回 `false`；共用的正则每次测试前都会
重置 `lastIndex`，所以反复调用结果稳定。

```js
gjs.checkName('张三');        // 仅中文、英文、数字
gjs.checkNameTwo('ab_1');     // 英文、数字、_ 和 -，4-16 位
gjs.checkUserName('zhang3');  // 字母开头，5-16 个单词字符
gjs.checkMobile('13800138000');
gjs.checkEmail('a@b.com');
gjs.checkPost('abc123');      // 3-12 位字母或数字
gjs.checkCardId('110101199003078515');
gjs.checkpassWord('Abc123!x'); // 别名：gjs.checkPassword
```

需要复用规则时可以直接读 `gjs.regAll`。

### 本地存储与 Cookie

```js
gjs.setLocal('token', 'abc');    // 值会做 URI 编码，'=' 与 '&' 都能安全存
gjs.getLocal('token');           // 'abc'，键不存在时返回 null
gjs.rmLocal('token');
gjs.clearLocal();
// session 存储有同样四个方法：setSession / getSession / rmSession / clearSession

gjs.setCookie('token', 'abc');          // 默认带 path=/
gjs.getCookie('token');                 // 不存在返回 ''，值里的 '=' 会保留
gjs.rmCookie('token');
```

存储方法只做 `encodeURIComponent` / `decodeURIComponent`，对象请自己
`JSON.stringify` / `JSON.parse`。存储被禁用时（隐私模式、禁用 Cookie），写方法返回 `false`、
读方法返回 `null`，不会抛异常。

### 定时器、时间与 URL

```js
const id = gjs.setTimeout(fn, 300);  // 返回定时器 id
gjs.clearTimeout(id);

gjs.getTime(elem);         // 让元素显示 YYYY-MM-DD HH:mm:ss 并每秒刷新，返回定时器 id
gjs.clearTime(id);         // clearInterval 的别名

gjs.secondToTime(10);      // '00:00:10'
gjs.secondToTime(3661);    // '01:01:01'

gjs.getUrlArgs();          // { q: 'a b' }，'+' 会解码、'#' 会剥离，永不抛异常
gjs.fullScreen(elem);
```

### 网络请求

`gjs.http` 签名是 `(method, url, data)`，返回 Promise：成功时 resolve 解析后的响应体，
失败时 reject 一个结构化对象，不会再 reject `undefined`。

```js
gjs.http('GET', '/api/list')
    .then((res) => console.log(res.code, res.data))
    .catch((err) => console.warn(err.msg, err.data.info));
// err.msg 取值：no_xhr · open_fail · send_fail · get_fail · parse_fail · network_error
```

```js
gjs.httpSimple('POST', '/api/save', 'a=1', (result) => {
    // 成功时 result.code 为 200，失败时为 101
});
```

失败时 `data.raw` 会带上原始响应文本，所以反向代理返回的 HTML 错误页也能看到。

`gjs.jsonp(url, 'callbackName', onError)` 用于只支持 JSONP 的跨域接口。

### 文件相关

```js
// 复制某个元素（或 id）的可见文本，成功 resolve true
await gjs.copyText('code-block');

// 下载一个 URL 并返回 blob 地址；非 2xx 会 reject
gjs.downloadFile('/export/rows.csv', 'rows.csv');

// 把 <table> 的 HTML 导出成 .xls；目标不存在返回 false
gjs.exportExcel('data-table', 'rows.xls');

// 用 SheetJS 解析 <input type="file"> 的第一个文件，并把结果写入 #demo
await gjs.importFile(input, 'demo'); // resolve 出行数据
```

`copyText` 优先用 `navigator.clipboard`，不可用时回退到隐藏 textarea，因此在 http 源下也能用。
`importFile` 依赖 `XLSX` 全局（SheetJS），缺失时会明确 reject。

### 组件

```js
const drag = new gjs.Drag(document.getElementById('box'));
drag.move(left, top); // 会被限制在视口内
drag.destroy();       // 解绑 resize / mousemove / mouseup

// Tab(navs, contents, clsName = 'active', eventType = 'click')
const tabs = new gjs.Tab(document.querySelectorAll('.tab-btn'), document.querySelectorAll('.panel'));
tabs.destroy();

// Carousels(contents, contentLis, arrowLeft, arrowRight, btns, active, dealy, isAuto, type)
const carousel = new gjs.Carousels(
    document.querySelector('.carousel-track'),
    document.querySelectorAll('.carousel-track li'),
    document.querySelector('.prev'),
    document.querySelector('.next'),
    document.querySelectorAll('.dots i'),
    'active',
    4000,
    false // isAuto 省略时默认 true
);
carousel.stop();
carousel.autoPlay();  // 幂等
carousel.destroy();

const record = new gjs.xqRecord();
record.start('video', '#preview').then(() => { /* MediaRecorder 已启动 */ });
record.stop();     // 停止录制，随后把 blob 赋给媒体元素
record.stopSet();
```

四个组件都会记录自己绑定的监听器，所以 `destroy()` 真的能解绑，而不是把闭包留在
`window` 和 `document` 上。

### loading 与 mourn

`lib/loading` 是全屏加载遮罩，`lib/mourn` 会在纪念日把整页置灰。两者都从自己那个
`<script>` 标签的 `data-*` 上读配置，都不需要 `id`，也都会在 `window` 上暴露一个小 API。

```html
<link rel="stylesheet" href="./lib/loading/css/loading.min.css">
<script src="./lib/loading/js/loading.min.js" data-color="#00e5ff" data-hide="load"></script>
<script>
    window.xqLoading.hide();
    window.xqLoading.show();
    window.xqLoading.get();      // 已挂载的遮罩元素
    window.xqLoading.mount();    // 手动挂载（例如 data-auto="false" 时）
</script>
```

```html
<script src="./lib/mourn/mourn.min.js" data-date="5.12" data-src="/mourn.json"></script>
<script>
    window.xqMourn.list();        // 合并后的日期表，形如 'M.D'
    window.xqMourn.check(['7.7']);// 不传参数则用合并后的日期表
    window.xqMourn.load();        // 拉取远程日期表，resolve 一个布尔值
</script>
```

- `data-hide`：`load`（默认，`window.load` 时隐藏）、`dom`（`DOMContentLoaded` 时隐藏）、
  `none`（一直保留，直到你调用 `xqLoading.hide()`）
- `data-auto="false"`：跳过自动挂载，只留下 `window.xqLoading`
- `data-color`：圆环颜色；不写就用样式表里的颜色
- `data-img`：可选图标地址，不写就不会渲染 `<img>`
- `data-date` / `data-src`：追加日期 / 覆盖远程日期表地址
- `mourn` 只改 `html.style.filter` 与 `html.classList`，页面上其他内联样式不会被清掉
- `mourn` 的远程请求带 8 秒超时与 `catch`，断网时页面照常显示

## 开发

```bash
npm install
npm run serve        # 在 http://127.0.0.1:4001 启动本地服务，入口是 test/index.html
npm test             # 一致性 + 单元测试 + 类型 + 打包契约
```

| 脚本                  | 作用                                                     |
| --------------------- | -------------------------------------------------------- |
| `npm run build`       | 用 esbuild 重新生成 5 个压缩产物                          |
| `npm run sync`        | 由 `lib/xqgjs.js` 重新生成 `lib/xqgjs-esm.js`             |
| `npm run check`       | 校验 ESM 与 UMD 一致、跨文件版本一致、压缩产物逐字节一致   |
| `npm run test:unit`   | 在桩 DOM 里对已提交的产物跑行为测试                        |
| `npm run check:types` | 编译 CJS / ESM / 全局三种用法的类型检查                    |
| `npm run check:pack`  | 断言 `npm pack` 只包含应该发布的文件                       |
| `npm run serve`       | 零依赖静态服务器，用来跑 test/ 下的手测页面                |
| `npm run check:browser` | 用真浏览器打开全部测试页并断言页内自检通过；需要本机装有 Playwright，没装时给出提示而不是报错 |

唯一的事实来源是 `lib/xqgjs.js`。`lib/xqgjs-esm.js` 由 `scripts/sync-esm.js` 生成，
`.min.*` 由 `scripts/build.js` 生成。改源码之后执行 `npm run sync && npm run build`，
不要手改压缩产物和 ESM 副本。

`test/` 下每个页面都会自己跑断言并把 PASS/FAIL 打在页面上。`npm run serve` 之后打开
`test/index.html` 即可逐页查看，也可以交给 `npm run check:browser` 自动跑。

## 提问题

[提出问题](https://github.com/gitguanqi/xqgjs/issues/new)

## 作者

[@gitguanqi](https://github.com/gitguanqi)

## 许可证

MIT
