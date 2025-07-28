import {
  Entity,
} from "@minecraft/server";
import {SlideController} from "./SlideController";

/**
 * 管理当前世界所有实体的滑翔
 */
export class SlideManager {
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new SlideManager();
    }
    return this.instance;
  }

  map = new Map();
  /**
   * 获取实体的滑翔控制器 若不存在则新建
   * @param {Entity} entity 实体
   */
  getController(entity) {
    let res = this.map.get(entity.id);
    if (!res) {
      res = new SlideController(entity);
      this.map.set(entity.id, res);
    }
    res.updateControllerRider();
    return res;
  }

  /**
   * 清除实体的滑翔控制器
   * @param entityId 实体id
   */
  removeController(entityId) {
    let temp = this.map.get(entityId);
    temp.stopGlide();
    this.map.delete(entityId);
  }
}