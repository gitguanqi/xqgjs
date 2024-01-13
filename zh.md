# xqgjs

这是一个类似jQuery的前端JS库。

[查看英文文档](./README.md)

## 安装

**游览器端**:

引入cdn

```html
<!-- 游览器es5 -->
<script src="https://xqgj.cc/xqcdn/libs/xqgjs/xqgjs.min.js"></script>
<!-- es6模块 -->
<script type="module">
    import xqgjs from './lib/xqgjs-esm.min.js';
</script>
```

## 使用

+ 库版本信息

```js
console.log(gjs.info);
// {name: 'gjs', date: '2022-09-29', version: 'v1.0.2'}
```

+ dom操作

```js
console.log(gjs('h3'));
// init {0: h3}
```

## 查看示例

运行这个脚本查看展示案例：`npm run test:browser`。

## 提问题

[提出问题](https://github.com/gitguanqi/xqgjs/issues/new)

## 作者

[@gitguanqi](https://github.com/gitguanqi)
