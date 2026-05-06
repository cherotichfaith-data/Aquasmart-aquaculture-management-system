export type LatestParameterizedReadingState<Parameter extends string> = {
  readings: Partial<Record<Parameter, number>>
  timestamps: Partial<Record<Parameter, string>>
}

type ParameterizedMeasurementRow<Parameter extends string> = {
  system_id: number | null
  parameter_name: Parameter | string | null
  parameter_value: number | null
  date: string | null
  time?: string | null
}

export function buildLatestParameterizedReadingsBySystem<Parameter extends string>(
  rows: ParameterizedMeasurementRow<Parameter>[],
  allowedParameters: ReadonlySet<Parameter>,
) {
  const map = new Map<number, LatestParameterizedReadingState<Parameter>>()

  rows.forEach((row) => {
    if (row.system_id == null || row.parameter_value == null || !row.date) return
    const parameter = row.parameter_name as Parameter
    if (!allowedParameters.has(parameter)) return

    const timestamp = `${row.date}T${row.time ?? "00:00"}`
    const entry =
      map.get(row.system_id) ??
      ({
        readings: {} as Partial<Record<Parameter, number>>,
        timestamps: {} as Partial<Record<Parameter, string>>,
      } satisfies LatestParameterizedReadingState<Parameter>)
    const previous = entry.timestamps[parameter]

    if (!previous || timestamp > previous) {
      entry.timestamps[parameter] = timestamp
      entry.readings[parameter] = row.parameter_value
    }

    map.set(row.system_id, entry)
  })

  return map
}
