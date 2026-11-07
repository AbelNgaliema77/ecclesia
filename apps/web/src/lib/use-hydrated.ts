import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
