import {
  Entity, MolangVariableMap,
  Player,
  system, world,
} from '@minecraft/server';
import {Vector, VO} from "../libs/VectorMC";
import {ItemTools} from "../libs/tools";

/**
 * 控制单个实体的滑翔
 */
export class SlideController {
  // 物理常量
  friction = 0.1; // 空气阻力
  maxSpeed = 2; // 最大速度
  g = 0.0784; // 重力加速度 每刻施加的向下的动量
  rocketA = 0.25; // 火箭推进力 每刻施加的与视线同向的动量

  // 运行时变量
  plVelocityTime = 0; // 剩余的玩家动量tick
  lastHeight = 0; // 高度

  // 滑翔参数
  noseDirection; // 期望机头方向，由玩家设置，会根据情况调整实际方向以达到此方向
  wingFractionCoefficient = 0.2; // 机翼空阻系数 当速度垂直翼面，阻力加速度=系数*速度
  faceFractionCoefficient = 0.005; // 迎面空阻系数 受到的迎着机头的阻力，阻力加速度=系数*速度
  sideFractionCoefficient = 0.02; // 侧面空阻系数 受到的侧方而来的的阻力，阻力加速度=系数*速度
  riseCoefficient = 0.05; // 升力系数 升力=迎着机头的速度*系数

  /**
   * @param { Entity } entity 计入滑翔的实体
   */
  constructor(entity) {
    this.entity = entity;
    this.pl = this.getControllingRider();
    this.lastVelocity = entity.getVelocity();
    this.updateLastState();
  }

  /**
   * 更新最近状态 包括高度，速度等
   */
  updateLastState() {
    this.lastHeight = this.entity.location.y;
    this.lastVelocity = this.entity.getVelocity();
  }

  /**
   * 开始火箭推进
   * @param { number } time 持续时间（tick）
   * @param { number } velocity 推进时保持的速率
   */
  startJet(time, velocity) {
    if (!this.intervalId) {
      this.startGlide();
    }
    this.plVelocityTime = time;
    this.plVelocity = velocity;
  }

  /**
   * 开始滑翔
   */
  startGlide() {
    this.stopGlide();
    this.updateLastState();
    this.intervalId = system.runInterval(() => {
      this.tick();
    }, 1);
  }

  /**
   * 停止滑翔
   */
  stopGlide() {
    if (this.intervalId === undefined) {
      return;
    }
    system.clearRun(this.intervalId);
    this.intervalId = undefined;
  }

  tick() {
    // 骑手已脱离实体，取消一切动作，立即着陆
    if (!this.isRiderOnEntity()) {
      this.stopGlide();
      return;
    }
    // 计算速度差
    let newVelocity = this.entity.getVelocity();
    let delta = VO.sub(newVelocity, this.lastVelocity);
    let length = VO.length(delta);
    // 计算速度
    if (this.plVelocityTime > 0) {
      // 若有玩家火箭，则执行推进 tick
      this.runRocketTick();
      this.updateLastState();
    } else {
      // 若无火箭加速且处于滑翔状态，则计算速度
      if (this.needSetDirection()) {
        // 改变机头方向
        this.noseDirection = this.pl.getViewDirection();
      }

      if (this.needStopGlide()) {
        this.stopGlide();
        return;
      }

      /**
       * 进行滑翔。遵循以下规则：
       *   升力方向与机头方向垂直
       *   除了原版施加的空阻，还受到机翼空阻。机翼空阻与运动方向相反，速度越大，空阻越大；机头方向与运动方向夹角越大，空阻越大
       */
      let v = this.entity.getVelocity();
      let axis = VO.Advanced.getAxisByView(this.noseDirection); // 以机头方向为x轴的的飞行坐标系
      let selfVelocity = VO.Advanced.transVectorByAxis(axis, this.lastVelocity); // 使用飞行坐标系分解速度

      let isOnGround = (this.entity.isOnGround || this.entity.isInWater);
      let wingFraction = selfVelocity.y * this.wingFractionCoefficient; // 机翼阻力
      let faceFraction = selfVelocity.x * this.faceFractionCoefficient * (isOnGround ? 10 : 1) // 迎面阻力
      let sideFraction = selfVelocity.z * this.sideFractionCoefficient * (isOnGround ? 10 : 1) // 侧向阻力
      let riseA = selfVelocity.x * this.riseCoefficient * (isOnGround ? 0.1 : 1); // 升力
      if (selfVelocity.x - faceFraction < 0.01) {
        selfVelocity.x = 0;
      } else {
        selfVelocity.x -= faceFraction;
      }
      if (selfVelocity.z - sideFraction < 0.01) {
        selfVelocity.z = 0;
      } else {
        selfVelocity.z -= sideFraction;
      }
      selfVelocity.y += riseA - wingFraction;

      let impulse = VO.add(
        VO.multiply(axis.x, selfVelocity.x), // 迎面阻力向量
        VO.multiply(axis.y, selfVelocity.y), // 升力 + 机翼阻力向量
        VO.multiply(axis.z, selfVelocity.z), // 侧向阻力向量
        new Vector(0, -this.g, 0), // 重力加速度
      );

      this.entity.clearVelocity();
      this.entity.applyImpulse(impulse);
      this.lastVelocity = impulse;

      // system.clearRun(this.intervalId);
      // delete this;
    }
  }

