/** Sticker art that isn't from the logo library: your own text, or a file you uploaded (kept in this browser). */
export const TEXT_KEY = "@text";
export const UPLOAD_PREFIX = "@up:";

export const uploadKey = (id: string) => UPLOAD_PREFIX + id;
export const uploadIdOf = (key: string) => (key.startsWith(UPLOAD_PREFIX) ? key.slice(UPLOAD_PREFIX.length) : null);
export const isCustomKey = (key: string) => key === TEXT_KEY || /^@up:[a-z0-9]{1,40}$/.test(key);
