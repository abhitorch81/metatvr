// Dev-only: `?emu=1` installs Meta's IWER WebXR runtime (the engine behind the Immersive Web
// Emulator extension) so the full VR code path runs in a plain desktop browser, with a virtual
// Quest 3 and a virtual right hand. Exposed as window.emu for scripted tests.
import { XRDevice, metaQuest3 } from 'iwer';

const device = new XRDevice(metaQuest3);
device.installRuntime({ forceInstall: true });
device.primaryInputMode = 'hand';
const hand = device.hands.right;
hand.connected = true;
device.hands.left && (device.hands.left.connected = false);
window.emu = {
  device, hand,
  // move the virtual hand (metres, in head-relative space) and set pinch 0..1
  set(x, y, z, pinch = 0) {
    hand.position.set(x, y, z);
    hand.updatePinchValue ? hand.updatePinchValue(pinch) : 0;
  },
};
