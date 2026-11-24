// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "SecretSanta",
  platforms: [.macOS(.v13)],
  targets: [
    .executableTarget(
      name: "SecretSanta",
      path: "Sources/SecretSanta"
    ),
  ]
)
