/** Client-only notification lifetime. Expired notices never occupy the two visible slots. */
export class LootNoticeWindow {
  private deadlines = new Map<string, number>();
  select<T extends { id: string }>(nearby: T[], now: number): T[] {
    const ids = new Set(nearby.map((l) => l.id));
    for (const id of this.deadlines.keys())
      if (!ids.has(id)) this.deadlines.delete(id);
    for (const loot of nearby)
      if (!this.deadlines.has(loot.id)) this.deadlines.set(loot.id, now + 4000);
    return nearby.filter((l) => this.deadlines.get(l.id)! > now).slice(0, 2);
  }
}
