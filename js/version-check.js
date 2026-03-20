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

            // 检查是否已显示过提示
            var hasShownTip = false;
            try {
                hasShownTip = localStorage.getItem('legacy_mode_tip_shown') === 'true';
            } catch(e) {}

            if (!hasShownTip) {
                var tipDiv = document.createElement('div');
                tipDiv.id = 'legacy-compat-banner';
                // 使用最基础的 CSS 属性确保渲染
                tipDiv.style.position = 'fixed';
                tipDiv.style.top = '0';
                tipDiv.style.left = '0';
                tipDiv.style.right = '0';
                tipDiv.style.backgroundColor = '#0284c7';
                tipDiv.style.color = '#ffffff';
                tipDiv.style.padding = '10px 20px';
                tipDiv.style.textAlign = 'center';
                tipDiv.style.fontSize = '14px';
                tipDiv.style.fontWeight = 'bold';
                tipDiv.style.zIndex = '100000';
                tipDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
                
                tipDiv.innerHTML = '已为您开启 <span style="color:#fbbf24;">“极速兼容模式”</span>：已优化旧版浏览器加载逻辑，确保流畅播放。' +
                                   '<button id="closeLegacyTip" style="margin-left:20px; background:#ffffff; color:#0284c7; border:none; padding:3px 10px; border-radius:4px; cursor:pointer; font-size:12px;">知道了</button>';
                
                document.body.appendChild(tipDiv);
                
                var closeBtn = document.getElementById('closeLegacyTip');
                if (closeBtn) {
                    closeBtn.onclick = function() {
                        tipDiv.style.display = 'none';
                        try {
                            localStorage.setItem('legacy_mode_tip_shown', 'true');
                        } catch(e) {}
                    };
                }
                
                // 5秒后自动隐藏
                setTimeout(function() {
                    if (tipDiv) tipDiv.style.display = 'none';
                }, 8000);
            }
        };

        // 绑定加载事件
        if (window.addEventListener) {
            window.addEventListener('load', showCompatibilityTip, false);
        } else if (window.attachEvent) {
            window.attachEvent('onload', showCompatibilityTip);
        }
    }
})();
