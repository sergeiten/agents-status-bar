import Cocoa

// The tündük menu bar mark (the Kyrgyz-flag crown, see scripts/generate-tunduk.py), gently
// swaying while agents work.
enum TundukRenderer {
    static let framesPerSecond: Double = 20
    static let swayDuration: Double = 2           // one full left-right-left cycle
    static let swayAmplitude = 12 * Double.pi / 180
    static let frameCount = Int(framesPerSecond * swayDuration)
    // Single color mode. Deeper than flag yellow so it still reads on a light menu bar.
    static let gold = NSColor(srgbRed: 0xE0 / 255.0, green: 0xA1 / 255.0, blue: 0x00 / 255.0, alpha: 1)
    static let outroFrames = 8  // ~0.4s at 20 fps: ease from the live angle back to upright

    // Crown angle (radians) at a given animation frame; nil frame = the still, upright rest pose.
    static func pose(frame: Int?) -> Double {
        guard let frame else { return 0 }
        let time = Double((frame % frameCount + frameCount) % frameCount) / framesPerSecond
        return swayAmplitude * sin(2 * Double.pi * time / swayDuration)
    }

    // Angle for outro step `step` (1...outroFrames) when the animation stopped at frame `from`:
    // settle back to upright, eased out, so stopping never snaps.
    static func outroPose(from frame: Int, step: Int) -> Double {
        let t = min(1, Double(step) / Double(outroFrames))
        return pose(frame: frame) * pow(1 - t, 3)
    }

    // nil frame is the still resting mark; nil color selects an adaptive template.
    // Color mode is always gold, regardless of the legacy Orange tint.
    static func image(color: NSColor?, frame: Int? = nil) -> NSImage {
        image(color: color, pose: pose(frame: frame))
    }

    static func image(color: NSColor?, pose angle: Double) -> NSImage {
        let image = NSImage(size: NSSize(width: 18, height: 18), flipped: false) { rect in
            draw(in: rect, system: color == nil, pose: angle)
            return true
        }
        image.isTemplate = color == nil
        return image
    }

    // Shared by the menu bar and the preview so the recording exercises the actual renderer.
    static func draw(in rect: CGRect, system: Bool, frame: Int? = nil) {
        draw(in: rect, system: system, pose: pose(frame: frame))
    }

    static func draw(in rect: CGRect, system: Bool, pose angle: Double) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        context.saveGState()
        defer { context.restoreGState() }
        let side = min(rect.width, rect.height)
        context.translateBy(x: rect.midX - side / 2, y: rect.midY - side / 2)
        context.scaleBy(x: side / 24, y: side / 24)
        // The geometry is generated in SVG coordinates (y down); flip so the arch sits at the bottom.
        context.translateBy(x: 0, y: 24)
        context.scaleBy(x: 1, y: -1)
        context.setShouldAntialias(true)
        context.setFillColor((system ? NSColor.black : gold).cgColor)
        context.translateBy(x: 12, y: 12)
        context.rotate(by: CGFloat(angle))
        context.translateBy(x: -12, y: -12)
        for path in TundukGeometry.crown {
            context.addPath(path)
            context.drawPath(using: .eoFill)
        }
    }
}
