// 引入语言文件
const grpLang = {
    zh: window.GRP_LOCALES['zh'],
    en: window.GRP_LOCALES['en']
}

/**
 * 获取浏览器设置语言
 * @returns {string}
 */
function getCurrentLanguage () {
    const grpClick2DialLang = localStorage.getItem('GRPClick2DialLang')
    console.log('get pre local lang from local storage: ' + grpClick2DialLang)
    const userLanguage = grpClick2DialLang || navigator.language
    console.log('The browser\'s current locale is：', userLanguage)

    let lang
    if (userLanguage?.indexOf('en') >= 0) {
        lang = 'en'
    } else if (userLanguage?.indexOf('zh') >= 0) {
        lang = 'zh'
    } else {
        // default en-US
        lang = 'en'
    }
    return lang
}

/**
 * 获取国际化语言
 * @returns {{messages, lang: string}}
 */
function getLocalLanguage () {
    let currentLanguage = getCurrentLanguage()
    let currentLocaleData
    switch (currentLanguage) {
        case 'en':
            currentLocaleData = Object.assign(grpLang.en)
            break
        case 'zh':
            currentLocaleData = Object.assign(grpLang.zh)
            break
        default:
            // default language
            currentLocaleData = Object.assign(grpLang.en)
            break
    }

    currentLocaleData.language = currentLanguage
    console.log('current locale：', currentLocaleData)
    return currentLocaleData
}

export default getLocalLanguage

// window.currentLocale = getLocalLanguage()
