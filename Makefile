.PHONY: build dmg test run clean

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

## Build, then relaunch the freshly built app
run: build
	-pkill -x ClaudeStatusBar
	open "$(APP)"

## Remove build output
clean:
	rm -rf build
