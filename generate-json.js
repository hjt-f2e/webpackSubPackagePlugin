const {
    getPageSet,
    getJsonFileMap
} = require('@dcloudio/uni-cli-shared/lib/cache')
let componentPathFuck = ''
let subPackagesName = ''
const usingComponentsMap = {}
const cacheJsonFile = {}
function analyzeUsingComponents () {
    if (!process.env.UNI_OPT_SUBPACKAGES) {
        return
    }
    const pageSet = getPageSet()
    const jsonFileMap = getJsonFileMap()
    // 生成所有组件引用关系
    for (const name of jsonFileMap.keys()) {
        const jsonObj = JSON.parse(jsonFileMap.get(name))
        const usingComponents = jsonObj.usingComponents
        if (!usingComponents || !pageSet.has(name)) {
            continue
        }
        // usingComponentsMap[name] = {}

        Object.keys(usingComponents).forEach(componentName => {
            const componentPath = usingComponents[componentName].slice(1)
            if (!usingComponentsMap[componentPath]) {
                usingComponentsMap[componentPath] = new Set()
            }
            usingComponentsMap[componentPath].add(name)
        })
    }

    const subPackageRoots = Object.keys(process.UNI_SUBPACKAGES)
    const findSubPackages = function (pages) {
        const pkgs = new Set()
        for (let i = 0; i < pages.length; i++) {
            const pagePath = pages[i]
            const pkgRoot = subPackageRoots.find(root => pagePath.indexOf(root) === 0)
            if (!pkgRoot) { // 被非分包引用
                return false
            }
            pkgs.add(pkgRoot)
        }
        return [...pkgs]
    }
    const subpackageMap = {}
    Object.keys(usingComponentsMap).forEach(componentName => {

        const subPackages = findSubPackages([...usingComponentsMap[componentName]])
        if (subPackages && subPackages.length) {
            subPackages.forEach(subPackage => {
                if (subPackage && componentName.indexOf(subPackage) !== 0) { // 仅存在一个子包引用且未在该子包
                    if (subpackageMap[componentName]) {
                        if (!subpackageMap[componentName].includes(subPackage)) {
                            subpackageMap[componentName].push(subPackage)
                        }
                    } else {
                        subpackageMap[componentName] = [subPackage]
                    }
                }
            })
        }
    })
    return subpackageMap
}
module.exports = function generateJson (compilation, options) {
    const { componentsDir } = options
    subPackagesName = options.subPackagesName
    componentPathFuck = '/' + subPackagesName
    //
    const moveFiles = () => {
        const componentPageMap = analyzeUsingComponents() || {}
        const fileTypeMap = ['js', 'wxml', 'wxss']
        // 只处理componentsDir(subPackages)目录下的组件
        const componentPageMapArray = Object.entries(componentPageMap).filter(item => {
            return item[0].startsWith(componentsDir)
        })
        for (const [key, value] of componentPageMapArray) {
            const _key = key.replace(subPackagesName, '')
            value.forEach(subPageName => {
                fileTypeMap.forEach(fileType => {
                    if (compilation.assets.hasOwnProperty(`${key}.${fileType}`)) {
                        compilation.assets[`${subPageName}\/${_key}.${fileType}`] = compilation.assets[`${key}.${fileType}`]
                    }
                })
                // 处理json文件：优先读取compilation.assets里面的json文件，且读取后缓存到cacheJsonFile
                const fileName = key.split('/').pop()
                if (compilation.assets.hasOwnProperty(`${key}.json`)) {
                    compilation.assets[`${subPageName}\/${_key}.json`] = compilation.assets[`${key}.json`]
                    cacheJsonFile[fileName] = compilation.assets[`${key}.json`].source()
                } else {
                    const json = cacheJsonFile[fileName]
                    if (json) {
                        compilation.assets[`${subPageName}\/${_key}.json`] = {
                            size() {
                                return Buffer.byteLength(json, 'utf8')
                            },
                            source() {
                                return json
                            }
                        }
                    }
                }
            })
            // 删除原目录下文件
            value.forEach(() => {
                fileTypeMap.forEach(fileType => {
                    delete compilation.assets[`${key}.${fileType}`]
                })
                delete compilation.assets[`${key}.json`]
            })
        }
    }
    // 是否是页面json文件，用于排除app.json之类的非页面json文件
    const isPageJsonFile = (key) => {
        return key.startsWith('pages') || key.startsWith(subPackagesName)
    }
    /**
     * 修改组件引用路径
     * @param pagePath String
     * @param beforeComponentPath String
     * @returns {string}
     */
    const changePath = (pagePath, beforeComponentPath) => {
        let subPageName = ''
        subPageName = pagePath.split('/').slice(0, 2).join('/')
        const _key = beforeComponentPath.replace(componentPathFuck, '')
        return `/${subPageName}${_key}`
    }
    /**
     *
     * @param pagePath 页面路径
     * @param json 对应页面的json文件
     * @returns Object 修改组件引用路径后的对象(符合compilation.assets格式约定)
     */
    const modifyUsingComponents = ({pagePath, json}) => {
        const {usingComponents} = JSON.parse(json) || {}
        for (let [key, value] of Object.entries(usingComponents)) {
            if (isCustomerComponent(key)) {
                usingComponents[key] = changePath(pagePath, value)
            }
        }
        const jsonSource = JSON.stringify(Object.assign({}, JSON.parse(json), {usingComponents}), null, 2)
        return {
            size() {
                return Buffer.byteLength(jsonSource, 'utf8')
            },
            source() {
                return jsonSource
            }
        }
    }
    /**
     * 返回连接线风格组件名
     * @param paths ['subPackages/components/UseInSub']
     * @returns ['use-in-sub']
     */
    const getCustomerComponents = (paths) => {
        return paths.map(item => {
            let originName = item.split('/').pop()
            const temp = originName.substr(0, 1).toLocaleLowerCase() + originName.substr(1)
            return temp.replace(/([A-Z])/g, "-$1").toLowerCase();
        })
    }
    /**
     * 是否属于componentsDir(subPackages)目录下的组件
     * @param key
     * @returns {boolean}
     */
    const isCustomerComponent = (key) => {
        const customerComponents = getCustomerComponents(Object.keys(analyzeUsingComponents()))
        return customerComponents.includes(key)
    }
    /**
     * 页面是否使用了componentsDir(subPackages)目录下的组件
     * @param json
     * @returns {boolean}
     */
    const hasCustomerComponents = (json) => {
        const obj = JSON.parse(json).usingComponents || {}
        for (let key of Object.keys(obj)) {
            if (isCustomerComponent(key)) {
                return true
            }
        }
        return false
    }
    /**
     * 处理页面json，修改usingComponents里面引用组件地址
     */
    const modifyPageJsonFiles = () => {
        const jsonFileMap = getJsonFileMap()
        const pageJsonMap = {}
        for (let [key, value] of jsonFileMap) {
            if (isPageJsonFile(key) && hasCustomerComponents(value)) {
                pageJsonMap[key] = modifyUsingComponents({pagePath: key, json: value})
            } else {
            }
        }
        emitPageJson(pageJsonMap || {})
    }
    const emitPageJson = (map) =>{
        for (const [key, value] of Object.entries(map)) {
            compilation.assets[`${key}.json`] = value
        }
    }
    moveFiles()
    modifyPageJsonFiles()
}
