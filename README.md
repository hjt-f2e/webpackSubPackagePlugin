# webpackSubPackagePlugin
uni-app定制化分包方案，使用webpack插件实现

### Install

```bash
npm i webpack-uniapp-subpackage-plugin --save-dev
```
### Use
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
module.exports = config;

```