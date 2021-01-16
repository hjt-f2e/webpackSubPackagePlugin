const generateJson = require('./generate-json')
class WebpackSelfSubPackagePlugin {
    constructor(options) {
        this.options = options
    }
    apply (compiler) {
        if (!process.env.UNI_USING_NATIVE && !process.env.UNI_USING_V3_NATIVE) {
            compiler.hooks.emit.tapPromise('webpack-uni-mp-emit', compilation => {
                return new Promise((resolve) => {
                    generateJson(compilation, this.options)
                    resolve()
                })
            })
        }
    }
}

module.exports = WebpackSelfSubPackagePlugin
