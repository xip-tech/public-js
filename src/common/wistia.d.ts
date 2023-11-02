// This file is incomplete and was generated mostly by ChatGPT. We can fill it out more as we need to.
declare module Wistia {
  type WistiaPlayerEvent = {
    id: string;
    onHasData?: (video: WistiaPlayer) => void;
    onEmbedded?: (video: WistiaPlayer) => void;
    onReady?: (video: WistiaPlayer) => void;
  };

  interface WistiaEventCallbacks {
    play: () => void;
    conversion: (
      type: 'pre-roll-email' | 'mid-roll-email' | 'post-roll-email',
      email?: string | null,
      firstName?: string | null,
      lastName?: string | null,
    ) => void;
    percentwatchedchanged: (percent: number, lastPercent: number) => void;
  }

  type WistiaPlayerEventCallbackName = keyof WistiaEventCallbacks;

  interface WistiaPlayer {
    addToPlaylist(
      hashedId: string,
      options?: object,
      position?: { before: string } | { after: string } | { index: number },
    ): void;
    aspect(): number;
    bind<T extends WistiaPlayerEventCallbackName>(
      eventType: T,
      callbackFn: WistiaEventCallbacks[T],
    ): void;
    cancelFullscreen(): void;
    duration(): number;
    email(): string | null;
    email(val: string): void;
    embedded(): boolean;
    eventKey(): string;
    getSubtitlesScale(): number;
    hasData(): boolean;
    hashedId(): string;
    height(): number;
    height(val: number, options?: { constrain: boolean }): void;
    inFullscreen(): boolean;
    isMuted(): boolean;
    look(): { heading: number; pitch: number; fov: number };
    look(options: object): void;
    mute(): void;
    name(): string;
    pause(): void;
    percentWatched(): number;
    play(): void;
    playbackRate(r: number): void;
    ready(): void;
    remove(): void;
    replaceWith(hashedId: string, options?: object): void;
    requestFullscreen(): void;
    secondsWatched(): number;
    secondsWatchedVector(): number;
    setSubtitlesScale(val: number): void;
    state(): 'beforeplay' | 'playing' | 'paused' | 'ended';
    time(): number;
    time(val: number): void;
    unbind<T extends WistiaPlayerEventCallbackName>(
      eventType: T,
      callbackFn: WistiaEventCallbacks[T],
    ): void;
    unmute(): void;
    videoHeight(): number;
    videoHeight(val: number, options?: object): void;
    videoQuality(): number | 'auto';
    videoQuality(val: number | 'auto'): void;
    videoWidth(): number;
    videoWidth(val: number, options?: object): void;
    visitorKey(): string;
    volume(): number;
    volume(val: number): void;
    width(): number;
    width(val: number, options?: object): void;
  }

  interface Wistia {
    api(matcher: string): WistiaPlayer | null;
  }
}

declare interface Window {
  _wq?: Wistia.WistiaPlayerEvent[];
  Wistia?: Wistia.Wistia;
}
