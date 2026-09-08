type BackHandler = () => boolean;

const handlerStack: BackHandler[] = [];

/**
 * Register a back button handler. Handlers are executed in Last-In-First-Out (LIFO) order.
 * If a handler returns `true`, the back action is considered consumed and propagation stops.
 * If it returns `false`, the next handler in the stack is evaluated.
 *
 * Returns an unregister cleanup function.
 */
export const registerBackHandler = (handler: BackHandler): (() => void) => {
  handlerStack.push(handler);
  return () => {
    const idx = handlerStack.lastIndexOf(handler);
    if (idx !== -1) {
      handlerStack.splice(idx, 1);
    }
  };
};

/**
 * Execute the registered back handlers from top of stack downwards.
 * Returns `true` if any handler consumed the event, `false` otherwise.
 */
export const executeBackHandler = (): boolean => {
  for (let i = handlerStack.length - 1; i >= 0; i--) {
    const handler = handlerStack[i];
    if (handler && handler()) {
      return true;
    }
  }
  return false;
};
