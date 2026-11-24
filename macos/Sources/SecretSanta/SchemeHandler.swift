import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the bundled web build (Resources/web) under `secretsanta://app/`.
///
/// A private scheme gives the page a stable origin, so its localStorage
/// (participants, settings) persists between launches. Unknown paths fall
/// back to index.html, like the single-page app expects.
final class SchemeHandler: NSObject, WKURLSchemeHandler {
  static let scheme = "secretsanta"
  static let host = "app"
  /// Must match `base` in vite.config.mts.
  static let basePath = "/secretsanta/"
  static var startURL: URL { URL(string: "\(scheme)://\(host)\(basePath)")! }

  private let root: URL

  init(root: URL) {
    self.root = root.standardizedFileURL
  }

  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url else {
      task.didFailWithError(URLError(.badURL))
      return
    }

    var path = url.path
    if path.hasPrefix(Self.basePath) {
      path.removeFirst(Self.basePath.count)
    } else {
      path = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    var file = root.appendingPathComponent(path).standardizedFileURL
    var isDirectory: ObjCBool = false

    // Refuse anything that escapes the web root (e.g. "..").
    let insideRoot = file.path.hasPrefix(root.path + "/") || file.path == root.path
    if !insideRoot || !FileManager.default.fileExists(atPath: file.path, isDirectory: &isDirectory) || isDirectory.boolValue {
      file = root.appendingPathComponent("index.html")
    }

    do {
      let data = try Data(contentsOf: file)
      let mimeType = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
      let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
        "Content-Type": mimeType,
        "Content-Length": String(data.count),
        "Cache-Control": "no-cache",
      ])!
      task.didReceive(response)
      task.didReceive(data)
      task.didFinish()
    } catch {
      task.didFailWithError(error)
    }
  }

  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
