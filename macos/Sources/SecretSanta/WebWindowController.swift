import AppKit
import WebKit

final class WebWindowController: NSWindowController, WKNavigationDelegate, WKUIDelegate {
  private let webView: WKWebView
  private let bridge: NativeBridge

  init() {
    let webRoot = Bundle.main.resourceURL!.appendingPathComponent("web")

    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .default()
    configuration.setURLSchemeHandler(SchemeHandler(root: webRoot), forURLScheme: SchemeHandler.scheme)

    let bridge = NativeBridge()
    configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: NativeBridge.name)

    // A self-test run has to be frontmost (WebKit pauses animations in
    // background windows), so it ignores real keyboard input: otherwise
    // whatever the user is typing elsewhere lands in the autofocused name field.
    if ProcessInfo.processInfo.environment["SECRETSANTA_SELFTEST"] == "1" {
      let blockInput = "for (const t of ['keydown', 'keypress', 'beforeinput', 'paste', 'drop']) addEventListener(t, e => { if (e.isTrusted) e.preventDefault(); }, true);"
      configuration.userContentController.addUserScript(WKUserScript(source: blockInput, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    webView = WKWebView(frame: .zero, configuration: configuration)
    self.bridge = bridge

    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
      styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
      backing: .buffered,
      defer: false
    )
    window.title = "Secret Santa"
    window.titlebarAppearsTransparent = true
    window.minSize = NSSize(width: 420, height: 500)
    window.contentView = webView
    window.setFrameAutosaveName("SecretSantaMainWindow")
    if !window.setFrameUsingName("SecretSantaMainWindow") {
      window.center()
    }

    super.init(window: window)

    bridge.window = window
    webView.navigationDelegate = self
    webView.uiDelegate = self
    #if DEBUG
    if #available(macOS 13.3, *) {
      webView.isInspectable = true
    }
    #endif

    webView.load(URLRequest(url: SchemeHandler.startURL))
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func reload() {
    webView.reload()
  }

  // MARK: - Navigation

  // Keep the app on its own pages; anything else (GitHub, sponsor link...)
  // opens in the default browser.
  func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    guard let url = action.request.url else {
      decisionHandler(.cancel)
      return
    }

    if url.scheme == SchemeHandler.scheme || url.scheme == "about" {
      decisionHandler(.allow)
    } else {
      NSWorkspace.shared.open(url)
      decisionHandler(.cancel)
    }
  }

  // Links with target="_blank".
  func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
    if let url = action.request.url {
      NSWorkspace.shared.open(url)
    }
    return nil
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    if ProcessInfo.processInfo.environment["SECRETSANTA_SELFTEST"] == "1" {
      SelfTest.run(in: webView)
    }
  }

  // MARK: - JavaScript dialogs (WebKit shows nothing unless we implement these)

  func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
    let alert = NSAlert()
    alert.messageText = message
    alert.addButton(withTitle: "OK")
    present(alert) { _ in completionHandler() }
  }

  func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
    let alert = NSAlert()
    alert.messageText = message
    alert.addButton(withTitle: "OK")
    alert.addButton(withTitle: "Cancel")
    present(alert) { completionHandler($0 == .alertFirstButtonReturn) }
  }

  private func present(_ alert: NSAlert, completion: @escaping (NSApplication.ModalResponse) -> Void) {
    if let window {
      alert.beginSheetModal(for: window, completionHandler: completion)
    } else {
      completion(alert.runModal())
    }
  }
}
