const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalhostHostname(hostname = "") {
  return LOCALHOST_HOSTNAMES.has(hostname);
}

export function shouldRegisterServiceWorker(hostname = "") {
  return !isLocalhostHostname(hostname);
}
