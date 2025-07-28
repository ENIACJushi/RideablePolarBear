import {Player, ItemStack, EquipmentSlot} from '@minecraft/server';

export class ItemTools {
  /**
   * 设置玩家主手物品
   * @param {Player} player
   * @param {?ItemStack} item
   */
  static setPlayerMainHand(player, item=undefined){
    let container = player.getComponent("inventory").container;
    let slot = player.selectedSlotIndex;
    if(item===undefined){
      container.setItem(slot);
    }
    else{
      container.setItem(slot, item);
    }
  }
  /**
   * 获取玩家主手物品
   * @param {Player} player
   * @returns {ItemStack|undefined}
   */
  static getPlayerMainHand(player){
    let container = player.getComponent("inventory").container;
    let slot = player.selectedSlotIndex;
    // pl.getComponent("equippable").getEquipment(EquipmentSlot.Mainhand);
    return container.getItem(slot);
  }

  /**
   * 获取玩家主手物品
   * @param {Player} player
   * @returns {ItemStack|undefined}
   */
  static getPlayerOffhand(player) {
    return player.getComponent("equippable").getEquipment(EquipmentSlot.Offhand);
  }
  /**
   * 减少玩家主手装备的耐久
   * @param {Player} player
   * @param {number} amount
   */
  static decrementMainHandStack(player, amount=1){
    // 获取物品
    let container = player.getComponent("inventory").container;
    let slot = player.selectedSlotIndex;

    let item = container.getItem(slot);
    item = item.amount - amount <= 0 ? undefined : (item.amount-=amount, item);

    container.setItem(slot, item);
  }
}