/**
 * LibreTV 浏览器兼容性检查与 Win7/360 极速模式提示
 * 使用 ES3 语法以确保在旧版 360 浏览器中完美运行
 */
(function() {
    // 1. 基础环境检查
    var isModern = true;
    try {
        // 尝试执行 ES6 语法，如果失败则标记为旧版环境
        new Function('var x = (y) => y; const z = 1; Promise.resolve();');
    } catch (e) {
        isModern = false;
    }

    var ua = navigator.userAgent;
    var isWin7 = ua.indexOf('Windows NT 6.1') > -1;
    var is360 = ua.indexOf('QIHU') > -1 || ua.indexOf('360SE') > -1 || ua.indexOf('360EE') > -1;
    
    // 2. 开启极速兼容模式
    if (!isModern || isWin7 || is360) {
        window.__LEGACY_MODE__ = true;
        
        // 动态添加基础补丁
        var polyfill = document.createElement('script');
        polyfill.src = 'https://cdnjs.cloudflare.com/ajax/libs/polyfill/3.111.0/polyfill.min.js';
        document.getElementsByTagName('head')[0].appendChild(polyfill);

        // 3. 页面加载后的提示与优化
        var showCompatibilityTip = function() {
            // 针对 360 浏览器禁用复杂动画以节省 CPU
            if (is360) {
                var style = document.createElement('style');
                style.type = 'text/css';
                var css = '* { animation: none !important; -webkit-animation: none !important; transition: none !important; -webkit-transition: none !important; } .animate-spin { -webkit-animation: spin 1s linear infinite !important; animation: spin 1s linear infinite !important; }';
                if (style.styleSheet) {
                    style.styleSheet.cssText = css;
                } else {
                    style.appendChild(document.createTextNode(css));
                }
                document.getElementsByTagName('head')[0].appendChild(style);
            }

            // 提示信息已按要求彻底移除，改为静默运行
            console.log('极速兼容模式已静默开启');
        };

        // 绑定加载事件
        if (window.addEventListener) {
            window.addEventListener('load', showCompatibilityTip, false);
        } else if (window.attachEvent) {
            window.attachEvent('onload', showCompatibilityTip);
        }
    }
})();
