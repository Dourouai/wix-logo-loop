import wixWidget from 'wix-widget';
import wixApplication from 'wix-application';
import wixEditor from 'wix-editor';
import { showToast, navigate } from "wix-dashboard";
$w.onReady(async function () {
    $w("#dashboardBtn").onClick(() => {
        wixEditor.openDashboardPanel({ url: 'app/f1615a5b-65ed-4121-ae57-f2194f350030/zider-dashboard' });

    });

    // Initialize panel with current widget props
    const props = await wixWidget.getProps();

    // Upgrade page link
    const appInstance = await wixApplication.getDecodedAppInstance();
    const upgradeURL = `https://www.wix.com/apps/upgrade/${appInstance.appDefId}?appInstanceId=${appInstance.instanceId}`;
    console.log('App instance:', appInstance);

    $w('#upgradeBtn').link = upgradeURL;
    $w('#upgradeText').link = upgradeURL;

    const payPlan = appInstance.vendorProductId;
    const isPremium = payPlan === 'plus'; // 定义一个变量方便后续判断
    // 如果 payPlan 是 premium，设置 premiumPlan 的 checked 属性

    // 如果 payPlan 是 premium，设置 premiumPlan 的 checked 属性
    // 如果 payPlan 是 premium，设置 premiumPlan 的 checked 属性
    // 控制面板开关状态逻辑

    if (isPremium) {
        // --- 付费用户：启用高级功能 ---
        $w("#hiddenLogo").enable();
        $w("#grayMode").enable();
        $w("#enableMobileSettings").enable();

        // 🟢 修复：付费模式下，要记得把移动端输入框启用（解开禁用）
        $w("#mobileLogoHeight").enable();
        $w("#mobileSpeed").enable();
        $w("#mobileGap").enable();

    } else {
        // --- 免费用户：禁用并重置 UI ---
        // 注意：这里只是 UI 变灰，为了数据一致性，通常建议保持 checked 状态或在保存时强制 false
        // 这里按照你的逻辑，强制设为 false
        $w("#hiddenLogo").disable();
        $w("#hiddenLogo").checked = false;
        // 建议同时更新 props，以免 UI 显示 false 但实际还是 true (可选)
        wixWidget.setProps({ isShowLogo: false });

        $w("#grayMode").disable();
        $w("#grayMode").checked = false;
        // 建议同时更新 props
        wixWidget.setProps({ grayMode: false });

        $w("#enableMobileSettings").disable();
        $w("#enableMobileSettings").checked = false;
        // 建议同时更新 props
        wixWidget.setProps({ enableMobileSettings: false });

        $w("#mobileLogoHeight").disable();
        $w("#mobileSpeed").disable();
        $w("#mobileGap").disable();
    }

    // 5. 初始化 UI 值 (UI Sync)
    // ----------------------------------------
    $w('#hiddenLogo').checked = props.isShowLogo;
    $w('#logoHeight').value = props.logoHeight;
    $w('#speed').value = props.speed;
    $w('#gap').value = props.gap;
    $w('#links').checked = props.links;
    $w('#pauseOnHover').checked = props.pauseOnHover;
    $w('#grayMode').checked = props.grayMode;
    $w('#hiddenMaskColor').checked = props.hiddenMaskColor;

    // 🟢 修复：ColorPicker 使用 value，而不是 checked
    $w('#maskColor').value = props.maskColor || "#ffffff";

    // 🟢 修复：初始化 enableMobileSettings
    $w('#enableMobileSettings').checked = props.enableMobileSettings;

    // Mobile Values
    $w('#mobileLogoHeight').value = props.mobileLogoHeight;
    $w('#mobileSpeed').value = props.mobileSpeed;
    $w('#mobileGap').value = props.mobileGap;

    // Direction Options
    const direction = props.direction || "left";
    $w('#direction').options = [
        { label: "Scroll logos to the left", value: "left" },
        { label: "Scroll logos to the right", value: "right" }
    ];
    $w('#direction').value = direction;

    // 6. 绑定事件处理器 (Event Handlers)
    // ----------------------------------------

    // Mobile Settings
    $w('#mobileLogoHeight').onChange((event) => {
        wixWidget.setProps({ mobileLogoHeight: event.target.value })
    });
    $w('#mobileSpeed').onChange((event) => {
        wixWidget.setProps({ mobileSpeed: event.target.value })
    });
    $w('#mobileGap').onChange((event) => {
        wixWidget.setProps({ mobileGap: event.target.value })
    });

    // 🟢 修复：添加 enableMobileSettings 的保存逻辑
    $w('#enableMobileSettings').onChange((event) => {
        wixWidget.setProps({ enableMobileSettings: event.target.checked });
        // 可选：如果是代码控制显示/隐藏，可以在这里写逻辑。
        // 如果是用 Display Condition 控制，则不需要额外代码。
    });

    // Standard Settings
    $w('#hiddenLogo').onChange((event) => {
        wixWidget.setProps({ isShowLogo: event.target.checked })
    });
    $w('#grayMode').onChange((event) => {
        wixWidget.setProps({ grayMode: event.target.checked })
    });
    $w('#logoHeight').onChange((event) => {
        wixWidget.setProps({ logoHeight: event.target.value })
    });
    $w('#speed').onChange((event) => {
        wixWidget.setProps({ speed: event.target.value })
    });
    // 🟢 修复：去掉了重复的 gap onChange
    $w('#gap').onChange((event) => {
        wixWidget.setProps({ gap: event.target.value });
    });

    $w('#direction').onChange((event) => {
        wixWidget.setProps({ direction: event.target.value });
    });

    $w('#maskColor').onChange((event) => {
        const colorValue = event.target.value;
        console.log("🎨 maskColor changed:", colorValue);
        wixWidget.setProps({ maskColor: colorValue });
    });

    $w('#hiddenMaskColor').onChange((event) => {
        wixWidget.setProps({ hiddenMaskColor: event.target.checked })
    });

    $w('#pauseOnHover').onChange((event) => {
        wixWidget.setProps({ pauseOnHover: event.target.checked })
    });
    $w('#links').onChange((event) => {
        wixWidget.setProps({ links: event.target.checked })
    });
});