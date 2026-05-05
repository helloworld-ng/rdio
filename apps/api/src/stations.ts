import { defaultStationId, stationConfig } from '@rdio/config'
import { defineStation, type RadioStation } from '@rdio/rdio-core'

const publicStreamBaseUrl = process.env.PUBLIC_STREAM_BASE_URL ?? 'http://localhost:8000'

function streamUrlForMount(mount: string) {
  return new URL(mount, publicStreamBaseUrl).toString()
}

export const stations: RadioStation[] = [
  defineStation({
    ...stationConfig,
    streamUrl: streamUrlForMount(stationConfig.mount ?? `/${stationConfig.slug ?? stationConfig.id}.mp3`),
  }),
]

export { defaultStationId }
