/* ToeicQuest NBA — LIVE GAME 2D input adapter (touch, pointer, keyboard). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LiveGameInput = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function attach(root, handlers) {
    if (!root) throw new Error('LiveGameInput requires a root element');
    const callbacks = handlers || {};
    const movement = { x: 0, y: 0, sprint: false };
    const keys = new Set();
    let pointerSprint = false;
    const cleanup = [];
    const joystick = root.querySelector('[data-lg-joystick]');
    const knob = root.querySelector('[data-lg-joystick-knob]');
    let activePointer = null;

    function listen(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      cleanup.push(() => target.removeEventListener(type, fn, options));
    }
    function updateKeys() {
      const left = keys.has('arrowleft') || keys.has('a');
      const right = keys.has('arrowright') || keys.has('d');
      const up = keys.has('arrowup') || keys.has('w');
      const down = keys.has('arrowdown') || keys.has('s');
      if (activePointer == null) {
        movement.x = Number(right) - Number(left);
        movement.y = Number(down) - Number(up);
      }
      movement.sprint = keys.has('shift') || pointerSprint;
    }
    function updateJoystick(clientX, clientY) {
      if (!joystick) return;
      const rect = joystick.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      const radius = Math.max(1, rect.width * .34);
      const length = Math.hypot(dx, dy);
      const factor = length > radius ? radius / length : 1;
      const x = dx * factor;
      const y = dy * factor;
      movement.x = x / radius;
      movement.y = y / radius;
      if (knob) knob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    function releaseJoystick(event) {
      if (activePointer != null && event?.pointerId != null && event.pointerId !== activePointer) return;
      activePointer = null;
      movement.x = 0;
      movement.y = 0;
      if (knob) knob.style.transform = 'translate3d(0,0,0)';
      updateKeys();
    }
    if (joystick) {
      listen(joystick, 'pointerdown', event => {
        activePointer = event.pointerId;
        joystick.setPointerCapture?.(event.pointerId);
        updateJoystick(event.clientX, event.clientY);
        event.preventDefault();
      });
      listen(joystick, 'pointermove', event => {
        if (event.pointerId !== activePointer) return;
        updateJoystick(event.clientX, event.clientY);
        event.preventDefault();
      });
      listen(joystick, 'pointerup', releaseJoystick);
      listen(joystick, 'pointercancel', releaseJoystick);
    }

    listen(window, 'keydown', event => {
      const key = String(event.key || '').toLowerCase();
      if (['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','shift'].includes(key)) {
        keys.add(key); updateKeys(); event.preventDefault();
      }
      if (event.repeat) return;
      if (key === ' ') callbacks.shootStart?.(event);
      if (key === 'e') callbacks.pass?.(event);
      if (key === 'f') callbacks.drive?.(event);
      if (key === 'q') callbacks.switch?.(event);
    });
    listen(window, 'keyup', event => {
      const key = String(event.key || '').toLowerCase();
      keys.delete(key); updateKeys();
      if (key === ' ') callbacks.shootEnd?.(event);
    });

    root.querySelectorAll('[data-lg-action]').forEach(button => {
      const action = button.dataset.lgAction;
      if (action === 'shoot') {
        listen(button, 'pointerdown', event => { callbacks.shootStart?.(event); event.preventDefault(); });
        listen(button, 'pointerup', event => { callbacks.shootEnd?.(event); event.preventDefault(); });
        listen(button, 'pointercancel', event => { callbacks.shootEnd?.(event); event.preventDefault(); });
        listen(button, 'contextmenu', event => event.preventDefault());
      } else if (action === 'pass') {
        let passHoldTimer = null;
        let passHeld = false;
        listen(button, 'pointerdown', event => {
          passHeld = false;
          passHoldTimer = setTimeout(() => {
            passHeld = true;
            callbacks.passHold?.(event);
          }, 280);
          event.preventDefault();
        });
        const finishPass = event => {
          if (passHoldTimer) clearTimeout(passHoldTimer);
          passHoldTimer = null;
          if (!passHeld) callbacks.pass?.(event);
          event.preventDefault();
        };
        listen(button, 'pointerup', finishPass);
        listen(button, 'pointercancel', event => {
          if (passHoldTimer) clearTimeout(passHoldTimer);
          passHoldTimer = null;
          event.preventDefault();
        });
        listen(button, 'contextmenu', event => event.preventDefault());
      } else if (action === 'sprint') {
        listen(button, 'pointerdown', event => { movement.sprint = true; callbacks.sprintStart?.(event); event.preventDefault(); });
        const stopSprint = event => { movement.sprint = false; callbacks.sprintEnd?.(event); event.preventDefault(); };
        listen(button, 'pointerup', stopSprint);
        listen(button, 'pointercancel', stopSprint);
      } else {
        listen(button, 'click', event => { callbacks[action]?.(event); event.preventDefault(); });
      }
    });

    return {
      getMovement() { return { x: movement.x, y: movement.y, sprint: movement.sprint }; },
      setSprint(value) { pointerSprint = !!value; movement.sprint = keys.has('shift') || pointerSprint; },
      destroy() { cleanup.splice(0).forEach(fn => fn()); keys.clear(); releaseJoystick(); }
    };
  }

  return { attach };
});
