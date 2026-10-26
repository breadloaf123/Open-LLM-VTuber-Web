/* eslint-disable no-shadow */
// import { StrictMode } from 'react';
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Footer from "./components/footer/footer";
import { AiStateProvider } from "./context/ai-state-context";
import { Live2DConfigProvider, useLive2DConfig } from "./context/live2d-config-context";
import { SubtitleProvider } from "./context/subtitle-context";
import { BgUrlProvider } from "./context/bgurl-context";
import WebSocketHandler from "./services/websocket-handler";
import { CameraProvider } from "./context/camera-context";
import { ChatHistoryProvider } from "./context/chat-history-context";
import { CharacterConfigProvider } from "./context/character-config-context";
import { Toaster } from "./components/ui/toaster";
import { VADProvider } from "./context/vad-context";
import { Live2D } from "./components/canvas/live2d";
import { SpriteAvatar } from "./components/canvas/sprite-avatar";
import VtuberBox from "./components/canvas/vtuber-box";
import AppHeader from "./components/header/app-header";
import SafetyStrip from "./components/safety/safety-strip";
import ChatHistoryPanel from "./components/sidebar/chat-history-panel";
import TitleBar from "./components/electron/title-bar";
import { InputSubtitle } from "./components/electron/input-subtitle";
import { ProactiveSpeakProvider } from "./context/proactive-speak-context";
import { ScreenCaptureProvider } from "./context/screen-capture-context";
import { GroupProvider } from "./context/group-context";
import { BrowserProvider } from "./context/browser-context";
import { ModeProvider, useMode } from "./context/mode-context";

/** Chakra's defaults with the brand font, so drawers and menus match the app */
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        body: { value: "var(--yd-font)" },
        heading: { value: "var(--yd-font)" },
      },
    },
  },
});

/** The sprite fills the whole VTuber box; the frame has no footer to keep clear */
const SPRITE_IN_BOX = { bottomInset: 0, fitScale: 1 / 0.86 };

function AppContent(): JSX.Element {
  const { t } = useTranslation();
  const { mode } = useMode();
  const { modelInfo } = useLive2DConfig();
  const isSpriteAvatar = modelInfo?.avatarType === "sprite";
  const isElectron = window.api !== undefined;
  const isPet = mode === "pet";

  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.documentElement.style.position = 'fixed';
  document.body.style.position = 'fixed';
  document.documentElement.style.width = '100%';
  document.body.style.width = '100%';

  // The Electron title bar takes the top 30px in window mode
  const shellStyle = isElectron && !isPet
    ? { marginTop: "30px", height: "calc(var(--vh, 1vh) * 100 - 30px)" }
    : undefined;

  // The VTuber box keeps the same place in the tree in both modes, so switching
  // between window and pet mode never reloads the avatar
  return (
    <>
      {isElectron && !isPet && <TitleBar />}
      <div className={isPet ? "yd-pet" : "yd-app"} style={shellStyle}>
        {!isPet && <AppHeader />}
        <main className="yd-main">
          {!isPet && (
            <section className="yd-conversation" aria-label={t("conversation.label")}>
              <ChatHistoryPanel />
              <Footer />
            </section>
          )}
          <VtuberBox pet={isPet}>
            {isSpriteAvatar ? <SpriteAvatar {...(!isPet && SPRITE_IN_BOX)} /> : <Live2D />}
          </VtuberBox>
        </main>
        {!isPet && <SafetyStrip />}
      </div>
      {isPet && <InputSubtitle />}
    </>
  );
}

function App(): JSX.Element {
  return (
    <ChakraProvider value={system}>
      {/* ModeProvider needs to wrap AppContent to provide mode to getGlobalStyles */}
      <ModeProvider>
        <AppWithGlobalStyles />
      </ModeProvider>
    </ChakraProvider>
  );
}

// New component to access mode for global styles
function AppWithGlobalStyles(): JSX.Element {
  return (
    <>
      <CameraProvider>
        <ScreenCaptureProvider>
          <CharacterConfigProvider>
            <ChatHistoryProvider>
              <AiStateProvider>
                <ProactiveSpeakProvider>
                  <Live2DConfigProvider>
                    <SubtitleProvider>
                      <VADProvider>
                        <BgUrlProvider>
                          <GroupProvider>
                            <BrowserProvider>
                              <WebSocketHandler>
                                <Toaster />
                                <AppContent />
                              </WebSocketHandler>
                            </BrowserProvider>
                          </GroupProvider>
                        </BgUrlProvider>
                      </VADProvider>
                    </SubtitleProvider>
                  </Live2DConfigProvider>
                </ProactiveSpeakProvider>
              </AiStateProvider>
            </ChatHistoryProvider>
          </CharacterConfigProvider>
        </ScreenCaptureProvider>
      </CameraProvider>
    </>
  );
}

export default App;
