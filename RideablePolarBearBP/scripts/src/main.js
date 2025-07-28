import { world, system } from '@minecraft/server';
import {SlideManager} from "./slide/SlideManager";
import {VO} from "./libs/VectorMC";
import {ItemTools} from "./libs/tools";

const IMPULSE_AMOUNT = 100; // 使用焰火火箭加速的次数
const FLY_SPEED = 3; // 飞行速度

system.run(() => {
  world.sendMessage("§e[RideablePolarBear] Addon Loaded!");
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
    let controller = SlideManager.getInstance().getController(bear);
    let rider = controller.getControllingRider();
    if (rider && rider.id === pl.id) {
      ItemTools.decrementMainHandStack(pl, 1);
      controller.startJet(IMPULSE_AMOUNT, FLY_SPEED);
    }
  });
});

// todo 进入高速滑翔状态 播放滑翔音效
// pl.playSound('elytra.loop');


/**
 * 测量用
 */
function exp() {
  let lastV = 0;
  system.runInterval(() => {
    let pl = world.getPlayers()[0];
    // 速度
    let v = pl.getVelocity();
    // 加速度
    let a = VO.sub(lastV, v);
    lastV = VO.copy(v);
    // 高度
    let h = pl.location.y;
    // 视线俯仰角|速度俯仰角|加速度俯仰角|水平速度|水平加速度|竖直速度|竖直加速度|高度
    console.log(`|${
      // getPitch(pl.getViewDirection()).toFixed(5)}|${ // 视线俯仰角
      // getPitch(v).toFixed(5)}|${ // 速度俯仰角
      // getPitch(a).toFixed(5)}|${ // 加速度俯仰角
      // Math.sqrt(v.x * v.x + v.z * v.z).toFixed(5)}|${ // 水平速度
      // Math.sqrt(a.x * a.x + a.z * a.z).toFixed(5)}|${ // 水平加速度
      v.y.toFixed(5)}|${ // 竖直速度
      // a.y.toFixed(5)}|${ // 竖直加速度
      h}`); // 高度
  }, 1);
}

/**
 * 获取俯仰角
 */
function getPitch(v) {
  return (180 / Math.PI) * Math.atan2(v.y, Math.sqrt(v.x*v.x + v.z*v.z));
}

// exp();