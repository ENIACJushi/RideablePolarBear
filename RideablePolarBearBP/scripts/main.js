import { world, system } from '@minecraft/server';
import {ItemTools} from "./tools";

const IMPULSE_AMOUNT = 20; // 使用焰火火箭加速的次数
const FLY_SPEED = 3; // 飞行速度

system.run(() => {
  world.sendMessage("§e[Touhou Little Maid] Addon Loaded!");
})

world.beforeEvents.itemUse.subscribe((ev) => {
  let pl = ev.source;
  if (!pl) {
    return;
  }
  let item = ItemTools.getPlayerMainHand(pl);
  if (item.typeId !== 'minecraft:firework_rocket') {
    return;
  }
  // 获取熊
  let bear = pl.dimension.getEntities({
    "location": pl.location,
    "type": "minecraft:polar_bear",
    "closest": 1,
  })[0];
  if (!bear) {
    return;
  }
  // 获取熊的骑手
  let rideable = bear.getComponent("minecraft:rideable");
  if (rideable === undefined) {
    return;
  }
  let isRider = rideable.getRiders().some((rider) => {
    return rider.id === pl.id;
  })
  if (!isRider) {
    return;
  }
  // 使用成功，加速熊熊
  system.run(() => {
    pl.playSound('firework.launch');
    ItemTools.decrementMainHandStack(pl, 1);
    let count = 0;
    let interval_id = system.runInterval(() => {
      // 起飞
      let temp = pl.getViewDirection();
      bear.clearVelocity();
      bear.applyImpulse({
        x: temp.x * FLY_SPEED,
        y: temp.y * FLY_SPEED,
        z: temp.z * FLY_SPEED,
      });
      count++;
      // 到达次数停止
      if (count >= IMPULSE_AMOUNT) {
        system.clearRun(interval_id);
      }
    }, 1);
  });
});

// todo 进入高速滑翔状态 播放滑翔音效
// pl.playSound('elytra.loop');