  /**
   * 执行火箭加速 tick
   */
  runRocketTick() {
    if (this.pl) {
      // this.entity.clearVelocity();
      // this.entity.applyImpulse(VO.multiply(this.pl.getViewDirection(), this.plVelocity));
      let dir = this.pl.getViewDirection();
      // 计算使加速度朝向玩家视线时，需要施加的推进力方向
      // 当前速度与视线不同向时，需要在竖直方向施加减速力
      let deltaV = VO.normalized(dir).y - VO.normalized(this.entity.getVelocity()).y;
      let g = this.g + (deltaV * Math.min(this.g, this.rocketA - this.g)); // 减速力不超过rocketA能达到的最大减速力

      if (dir.y >= 0) {
        // 向上加速
        let tan2 = (dir.x*dir.x + dir.z*dir.z) / (dir.y*dir.y); // (tan θ)^2   θ 为视线与竖直轴的夹角
        let ay = (-2*g + Math.sqrt(4*g*g - 4 * (tan2 + 1) * (g*g - this.rocketA*this.rocketA))) / (2 * (tan2 + 1)); // rocketA 和 g 的合成向量 在 y 轴的分量
        let horizontalA = VO.multiply(VO.normalized(new Vector(dir.x,0 , dir.z)), ay * Math.sqrt(tan2)); // 水平加速度
        let impulse = new Vector(
          horizontalA.x,
          ay + g,
          horizontalA.z
        );
        this.entity.applyImpulse(impulse);
      } else {
        // 向下加速
        let tan2 = (dir.x*dir.x + dir.z*dir.z) / (dir.y*dir.y); // (tan θ)^2   θ 为视线与竖直轴的夹角
        let ay = (2*g + Math.sqrt(4*g*g - 4 * (tan2 + 1) * (g*g - this.rocketA*this.rocketA))) / (2 * (tan2 + 1)); // rocketA 和 g 的合成向量 在 y 轴的分量
        let horizontalA = VO.multiply(VO.normalized(new Vector(dir.x,0 , dir.z)), ay * Math.sqrt(tan2)); // 水平加速度
        let impulse = new Vector(
          horizontalA.x,
          g - ay,
          horizontalA.z
        );
        this.entity.applyImpulse(impulse);
      }
    }
    // 生成粒子 todo 转到资源包
    const molang = new MolangVariableMap();
    molang.setColorRGB("variable.color", { red: Math.random(), green: Math.random(), blue: Math.random() });
    this.entity.dimension.spawnParticle('minecraft:sparkler_emitter', this.entity.location, molang);
    this.plVelocityTime--;
  }

  ///// 获取状态 /////
  /**
   * 是否需要设置飞行方向 -- 玩家手持火箭，则可以控制方向
   * @param { Player } p
   */
  needSetDirection() {
    let mainHand = ItemTools.getPlayerMainHand(this.pl);
    if (mainHand && mainHand.typeId === 'minecraft:firework_rocket') {
      return true;
    }
    let offhand = ItemTools.getPlayerOffhand(this.pl);
    if (offhand && offhand.typeId === 'minecraft:firework_rocket') {
      return true;
    }
    return false;
  }

  /**
   * 更新操控骑手
   */
  updateControllerRider() {
    this.pl = this.getControllingRider();
  }

  /**
   * 实体的骑手是否还骑着实体  若不再骑着，且实体当前有其它的玩家骑手，则更新骑手并返回 true
   * @returns {boolean}
   */
  isRiderOnEntity() {
    let rider = this.getControllingRider();
    // 骑手不存在
    if (!rider || !this.pl) {
      this.pl = undefined;
      return false;
    }
    // 骑手更换了
    if (rider.id !== this.entity.id) {
      if (rider.typeId === 'minecraft:player') {
        // 若是玩家，则更新骑手
        this.pl = rider;
        return true;
      }
    }
    // 若骑手更换为了非玩家，则清除当前存储的骑手
    this.pl = undefined;
    return false;
  }

  /**
   * 获取实体的操控者
   * @returns {Entity|undefined}
   */
  getControllingRider() {
    if (!this.entity) {
      return undefined;
    }
    let rideable = this.entity.getComponent("minecraft:rideable");
    if (rideable === undefined) {
      return undefined;
    }
    return rideable.getRiders()[rideable.controllingSeat];
  }

  /**
   * 是否需要停止滑翔
   * @returns {boolean}
   */
  needStopGlide() {
    if (!this.entity || !this.pl) {
      return true;
    }
    // console.log(this.entity.isOnGround || this.entity.isInWater, VO.length(this.entity.getVelocity()));
    if ((this.entity.isOnGround || this.entity.isInWater) && VO.length(this.entity.getVelocity()) < 0.3) {
      return true;
    }
    return false;
  }
}