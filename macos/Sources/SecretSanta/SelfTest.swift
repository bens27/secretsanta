import AppKit
import WebKit

/// Launch with SECRETSANTA_SELFTEST=1 to print a JSON report of what the
/// web UI needs from WebKit (secure context, Web Crypto, persistent storage,
/// the native bridge) and quit. Run it twice to check that storage persists.
enum SelfTest {
  static func run(in webView: WKWebView) {
    let script = """
      await new Promise(r => setTimeout(r, 1500));
      const key = 'secretSantaSelfTest';
      const previous = localStorage.getItem(key);
      localStorage.setItem(key, String(Date.now()));
      let encrypt = false;
      try {
        const k = await crypto.subtle.importKey('raw', new Uint8Array(32), { name: 'AES-GCM' }, false, ['encrypt']);
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, k, new Uint8Array(4));
        encrypt = true;
      } catch {}
      let bridge = null;
      try { bridge = await window.webkit.messageHandlers.secretSanta.postMessage({ type: 'copy', text: 'secret santa self-test' }); } catch (e) { bridge = String(e); }
      let unknown = null;
      try { await window.webkit.messageHandlers.secretSanta.postMessage({ type: 'nope' }); } catch (e) { unknown = String(e); }
      return JSON.stringify({
        origin: location.origin,
        href: location.href,
        isSecureContext,
        randomUUID: typeof crypto.randomUUID === 'function' && crypto.randomUUID().length === 36,
        encrypt,
        rendered: document.body.innerText.includes('Secret Santa'),
        stylesheets: document.styleSheets.length,
        previousRun: previous,
        participants: localStorage.getItem('secretSantaParticipants'),
        bridgeCopy: bridge,
        bridgeUnknown: unknown,
      });
      """

    webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
      switch result {
      case .success(let value):
        print("SELFTEST \(value as? String ?? String(describing: value))")
        print("SELFTEST pasteboard=\(NSPasteboard.general.string(forType: .string) ?? "nil")")
      case .failure(let error):
        print("SELFTEST error \(error)")
      }
      fflush(stdout)
      snapshot(webView) { NSApp.terminate(nil) }
    }
  }

  /// Also writes a PNG of the window when SECRETSANTA_SNAPSHOT=<path> is set.
  private static func snapshot(_ webView: WKWebView, then done: @escaping () -> Void) {
    guard let path = ProcessInfo.processInfo.environment["SECRETSANTA_SNAPSHOT"] else {
      done()
      return
    }
    webView.takeSnapshot(with: nil) { image, _ in
      if let tiff = image?.tiffRepresentation, let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:]) {
        try? png.write(to: URL(fileURLWithPath: path))
      }
      done()
    }
  }
}
