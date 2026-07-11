# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-send-message.spec.ts >> login → send message → verify
- Location: e2e/login-send-message.spec.ts:3:5

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

╔════════════════════════════════════════════════════════════════════════════════════════════════╗
║ Looks like you launched a headed browser without having a XServer running.                     ║
║ Set either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright. ║
║                                                                                                ║
║ <3 Playwright Team                                                                             ║
╚════════════════════════════════════════════════════════════════════════════════════════════════╝
Call log:
  - <launching> /home/huytq/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-edgeupdater --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-1zY2aB --remote-debugging-pipe --no-startup-window
  - <launched> pid=545042
  - [pid=545042][err] [545042:545042:0711/194542.366097:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:257] Missing X server or $DISPLAY
  - [pid=545042][err] [545042:545042:0711/194542.366132:ERROR:ui/aura/env.cc:246] The platform failed to initialize.  Exiting.
  - [pid=545042] <gracefully close start>
  - [pid=545042] <kill>
  - [pid=545042] <will force kill>
  - [pid=545042] <process did exit: exitCode=1, signal=null>
  - [pid=545042] starting temporary directories cleanup
  - [pid=545042] finished temporary directories cleanup
  - [pid=545042] <gracefully close end>

```