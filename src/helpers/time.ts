import dayjs, { Dayjs, ConfigType, OpUnitType } from 'dayjs';
import dayOfYearPlugin from 'dayjs/plugin/dayOfYear';
import isoWeekPlugin from 'dayjs/plugin/isoWeek';
import weekdayPlugin from 'dayjs/plugin/weekday';
import utcPlugin from 'dayjs/plugin/utc';
import tzPlugin from 'dayjs/plugin/timezone';
import isBetweenPlugin from 'dayjs/plugin/isBetween';
import isSameOrBeforePlugin from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfterPlugin from 'dayjs/plugin/isSameOrAfter';
import customParseFormatPlugin from 'dayjs/plugin/customParseFormat';
import localizedFormatPlugin from 'dayjs/plugin/localizedFormat';
import localeDataPlugin from 'dayjs/plugin/localeData';

dayjs.extend(tzPlugin);
dayjs.extend(utcPlugin);
dayjs.extend(dayOfYearPlugin);
dayjs.extend(isoWeekPlugin);
dayjs.extend(weekdayPlugin);
dayjs.extend(isBetweenPlugin);
dayjs.extend(isSameOrBeforePlugin);
dayjs.extend(isSameOrAfterPlugin);
dayjs.extend(customParseFormatPlugin);
dayjs.extend(localizedFormatPlugin);
dayjs.extend(localeDataPlugin);

type ISOUnitType = OpUnitType | 'isoWeek';
export interface TimeInstance extends Dayjs {
  // "isoWeek" plugin's methods
  isoWeekYear(): number;
  isoWeek(): number;
  isoWeek(value: number): TimeInstance;
  isoWeekday(): number;
  isoWeekday(value: number): TimeInstance;
  startOf(unit: ISOUnitType): TimeInstance;
  endOf(unit: ISOUnitType): TimeInstance;
  isSame(date: ConfigType, unit?: ISOUnitType): boolean;
  isSameOrBefore(date?: ConfigType, unit?: OpUnitType): boolean;
  isBefore(date: ConfigType, unit?: ISOUnitType): boolean;
  isAfter(date: ConfigType, unit?: ISOUnitType): boolean;
  isSameOrAfter(date?: ConfigType, unit?: OpUnitType): boolean;
  isBetween(
    a: ConfigType,
    b: ConfigType,
    c?: OpUnitType | null,
    d?: '()' | '[]' | '[)' | '(]',
  ): boolean;

  // "UTC" plugin's methods
  utc(keepLocalTime?: boolean): TimeInstance;
  local(): TimeInstance;
  isUTC(): boolean;

  // "Timezone" plugin's methods
  tz(timezone?: string, keepLocalTime?: boolean): TimeInstance;
  offsetName(type?: 'short' | 'long'): string | undefined;
}
export type TimeConstructor = (
  date?: dayjs.ConfigType,
  format?: dayjs.OptionType,
  locale?: string,
  strict?: boolean,
) => TimeInstance;

export type DateValue = Date | Dayjs | string | number;

export function formatDate(date: DateValue, format = 'D MMMM YYYY, HH:mm'): string {
  return dayjs(date).format(format);
}

export const time = dayjs as TimeConstructor;

export default dayjs;
