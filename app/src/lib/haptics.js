import { WebHaptics } from 'web-haptics';

const haptics = new WebHaptics();

export const haptic = (type) => haptics.trigger(type);
