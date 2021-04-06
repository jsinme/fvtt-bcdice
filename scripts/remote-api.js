import { APIError } from "./errors.js";

function getDiceServer() {
  return (
    game.settings.get("fvtt-bcdice", "bc-server") ??
    "https://bcdice.trpg.net/v2"
  );
}

let _cachedSystems;
export async function getSystems() {
  if (!_cachedSystems) {
    try {
      _cachedSystems = await doRequest;
      const request = await fetch(`${getDiceServer()}/game_system`);
      _cachedSystems = (await request.json()).game_system;
    } catch (e) {
      console.error("BCDice: Error fetching systems.", e);
      return [];
    }
  }
  return duplicate(_cachedSystems);
}

export async function getHelpText(system) {
  return doRequest(`${getDiceServer()}/game_system/${system}`)
}

export async function getRoll(system, command) {
  const url = new URL(`${getDiceServer()}/game_system/${system}/roll`);
  const params = url.searchParams;
  params.append("command", command);
  return doRequest(url);
}

export async function doRequest(url) {
  const request = await fetch(url);
  const data = await request.json();
  if (!data.ok)
    throw new APIError(
      "There was an error from the API.",
      request,
      data.reason
    );
  return data;
}
