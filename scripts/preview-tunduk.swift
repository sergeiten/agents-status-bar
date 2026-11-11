// Compile with Sources/TundukGeometry.swift and Sources/TundukRender.swift (make preview-icons).
// Uses the app's renderer directly; does not launch the app or touch settings/hooks.
import AppKit
import ImageIO
import UniformTypeIdentifiers

@main
struct TundukPreview {
    static func color(_ hex: UInt32) -> NSColor {
        NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255,
                green: CGFloat((hex >> 8) & 255) / 255,
                blue: CGFloat(hex & 255) / 255, alpha: 1)
    }

    static func bitmap(_ width: Int, _ height: Int, _ draw: (NSRect) -> Void) -> NSBitmapImageRep {
        let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
                                  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                                  isPlanar: false, colorSpaceName: .deviceRGB,
                                  bytesPerRow: 0, bitsPerPixel: 0)!
        rep.size = NSSize(width: width, height: height)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
        NSGraphicsContext.current?.imageInterpolation = .high
        draw(NSRect(x: 0, y: 0, width: width, height: height))
        NSGraphicsContext.restoreGraphicsState()
        return rep
    }

    static func text(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat,
                     foreground: NSColor = color(0x242326), bold: Bool = false) {
        (value as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [
            .font: NSFont.systemFont(ofSize: size, weight: bold ? .semibold : .regular),
            .foregroundColor: foreground
        ])
    }

    static func symbol(in rect: NSRect, system: Bool, white: Bool = false, frame: Int? = nil) {
        if !system {
            TundukRenderer.draw(in: rect, system: false, frame: frame)
            return
        }
        let mask = TundukRenderer.image(color: nil, frame: frame)
        let layer = NSImage(size: rect.size, flipped: false) { bounds in
            (white ? NSColor.white : NSColor.black).setFill(); bounds.fill()
            mask.draw(in: bounds, from: .zero, operation: .destinationIn, fraction: 1)
            return true
        }
        layer.draw(in: rect)
    }

    static func waiting(in rect: NSRect) {
        color(0xF2BA2E).setFill()
        NSBezierPath(ovalIn: rect.insetBy(dx: rect.width / 4, dy: rect.height / 4)).fill()
    }

    static func validateRenderer() {
        func rendered(_ frame: Int, system: Bool = false) -> NSBitmapImageRep {
            bitmap(96, 96) { TundukRenderer.draw(in: $0, system: system, frame: frame) }
        }
        func bytes(_ rep: NSBitmapImageRep) -> Data {
            Data(bytes: rep.bitmapData!, count: rep.bytesPerRow * rep.pixelsHigh)
        }
        let start = rendered(0), rotated = rendered(10)  // frame 10 = the peak of the sway
        precondition(bytes(start) == bytes(rendered(TundukRenderer.frameCount)), "Animation loop must close exactly")
        // No backing tile: the corners stay transparent in color mode too.
        precondition(start.colorAt(x: 2, y: 2)!.alphaComponent < 0.01, "Color mode must have no backing tile")
        // A point on the (circular, so rotation-invariant) ring's midline carries the gold.
        let rim = start.colorAt(x: 48, y: 86)!.usingColorSpace(.deviceRGB)!
        precondition(abs(rim.redComponent - 0xE0 / 255.0) < 0.05 && abs(rim.greenComponent - 0xA1 / 255.0) < 0.05
                     && rim.blueComponent < 0.05 && rim.alphaComponent > 0.95, "The crown must use the approved gold")
        // The glyph is a 16pt circle in the 18pt image: nothing beyond radius 10.67 of 12 units.
        precondition(start.colorAt(x: 48, y: 1)!.alphaComponent < 0.01 && start.colorAt(x: 48, y: 7)!.alphaComponent > 0.5,
                     "The crown must span the 16pt circle")
        var crownChanged = false
        for y in 28..<68 { for x in 28..<68 {
            if start.colorAt(x: x, y: y) != rotated.colorAt(x: x, y: y) { crownChanged = true }
        }}
        precondition(crownChanged, "The crown must sway")
        // Matches the reference tündük: the bands cross on the axis just below the center, and the
        // arch below that crossing stays open.
        let rest0 = bitmap(96, 96) { TundukRenderer.draw(in: $0, system: true, frame: nil) }
        precondition(rest0.colorAt(x: 48, y: 50)!.alphaComponent > 0.9, "The innermost bands must cross just below the center")
        precondition(rest0.colorAt(x: 48, y: 69)!.alphaComponent < 0.1, "The arch at the bottom must stay open")
        let system = rendered(0, system: true)
        precondition(system.colorAt(x: 2, y: 2)!.alphaComponent < 0.01, "System mode must have no colored backing")
        // Stopping eases from the live pose to a pose that renders identically to the rest mark.
        for f in [1, 7, 10, 23, 30, TundukRenderer.frameCount - 1] {
            let live = TundukRenderer.pose(frame: f), first = TundukRenderer.outroPose(from: f, step: 0)
            precondition(abs(first - live) < 1e-9,
                         "The outro must start from the live pose")
            let end = TundukRenderer.outroPose(from: f, step: TundukRenderer.outroFrames)
            let restLike = bitmap(96, 96) { TundukRenderer.draw(in: $0, system: true, pose: end) }
            let rest = bitmap(96, 96) { TundukRenderer.draw(in: $0, system: true, frame: nil) }
            var maxDiff: CGFloat = 0
            for y in stride(from: 0, to: 96, by: 2) { for x in stride(from: 0, to: 96, by: 2) {
                maxDiff = max(maxDiff, abs(restLike.colorAt(x: x, y: y)!.alphaComponent - rest.colorAt(x: x, y: y)!.alphaComponent))
            }}
            precondition(maxDiff < 0.02, "The outro must land on the rest pose (frame \(f): \(maxDiff))")
        }
        precondition(TundukRenderer.image(color: nil).isTemplate, "System mode must be adaptive")
        precondition(!TundukRenderer.image(color: .yellow).isTemplate, "Gold mode must keep its color")
        print("Renderer checks passed: gold, 16pt size, reference arch and crossing, sway, seamless loop, snap-free outro, adaptive template")
    }

    static func main() throws {
        validateRenderer()
        let directory = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? "assets/tunduk", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let app = NSImage(contentsOfFile: "assets/app-icon.svg")!
        func save(_ rep: NSBitmapImageRep, _ name: String) throws {
            try rep.representation(using: .png, properties: [:])!.write(to: directory.appendingPathComponent(name))
        }
        try save(bitmap(1024, 1024) { app.draw(in: $0) }, "approved-app-icon.png")
        try save(bitmap(1100, 620) { full in
            color(0xF8F5EF).setFill(); full.fill()
            text("Tündük", x: 48, y: 548, size: 34, bold: true)
            text("Swaying tündük", x: 48, y: 516, size: 17, foreground: color(0x6F6B68))
            symbol(in: NSRect(x: 64, y: 210, width: 240, height: 240), system: true)
            app.draw(in: NSRect(x: 390, y: 150, width: 360, height: 360))
            app.draw(in: NSRect(x: 800, y: 330, width: 64, height: 64))
            app.draw(in: NSRect(x: 918, y: 346, width: 32, height: 32))
            text("64 px", x: 814, y: 298, size: 13, foreground: color(0x6F6B68))
            text("32 px", x: 914, y: 298, size: 13, foreground: color(0x6F6B68))
            text("2-second sway · 20 fps", x: 48, y: 138, size: 16, foreground: color(0x6F6B68))
            for (index, dark) in [false, true].enumerated() {
                let y = CGFloat(70 - index * 44)
                color(dark ? 0x242326 : 0xE9E6E0).setFill()
                NSBezierPath(roundedRect: NSRect(x: 48, y: y, width: 1004, height: 36), xRadius: 8, yRadius: 8).fill()
                symbol(in: NSRect(x: 70, y: y + 9, width: 18, height: 18), system: false)
                symbol(in: NSRect(x: 124, y: y + 9, width: 18, height: 18), system: true, white: dark)
                symbol(in: NSRect(x: 184, y: y, width: 36, height: 36), system: true, white: dark)
                text("18 px: gold / system     36 px: system", x: 256, y: y + 9, size: 12,
                     foreground: dark ? .white : .black)
            }
        }, "approved-preview.png")

        let destination = CGImageDestinationCreateWithURL(directory.appendingPathComponent("approved-animation.gif") as CFURL,
                                                         UTType.gif.identifier as CFString, TundukRenderer.frameCount, nil)!
        CGImageDestinationSetProperties(destination, [kCGImagePropertyGIFDictionary:
            [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary)
        for frame in 0..<TundukRenderer.frameCount {
            let rep = bitmap(960, 400) { full in
                color(0xF8F5EF).setFill(); full.fill()
                for (index, label) in ["Idle", "Working", "Awaiting permission"].enumerated() {
                    let x = CGFloat(index * 320)
                    text(label, x: x + (index == 2 ? 65 : 115), y: 342, size: 18, bold: true)
                    let large = NSRect(x: x + 96, y: 166, width: 128, height: 128)
                    let step: Int? = index == 1 ? frame : nil
                    if index == 2 { waiting(in: large) }
                    else { symbol(in: large, system: false, frame: step) }
                    for (row, dark) in [false, true].enumerated() {
                        let y = CGFloat(82 - row * 42)
                        color(dark ? 0x242326 : 0xE9E6E0).setFill()
                        NSBezierPath(roundedRect: NSRect(x: x + 40, y: y, width: 240, height: 32), xRadius: 7, yRadius: 7).fill()
                        let icon = NSRect(x: x + 66, y: y + 7, width: 18, height: 18)
                        if index == 2 { waiting(in: icon) }
                        else {
                            symbol(in: icon, system: false, frame: step)
                            symbol(in: NSRect(x: x + 112, y: y + 7, width: 18, height: 18), system: true, white: dark, frame: step)
                        }
                        text("18 px", x: x + 164, y: y + 8, size: 12, foreground: dark ? .white : .black)
                    }
                }
            }
            if frame == 0 || frame == 24 || frame == 60 {
                try save(rep, "approved-frame-\(frame).png")
            }
            CGImageDestinationAddImage(destination, rep.cgImage!, [kCGImagePropertyGIFDictionary:
                [kCGImagePropertyGIFDelayTime: 1 / TundukRenderer.framesPerSecond]] as CFDictionary)
        }
        guard CGImageDestinationFinalize(destination) else { fatalError("Could not write animation preview") }
        print("Wrote approved-preview.png, approved-app-icon.png and approved-animation.gif (\(Int(TundukRenderer.swayDuration)) seconds)")
    }
}
