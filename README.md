# webpackSubPackagePlugin
uni-app定制化分包方案，使用webpack插件实现

### Install

```bash
npm i webpack-uniapp-subpackage-plugin --save-dev
```
### Usage

#### 引入插件
```js
//参数说明:subPackagesName:分包文件夹名称，componentsDir:分包组件存放目录
const WebpackSelfSubPackagePlugin = require('webpack-uniapp-subpackage-plugin')
const config = {
    configureWebpack: {
        plugins: [
            new WebpackSelfSubPackagePlugin({subPackagesName: 'subPackages', componentsDir: 'subPackages/components'})
        ]
    }
};
```
#### 修改uni-app源码

```bash
//代码路径
@dcloudio\webpack-uni-mp-loader\lib\plugin\generate-json.js
```

```javascript
function analyzeUsingComponents () {
  if (!process.env.UNI_OPT_SUBPACKAGES) {
    return
  }
  const pageSet = getPageSet()
  const jsonFileMap = getJsonFileMap(false) // 修改本行
  ...///
}
```
#### 使用patch-package保存你修改的源码
安装patch-package
```bash
npm i patch-package --save-dev
```
创建补丁
```bash
$ npx patch-package @dcloudio/webpack-uni-mp-loader   # 使用npm
$ yarn patch-package @dcloudio/webpack-uni-mp-loader  # 使用yarn

```
修改package.json的内容

```json
"scripts": {
  "postinstall": "patch-package"
}

```
