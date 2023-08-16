export const TIME_CARDS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24, 40, '?'] as const;
export const CERT_CARDS = [40, 50, 60, 70, 80, 90] as const;

export const peerJsServer = {
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  debug: 3, // 0 - disable logs, 1 - only errors, 2 - errors and warnings, 3 - all logs
};

export const ID_PREFIX = 'ota-planing';

export const LS_MODE = `${ID_PREFIX}:MODE`;
export const LS_USER_NAME = `${ID_PREFIX}:USER_NAME`;
export const LS_MY_ID = `${ID_PREFIX}:MY_ID`;
export const LS_HOST_ID = `${ID_PREFIX}:HOST_ID`;
