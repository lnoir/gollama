import { conversationsLastUpdated } from "../../../stores/conversation.store";
import type { DbSetting, SettingsMap } from "../../../types";

export class BaseAdapter {
  
  settingToObject(setting: DbSetting, settingsMap: SettingsMap): void {
		const levels = setting.name.split('.');
		// eslint-disable @typescript-eslint/no-explicit-any
		levels.reduce((prev: any, curr: string, i: number) => {
			if (i === levels.length - 1) {
				prev[curr] = setting.value;
				return settingsMap;
			} else if (!prev[curr]) {
				prev[curr] = {};
			}
			return prev[curr];
		}, settingsMap);
	}

	bumpUpdate() {
		conversationsLastUpdated.update(() => new Date());
	}

  prepareInsert(data: Record<string, any>) {
    let columns: string[] = [];
    let placeholders: string[] = [];
    let values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(data)) {
      columns.push(k);
      placeholders.push(`$${i}`);
      values.push(v);
      i++;
    }
    return {
      columns: columns.join(', '),
      placeholders: placeholders.join(', '),
      values
    }
  }

  prepareUpdate(data: Record<string, any>, id: number) {
    let updates: string[] = [];
    let values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(data)) {
      updates.push(`${k} = $${i}`);
      values.push(v);
      i++;
    }
    values.push(id);
    return {
      updates: updates.join(', '),
      values
    }
  }
}