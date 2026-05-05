import { generatePlayoutPlan } from '@rdio/rdio-core'

const plan = generatePlayoutPlan([], new Date())
console.log(JSON.stringify({ service: 'rdio-worker', plan }, null, 2))
