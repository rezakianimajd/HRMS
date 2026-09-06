/**
 * Tiny global error bus.
 * Components (e.g. App-level snackbar) subscribe via onError();
 * axiosConfig dispatches via notify() so any 403/404/500 surfaces once.
 */
let _listeners = [];

export const errorBus = {
  onError(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  },
  notify(payload) {
    _listeners.forEach(fn => fn(payload));
  },
};

export default errorBus;