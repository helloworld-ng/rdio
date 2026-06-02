import { stationConfig } from "@rdio/config";
import { defineStation, type RadioStation } from "@rdio/rdio-core";

export { defaultStationId } from "@rdio/config";

const publicStreamBaseUrl = process.env.PUBLIC_STREAM_BASE_URL;

function streamUrlForMount(mount: string) {
  return publicStreamBaseUrl
    ? new URL(mount, publicStreamBaseUrl).toString()
    : mount;
}

export const stations: RadioStation[] = [
  defineStation({
    ...stationConfig,
    streamUrl: streamUrlForMount(
      stationConfig.mount ?? `/${stationConfig.slug ?? stationConfig.id}.mp3`
    ),
  }),
];
