import type { ShipmentRecord, ShipmentRecordStatus } from './types'

/** 主流程里程碑（對應需求範例） */
export const SHIPMENT_TIMELINE_LABELS = ['已建立出貨紀錄', '已包裝', '已寄出', '已到店', '已取貨', '已完成'] as const

const STATUS_PROGRESS: Record<ShipmentRecordStatus, number> = {
  未包裝: 0,
  已包裝: 1,
  待寄出: 2,
  已寄出: 3,
  運送中: 3,
  已到店: 4,
  已取貨: 5,
  逾期未取: 4,
  退回: 3,
  '遺失 / 異常': 3,
  已完成: 6,
}

/** 各步驟所需之最低進度值（與 STATUS_PROGRESS 對齊） */
const STEP_THRESHOLD = [0, 1, 3, 4, 5, 6] as const

export function getShipmentTimelineSteps(record: ShipmentRecord) {
  const p = STATUS_PROGRESS[record.status]
  const warnBase =
    record.status === '退回' || record.status === '遺失 / 異常' || record.status === '逾期未取'
  return SHIPMENT_TIMELINE_LABELS.map((label, idx) => ({
    label,
    done: p >= STEP_THRESHOLD[idx],
    warn: warnBase && idx >= 2,
  }))
}

export function shipmentStatusRank(s: ShipmentRecordStatus) {
  return STATUS_PROGRESS[s]
}
