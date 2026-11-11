// Icon generator. Renders the SVG sources with AppKit (no external tools needed; SVG loading
// requires macOS 14+ on the build machine, the app itself still targets macOS 12).
//
//   swift scripts/render-mark.swift build
//       assets/app-icon.svg  -> assets/AppIcon.icns (via iconutil)
//   swift scripts/render-mark.swift preview <dir> <out.png>
//       Contact sheet of <dir>/mark-N.svg + app-N.svg: menu bar size, both tints, light/dark bars.

import AppKit

let orange = NSColor(srgbRed: 0.851, green: 0.467, blue: 0.341, alpha: 1)  // matches the app's "Orange"

func loadSVG(_ path: String) -> NSImage {
    guard let img = NSImage(contentsOfFile: path) else { fatalError("cannot load \(path)") }
    return img
}

// Render `img` into a w x h RGBA bitmap (exact pixel size, independent of screen scale).
func bitmap(_ w: Int, _ h: Int, _ draw: (NSRect) -> Void) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = NSSize(width: w, height: h)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    draw(NSRect(x: 0, y: 0, width: w, height: h))
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func png(_ rep: NSBitmapImageRep) -> Data { rep.representation(using: .png, properties: [:])! }

// Mask tinted with `color` (nil = black, like a template rendered on a light bar).
func tinted(_ mask: NSImage, _ color: NSColor, in r: NSRect) {
    let layer = NSImage(size: r.size, flipped: false) { rect in
        color.setFill(); rect.fill()
        mask.draw(in: rect, from: .zero, operation: .destinationIn, fraction: 1)
        return true
    }
    layer.draw(in: r)
}

func build() {
    let app = loadSVG("assets/app-icon.svg")
    let set = "build/AppIcon.iconset"
    try? FileManager.default.removeItem(atPath: set)
    try! FileManager.default.createDirectory(atPath: set, withIntermediateDirectories: true)
    for base in [16, 32, 128, 256, 512] {
        for scale in [1, 2] {
            let px = base * scale
            let name = scale == 1 ? "icon_\(base)x\(base).png" : "icon_\(base)x\(base)@2x.png"
            try! png(bitmap(px, px) { r in app.draw(in: r) }).write(to: URL(fileURLWithPath: "\(set)/\(name)"))
        }
    }
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
    p.arguments = ["-c", "icns", set, "-o", "assets/AppIcon.icns"]
    try! p.run(); p.waitUntilExit()
    guard p.terminationStatus == 0 else { fatalError("iconutil failed") }
    print("Wrote assets/AppIcon.icns")
}

func preview(_ dir: String, _ out: String) {
    let fm = FileManager.default
    let marks = (try! fm.contentsOfDirectory(atPath: dir)).filter { $0.hasPrefix("mark-") && $0.hasSuffix(".svg") }.sorted()
    let rowH = 300, W = 1500
    let rep = bitmap(W, rowH * marks.count) { full in
        NSColor.white.setFill(); full.fill()
        for (i, f) in marks.enumerated() {
            let y = CGFloat(rowH * (marks.count - 1 - i))
            let mark = loadSVG("\(dir)/\(f)")
            let label = f.replacingOccurrences(of: ".svg", with: "") as NSString
            label.draw(at: NSPoint(x: 20, y: y + CGFloat(rowH) - 40),
                       withAttributes: [.font: NSFont.boldSystemFont(ofSize: 24)])
            // Menu bar strips at 2x (18pt = 36px): dark bar, light bar; each with System + Orange tint.
            for (j, (bar, fg)) in [(NSColor(white: 0.12, alpha: 1), NSColor.white),
                                   (NSColor(white: 0.93, alpha: 1), NSColor.black)].enumerated() {
                let sy = y + 170 - CGFloat(j) * 70
                bar.setFill(); NSRect(x: 20, y: sy, width: 300, height: 48).fill()
                tinted(mark, fg, in: NSRect(x: 40, y: sy + 6, width: 36, height: 36))
                tinted(mark, orange, in: NSRect(x: 100, y: sy + 6, width: 36, height: 36))
                // Actual 1x pixel size, for honesty about legibility.
                let tiny = NSImage(size: NSSize(width: 18, height: 18), flipped: false) { r in tinted(mark, fg, in: r); return true }
                tiny.draw(in: NSRect(x: 170, y: sy + 15, width: 18, height: 18))
            }
            // Large view of the mask.
            tinted(mark, .black, in: NSRect(x: 360, y: y + 20, width: 240, height: 240))
            // App icon variant.
            let appPath = "\(dir)/\(f.replacingOccurrences(of: "mark-", with: "app-"))"
            if fm.fileExists(atPath: appPath) {
                NSColor(white: 0.12, alpha: 1).setFill(); NSRect(x: 640, y: y + 10, width: 280, height: 280).fill()
                loadSVG(appPath).draw(in: NSRect(x: 650, y: y + 20, width: 260, height: 260))
                NSColor(white: 0.93, alpha: 1).setFill(); NSRect(x: 940, y: y + 10, width: 280, height: 280).fill()
                loadSVG(appPath).draw(in: NSRect(x: 950, y: y + 20, width: 260, height: 260))
                loadSVG(appPath).draw(in: NSRect(x: 1250, y: y + 130, width: 64, height: 64))
                loadSVG(appPath).draw(in: NSRect(x: 1340, y: y + 146, width: 32, height: 32))
            }
        }
    }
    try! png(rep).write(to: URL(fileURLWithPath: out))
    print("Wrote \(out)")
}

let args = CommandLine.arguments
switch args.count > 1 ? args[1] : "" {
case "build": build()
case "preview" where args.count == 4: preview(args[2], args[3])
default: print("usage: render-mark.swift build | preview <dir> <out.png>"); exit(1)
}
