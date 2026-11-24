import AppKit
import WebKit

/// Answers `window.webkit.messageHandlers.secretSanta.postMessage(...)` calls
/// from the web UI (see src/utils/native.ts). Each call returns a promise.
@MainActor
final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply {
  static let name = "secretSanta"

  weak var window: NSWindow?
  private var auth: GmailAuth?

  func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
    // Only trust messages from our own bundled pages.
    guard message.frameInfo.securityOrigin.protocol == SchemeHandler.scheme,
          let body = message.body as? [String: Any],
          let type = body["type"] as? String
    else {
      replyHandler(nil, "Rejected message")
      return
    }

    Task { @MainActor in
      do {
        replyHandler(try await handle(type: type, body: body), nil)
      } catch {
        replyHandler(nil, error.localizedDescription)
      }
    }
  }

  private func handle(type: String, body: [String: Any]) async throws -> Any? {
    switch type {
    case "copy":
      let text = try string(body, "text")
      NSPasteboard.general.clearContents()
      NSPasteboard.general.setString(text, forType: .string)
      return true

    case "gmailAuthorize":
      let auth = GmailAuth(clientId: try string(body, "clientId"), anchor: window)
      self.auth = auth
      defer { self.auth = nil }
      let token = try await auth.authorize()
      return ["accessToken": token.accessToken, "expiresIn": token.expiresIn]

    case "gmailSend":
      let (status, responseBody) = try await GmailAuth.send(accessToken: try string(body, "accessToken"), raw: try string(body, "raw"))
      return ["status": status, "body": responseBody]

    case "gmailRevoke":
      try await GmailAuth.revoke(accessToken: try string(body, "accessToken"))
      return true

    default:
      throw BridgeError("Unknown message type: \(type)")
    }
  }

  private func string(_ body: [String: Any], _ key: String) throws -> String {
    guard let value = body[key] as? String, !value.isEmpty else {
      throw BridgeError("Missing \(key)")
    }
    return value
  }
}

struct BridgeError: LocalizedError {
  let errorDescription: String?
  init(_ message: String) { errorDescription = message }
}
