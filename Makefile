.PHONY: build dmg test run clean icons preview-icons sound-candidates

APP := build/Claude Status Bar.app

## Build the app bundle (build/Claude Status Bar.app)
build:
	./build.sh

## Build the app and package a signed DMG (build/ClaudeStatusBar.dmg)
dmg:
	./build.sh --dmg

## Run the hook/installer tests
test:
	node --test tests/*.test.js

## Regenerate the tündük SVGs, native paths, resting mask and app icon
icons:
	python3 scripts/generate-tunduk.py
	swift -module-cache-path build/swift-module-cache scripts/render-mark.swift build

## Render still and animated previews using the app's tündük renderer
preview-icons:
	mkdir -p build
	swiftc -module-cache-path build/swift-module-cache Sources/TundukGeometry.swift Sources/TundukRender.swift scripts/preview-tunduk.swift -o build/preview-tunduk -framework Cocoa
	build/preview-tunduk assets/tunduk

## Generate completion-sound candidates with ElevenLabs (needs an API key; see the script)
sound-candidates:
	python3 scripts/generate-sounds.py

## Build, then relaunch the freshly built app
run: build
	-pkill -x ClaudeStatusBar
	open "$(APP)"

## Remove build output
clean:
	rm -rf build
