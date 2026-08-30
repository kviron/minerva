import { healthyStatus } from '../../modules/operations/health'

export default defineEventHandler(() => healthyStatus())

