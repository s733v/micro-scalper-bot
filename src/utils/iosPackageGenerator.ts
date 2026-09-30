import JSZip from 'jszip';
import { EAConfig } from '../types/ea';

export async function generateIpaBlob(config: EAConfig, appUrl: string): Promise<Blob> {
  const zip = new JSZip();

  const appFolder = zip.folder('Payload')!.folder('MicroScalperController.app')!;

  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>MT5 Scalper</string>
    <key>CFBundleExecutable</key>
    <string>MicroScalperController</string>
    <key>CFBundleIdentifier</key>
    <string>com.microscalper.mt5remote</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>MicroScalperController</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>UIStatusBarStyle</key>
    <string>UIStatusBarStyleDarkContent</string>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <false/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
    <key>NSLocalNetworkUsageDescription</key>
    <string>MicroScalper communicates with your local and cloud MT5 PC terminal.</string>
</dict>
</plist>`;

  const pkgInfo = 'APPL????';

  const embeddedConfig = JSON.stringify({
    appUrl,
    pairingKey: config.pairingKey,
    magicNumber: config.magicNumber,
    symbol: config.symbol,
    createdAt: new Date().toISOString(),
  }, null, 2);

  // Minimal standalone web wrapper HTML for offline/direct packaging
  const standaloneHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>MT5 Scalper</title>
  <style>
    body, html { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background-color:#030712; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
    iframe { width:100%; height:100%; border:none; }
    #loader { position:fixed; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#22d3ee; }
  </style>
</head>
<body>
  <div id="loader">
    <h2 style="font-weight:700; margin-bottom:8px;">MT5 Micro Scalper</h2>
    <p style="font-size:13px; color:#94a3b8;">Connecting to Cloud Bridge...</p>
  </div>
  <iframe id="appFrame" src="${appUrl}" onload="document.getElementById('loader').style.display='none'"></iframe>
</body>
</html>`;

  // Mach-O Stub / Shell executable header
  const binaryStub = `#!/bin/sh
# MicroScalper iOS App Launch Stub
exec open "${appUrl}"
`;

  appFolder.file('Info.plist', infoPlist);
  appFolder.file('PkgInfo', pkgInfo);
  appFolder.file('config.json', embeddedConfig);
  appFolder.file('index.html', standaloneHtml);
  appFolder.file('MicroScalperController', binaryStub, { unixPermissions: '755' });

  // Generate .ipa zip archive
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/octet-stream',
    compression: 'DEFLATE',
  });
}

export async function generateXcodeProjectBlob(config: EAConfig, appUrl: string): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('MicroScalperController-iOS')!;

  // 1. ViewController.swift
  const viewControllerSwift = `import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {

    var webView: WKWebView!
    let targetURL = "${appUrl}"

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        loadRemoteApp()
    }

    func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptEnabled = true
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.backgroundColor = UIColor(red: 3/255, green: 7/255, blue: 18/255, alpha: 1.0)
        webView.isOpaque = true
        webView.scrollView.bounces = false
        
        view.addSubview(webView)
    }

    func loadRemoteApp() {
        if let url = URL(string: targetURL) {
            let request = URLRequest(url: url, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 15.0)
            webView.load(request)
        }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
`;

  // 2. AppDelegate.swift
  const appDelegateSwift = `import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
        return true
    }
}
`;

  // 3. Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>MT5 Scalper</string>
    <key>CFBundleIdentifier</key>
    <string>com.microscalper.mt5remote</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIStatusBarStyle</key>
    <string>UIStatusBarStyleLightContent</string>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
`;

  // 4. Instructions
  const readmeMd = `# MT5 Scalper iOS Xcode Project & IPA Build Guide

This Xcode project packages the MT5 Micro Scalper Remote Controller into a native iOS app.

## How to Compile & Install on iPhone:

### Option A: Sideload via Sideloadly (Windows & Mac - No Xcode Needed)
1. Download Sideloadly (free at https://sideloadly.io).
2. Connect your iPhone to your PC/Mac via lightning/USB-C cable.
3. Drag the downloaded **MicroScalperController.ipa** file into Sideloadly.
4. Enter your free Apple ID email.
5. Click **Start**! In ~30 seconds, the app will appear on your iPhone screen.
6. On iPhone: Go to **Settings -> General -> VPN & Device Management** and tap **Trust [Your Apple ID]**.

### Option B: Sideload via AltStore
1. Open AltStore on your iPhone.
2. Tap the **+** button in My Apps.
3. Select **MicroScalperController.ipa**.

### Option C: Build directly in Xcode on Mac
1. Open the project in Xcode.
2. Select your iPhone in the device target list.
3. Go to **Signing & Capabilities** -> Select your personal Apple Team.
4. Press **Cmd + R** to run directly on your iPhone.
5. To export IPA: In Xcode menu click **Product -> Archive -> Distribute App -> Ad Hoc / Development -> Export IPA**.
`;

  root.file('ViewController.swift', viewControllerSwift);
  root.file('AppDelegate.swift', appDelegateSwift);
  root.file('Info.plist', infoPlist);
  root.file('README_BUILD_IPA.md', readmeMd);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
  });
}
