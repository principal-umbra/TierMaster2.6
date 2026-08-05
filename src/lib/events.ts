/**
 * Safe event constructor and dispatcher to prevent "TypeError: Illegal constructor"
 * in restricted, older, or sandboxed iframe browser environments.
 */
export function safeDispatchEvent(name: string, detail?: any) {
  try {
    let event: any;
    if (detail !== undefined) {
      try {
        event = new CustomEvent(name, { detail });
      } catch (e) {
        try {
          event = document.createEvent('CustomEvent');
          event.initCustomEvent(name, true, true, detail);
        } catch (err) {
          event = document.createEvent('Event');
          event.initEvent(name, true, true);
          event.detail = detail;
        }
      }
    } else {
      try {
        event = new Event(name);
      } catch (e) {
        try {
          event = document.createEvent('Event');
          event.initEvent(name, true, true);
        } catch (err) {
          console.error('Failed to create native event', err);
          return;
        }
      }
    }
    window.dispatchEvent(event);
  } catch (err) {
    console.error('Failed to dispatch event', err);
  }
}
