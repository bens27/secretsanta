import AuthenticationServices
import CryptoKit
import Foundation

/// Google OAuth for a native app: authorization code flow with PKCE, shown in
/// the system browser sheet (ASWebAuthenticationSession). Uses an "iOS" type
/// OAuth client, whose redirect URI is the reversed client ID; such clients
/// have no secret. Only the `gmail.send` scope is requested.
@MainActor
final class GmailAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
  static let scope = "https://www.googleapis.com/auth/gmail.send"

  struct Token {
    let accessToken: String
    let expiresIn: Int
  }

  private let clientId: String
  private weak var anchor: NSWindow?
  private var session: ASWebAuthenticationSession?

  init(clientId: String, anchor: NSWindow?) {
    self.clientId = clientId.trimmingCharacters(in: .whitespacesAndNewlines)
    self.anchor = anchor
  }

  /// "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc"
  static func redirectScheme(forClientId clientId: String) throws -> String {
    let suffix = ".apps.googleusercontent.com"
    guard clientId.hasSuffix(suffix) else {
      throw BridgeError("The client ID should end with \(suffix)")
    }
    return "com.googleusercontent.apps." + clientId.dropLast(suffix.count)
  }

  func authorize() async throws -> Token {
    let scheme = try Self.redirectScheme(forClientId: clientId)
    let redirectURI = "\(scheme):/oauth2redirect"

    let verifier = Self.randomURLSafeString(bytes: 32)
    let challenge = Self.base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
    let state = Self.randomURLSafeString(bytes: 16)

    var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
    components.queryItems = [
      URLQueryItem(name: "client_id", value: clientId),
      URLQueryItem(name: "redirect_uri", value: redirectURI),
      URLQueryItem(name: "response_type", value: "code"),
      URLQueryItem(name: "scope", value: Self.scope),
      URLQueryItem(name: "code_challenge", value: challenge),
      URLQueryItem(name: "code_challenge_method", value: "S256"),
      URLQueryItem(name: "state", value: state),
    ]

    let callback: URL = try await withCheckedThrowingContinuation { continuation in
      let session = ASWebAuthenticationSession(url: components.url!, callbackURLScheme: scheme) { url, error in
        if let url {
          continuation.resume(returning: url)
        } else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
          continuation.resume(throwing: BridgeError("Sign-in was cancelled"))
        } else {
          continuation.resume(throwing: error ?? BridgeError("Sign-in failed"))
        }
      }
      session.presentationContextProvider = self
      self.session = session
      if !session.start() {
        continuation.resume(throwing: BridgeError("Couldn't open the Google sign-in window"))
      }
    }

    let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
    func item(_ name: String) -> String? { items.first { $0.name == name }?.value }

    if let error = item("error") {
      throw BridgeError("Google refused the authorization: \(error)")
    }
    guard item("state") == state, let code = item("code") else {
      throw BridgeError("Unexpected response from Google")
    }

    return try await exchange(code: code, verifier: verifier, redirectURI: redirectURI)
  }

  private func exchange(code: String, verifier: String, redirectURI: String) async throws -> Token {
    var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
    request.httpMethod = "POST"
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    request.httpBody = Self.formEncode([
      "code": code,
      "client_id": clientId,
      "redirect_uri": redirectURI,
      "grant_type": "authorization_code",
      "code_verifier": verifier,
    ])

    let (data, _) = try await URLSession.shared.data(for: request)
    let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]

    guard let accessToken = json["access_token"] as? String else {
      let message = json["error_description"] as? String ?? json["error"] as? String ?? "Token exchange failed"
      throw BridgeError(message)
    }

    return Token(accessToken: accessToken, expiresIn: json["expires_in"] as? Int ?? 3600)
  }

  /// Posts an already-encoded message (base64url RFC 2822, built by the web UI).
  static func send(accessToken: String, raw: String) async throws -> (Int, String) {
    var request = URLRequest(url: URL(string: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send")!)
    request.httpMethod = "POST"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: ["raw": raw])

    let (data, response) = try await URLSession.shared.data(for: request)
    return ((response as? HTTPURLResponse)?.statusCode ?? 0, String(decoding: data, as: UTF8.self))
  }

  static func revoke(accessToken: String) async throws {
    var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/revoke")!)
    request.httpMethod = "POST"
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    request.httpBody = formEncode(["token": accessToken])
    _ = try await URLSession.shared.data(for: request)
  }

  nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    MainActor.assumeIsolated {
      anchor ?? NSApp.keyWindow ?? ASPresentationAnchor()
    }
  }

  // MARK: - Helpers

  private static func randomURLSafeString(bytes count: Int) -> String {
    var bytes = [UInt8](repeating: 0, count: count)
    _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
    return base64URL(Data(bytes))
  }

  private static func base64URL(_ data: Data) -> String {
    data.base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }

  private static func formEncode(_ fields: [String: String]) -> Data {
    var allowed = CharacterSet.alphanumerics
    allowed.insert(charactersIn: "-._~")
    return fields
      .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: allowed)!)" }
      .joined(separator: "&")
      .data(using: .utf8)!
  }
}
