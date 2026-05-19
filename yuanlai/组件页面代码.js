import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixApplication from 'wix-application';
import wixWindow from 'wix-window'; // ✅ 1. 引入 wix-window 用于判断设备
const CMS_CONFIG = {
    collectionId: "@zider-ink/zider-loop-logo/database",
    fieldKeys: { image: "image", title: "title", link: "link", sort: "sortNumber" }
};
const TEST_LOGOS = [{
        src: "https://uploads.commoninja.com/logo_showcase/1637759443652_Duda.png",
        alt: "Demo 1",
        link: "https://google.com"
    },

    {
        src: "https://uploads.commoninja.com/logo_showcase/1637759432722_Shopify.png",
        alt: "Demo 2",
        link: "https://shopify.com"
    },

    {
        src: "https://uploads.commoninja.com/logo_showcase/1637759428918_Webflow.png",
        alt: "Demo 3",
        link: "https://webflow.com"
    }
];
const TEST_CONFIG = {
    speed: 60,
    gap: 40,
    height: "50px",
    direction: "left",
    pauseOnHover: true,
    hiddenMaskColor: true,
    maskColor: "#ffffff",
    links: true,
    grayMode: false   // ← 默认关闭灰色模式

};



$w.onReady(function () {
    // 监听 Custom Element 的消息
    $w('#loopLogoCustomElement').onMessage((event) => {
        console.log("📨 [Velo] 收到组件消息:", event.data);

        // 当组件发送 "ready" 时，说明它加载好了，立刻给它发图片数据
        if (event.data.type === 'ready') {
            console.log("🚀 组件已就绪，正在准备发送数据...");
            refreshMarquee();
        }
    });

    // 保险起见，初始化也运行一次
    refreshMarquee();
});
$widget.onPropsChanged((oldProps, newProps) => {
    // If your widget has properties, onPropsChanged is where you should handle changes to their values.
    // Property values can change at runtime by code written on the site, or when you preview your widget here in the App Builder.



  refreshMarquee();
  updateLogoVisibility();


});



async function refreshMarquee() {
    const htmlComponent = $w('#loopLogoCustomElement');
    const viewMode = wixWindow.viewMode; // "Editor", "Preview", 或 "Site"
     // 1. 判断当前是否为移动端
    const isMobileDevice = wixWindow.formFactor === "Mobile";

    // 2. 获取用户设置的开关 (假设 Key 为 enableMobileSettings)
    // 如果 props 里没有这个值，默认视为 false
    const isMobileEnabled = $widget.props.enableMobileSettings === true;

    // 3. 核心判断逻辑：只有同时满足 [是手机] 且 [开启了开关]，才使用移动端数值
    const shouldUseMobileValues = isMobileDevice && isMobileEnabled;

    
    // --- 速度 ---
    const finalSpeed = (shouldUseMobileValues && $widget.props.mobileSpeed) 
        ? $widget.props.mobileSpeed 
        : ($widget.props.speed || TEST_CONFIG.speed);

    // --- 间距 ---
    const finalGap = (shouldUseMobileValues && $widget.props.mobileGap) 
        ? $widget.props.mobileGap 
        : ($widget.props.gap || TEST_CONFIG.gap);

    // --- 高度 ---
    const rawHeight = (shouldUseMobileValues && $widget.props.mobileLogoHeight) 
        ? $widget.props.mobileLogoHeight 
        : ($widget.props.logoHeight || TEST_CONFIG.height);
        
    const finalHeight = rawHeight.toString().replace(/[^0-9]/g, '') + 'px';

    const config = {
        speed: finalSpeed,
        gap: finalGap,
        height: finalHeight,
        direction: $widget.props.direction || TEST_CONFIG.direction,
        pauseOnHover: $widget.props.pauseOnHover === undefined ? TEST_CONFIG.pauseOnHover : $widget.props.pauseOnHover,
        maskColor: $widget.props.maskColor || TEST_CONFIG.maskColor,
        links: $widget.props.links === undefined ? TEST_CONFIG.links : $widget.props.links,
        hiddenMaskColor: $widget.props.hiddenMaskColor === undefined ? TEST_CONFIG.hiddenMaskColor : $widget.props.hiddenMaskColor,
        grayMode: $widget.props.grayMode === undefined ? TEST_CONFIG.grayMode : $widget.props.grayMode

    };

    // ... config 计算逻辑 ...

    let imagesData = [];
    try {
        const results = await wixData.query(CMS_CONFIG.collectionId)
            .ascending(CMS_CONFIG.fieldKeys.sort)
            .find();

        if (results.items && results.items.length > 0) {
            imagesData = results.items.map(item => ({
                src: item[CMS_CONFIG.fieldKeys.image],
                alt: item[CMS_CONFIG.fieldKeys.title] || '',
                link: item[CMS_CONFIG.fieldKeys.link] || ''
            }));
        }
    } catch (err) {
        console.log("CMS Query failed, using defaults");
    }

    // ⭐ 核心逻辑：如果在编辑器中，且数据库没拿到数据，则发送默认图片库
    if (imagesData.length === 0) {
        console.log("Empty CMS or Editor Mode: Sending Test Logos");
        imagesData = TEST_LOGOS; 
    }

    const processedImages = imagesData.map(img => ({
        src: getFullImageUrl(img.src),
        alt: img.alt,
        link: img.link
    }));

    htmlComponent.postMessage({ type: 'update', config, images: processedImages });
}

function getFullImageUrl(url) {
    if (!url) return "";

    // External URL
    if (url.startsWith("http") || url.startsWith("//")) {
        return url;
    }

    // Base64 inline
    if (url.startsWith("data:image")) {
        return url;
    }

    // Wix image (jpg / png / webp)
    if (url.startsWith("wix:image://")) {
        const match = url.match(/wix:image:\/\/v1\/([^/]+)/);
        return match ? `https://static.wixstatic.com/media/${match[1]}` : url;
    }

    // Wix vector (SVG)
    if (url.startsWith("wix:vector://")) {
        const match = url.match(/wix:vector:\/\/v1\/([^/]+)/);
        if (match && match[1]) {
            const id = match[1].replace(/\.svg$/i, ''); // 移除已有的 .svg，避免重复
            return `https://static.wixstatic.com/shapes/${id}.svg`;
        }
        return url;
    }

    // Wix shape (SVG)
    if (url.startsWith("wix:shape://")) {
        const match = url.match(/wix:shape:\/\/v1\/([^/]+)/);
        if (match && match[1]) {
            const id = match[1].replace(/\.svg$/i, '');
            return `https://static.wixstatic.com/shapes/${id}.svg`;
        }
        return url;
    }

    return url;
}



async function updateLogoVisibility() {
    try {
        const instance = await wixApplication.getDecodedAppInstance();
        const payPlan = instance.vendorProductId;     // free / basic / plus
        const showLogo = $widget.props.isShowLogo;    // 用户设置
        
        const isPremium = payPlan === 'plus';

        // ① 非 plus → 永远展示
        if (!isPremium) {
            $w('#ziderVectorImage').expand();
            return;
        }

        // ② plus → 再按 showLogo 判断
        if (showLogo) {
            $w('#ziderVectorImage').collapse();   // true → 隐藏
        } else {
            $w('#ziderVectorImage').expand();     // false → 展示
        }

    } catch (error) {
        console.error("Error checking plan:", error);
    }
}