// 发现mc自己有向量运算方法后，修改原来的基于数组的方法
import { Direction } from "@minecraft/server";
const HALF_PI = Math.PI / 2;
// 仅用于快速创建向量和指定类型
export class Vector {
    constructor(x, y, z) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        return { x: x, y: y, z: z };
    }
}
// 用三个向量指定一个坐标系，仅用于快速创建坐标系和指定类型
export class Axis {
    constructor(x, y, z) {
        this.x = new Vector(1, 0, 0);
        this.y = new Vector(0, 1, 0);
        this.z = new Vector(0, 0, 1);
        return { x: x, y: y, z: z };
    }
}
/**
 * VO - Vector Operation
 * Secondary: 二级运算
 * Advanced: 高级运算 常常带着鲜明的场景属性
 */
export var VO;
(function (VO) {
    /**
     * 取模
     */
    function length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }
    VO.length = length;
    /**
     * 化为单位向量，返回一个新对象
     */
    function normalized(v) {
        let l = VO.length(v);
        if (l < 1e-8)
            return new Vector(0, 0, 0);
        return new Vector(v.x / l, v.y / l, v.z / l);
    }
    VO.normalized = normalized;
    /**
     * 加
     */
    function add(...v) {
        return new Vector(v.reduce((total, curr) => { return total + curr.x; }, 0), v.reduce((total, curr) => { return total + curr.y; }, 0), v.reduce((total, curr) => { return total + curr.z; }, 0));
    }
    VO.add = add;
    /**
     * 减 v1 - v2
     */
    function sub(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }
    VO.sub = sub;
    /**
     * 数乘
     */
    function multiply(v, n) {
        return new Vector(v.x * n, v.y * n, v.z * n);
    }
    VO.multiply = multiply;
    /**
     * 内积 a · b
     */
    function dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }
    VO.dot = dot;
    /**
     * 外积
     */
    function cross(a, b) {
        return new Vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    VO.cross = cross;
    /**
     * 等于
     */
    function equals(a, b) {
        return a.x === b.x && a.y === b.y && a.z === b.z;
    }
    VO.equals = equals;
    /**
     * 将向量转为字符
     */
    function toString(vector, fix = 2) {
        return `${vector.x.toFixed(fix)}  ${vector.y.toFixed(fix)}  ${vector.z.toFixed(fix)}`;
    }
    VO.toString = toString;
    function isZero(vector) {
        return vector.x === 0 && vector.y === 0 && vector.z === 0;
    }
    VO.isZero = isZero;
    /**
     * 复制一个向量
     */
    function copy(vector) {
        return new Vector(vector.x, vector.y, vector.z);
    }
    VO.copy = copy;
    let Secondary;
    (function (Secondary) {
        /**
         * 绕轴旋转
         * @param {Vector} source
         * @param {Vector} axis
         * @param {number} theta A numeric expression that contains an angle measured in radians.
         */
        function rotate_axis(source, axis, theta) {
            let axis_n = VO.normalized(axis);
            let cos = Math.cos(theta);
            let sin = Math.sin(theta);
            return VO.add(VO.add(VO.multiply(source, cos), VO.multiply(VO.cross(axis_n, source), sin)), VO.multiply(VO.multiply(axis_n, VO.dot(axis_n, source)), (1 - cos)));
        }
        Secondary.rotate_axis = rotate_axis;
        /**
         * 为了兼容旧库，移植而来。效率应该可以提升
         */
        function getVector_speed_direction(speed, direction) {
            let k = Math.sqrt((speed * speed) / (direction.x * direction.x + direction.y * direction.y + direction.z * direction.z));
            return new Vector(direction.x * k, direction.y * k, direction.z * k);
        }
        Secondary.getVector_speed_direction = getVector_speed_direction;
        /**
         * 获取两个向量的夹角
         */
        function getIncludedAngle(v1, v2) {
            return Math.acos(VO.dot(v1, v2) / (VO.length(v1) * VO.length(v2)));
        }
        Secondary.getIncludedAngle = getIncludedAngle;
    })(Secondary = VO.Secondary || (VO.Secondary = {}));
    let Advanced;
    (function (Advanced) {
        /**
         * @deprecated MC的转动顺序是ZYX，这种方法难以实现后续的滚动角计算
         * 获取向量(0,1,0))到v2的欧拉角（仅z,x，弧度制）
         * @param {Vector} v
         * @returns {Array}
         */
        function getEulerAngleXZ(v) {
            let z = Math.atan2(v.x, v.y);
            let x = Math.acos(Math.sqrt(v.x * v.x + v.y * v.y) / VO.length(v));
            if (v.z < 0) {
                x = -1 * x;
            }
            return [x, z];
        }
        Advanced.getEulerAngleXZ = getEulerAngleXZ;
        /**
         * @deprecated 欧拉角的滚动角难以指定，如果要给弹幕计算旋转角，可使用一种固定坐标系和相对坐标系混合的转法
         * 获取向量 (1,0,0) 到 v 的欧拉角（Z-Y，弧度制）
         * @param {Vector} v
         * @returns {Array}
         */
        function getEulerAngle(v) {
            let z = Math.atan2(v.y, v.x);
            let y = Math.atan2(v.z, Math.sqrt(v.x * v.x + v.y * v.y));
            if (v.x < 0) {
                // Z 在 +-PI/2 之间
                z = z + (z < 0 ? Math.PI : -Math.PI);
                y = (y < 0 ? -Math.PI : Math.PI) - y;
            }
            return [z, y];
        }
        Advanced.getEulerAngle = getEulerAngle;
        /**
         * 获取向量 (1,0,0) 到 v 的弹幕角（Y绕固定坐标系转动，Z X 绕相对坐标系转动）
         * @param {Vector} v
         * @returns {Array}
         */
        function getDanmakuAngle(v) {
            let z = Math.atan2(v.y, v.x);
            let y = Math.atan2(v.z, v.x);
            return [z, y];
        }
        Advanced.getDanmakuAngle = getDanmakuAngle;
        /**
         * 获取任意一条与给定非零向量垂直的向量
         */
        function getAnyVerticalVector(vector) {
            if (vector.x === 0 && vector.y === 0) {
                // 向量为0，返回z轴
                if (vector.z === 0) {
                    return new Vector(0, 0, 1);
                }
                // 由函数说明，z不为0，取与z轴垂直的x轴
                return new Vector(1, 0, 0);
            }
            if (vector.y === 0) {
                // 向量在xz平面上，取y轴
                return new Vector(0, 1, 0);
            }
            // 与xz平面有一定夹角，取xy平面上与向量垂直的一个向量
            return new Vector(1, -vector.x / vector.y, 0);
        }
        Advanced.getAnyVerticalVector = getAnyVerticalVector;
        /**
         * 由视线获取屏幕坐标系
         * @param view 视线向量 作为坐标系的 x 轴
         * @param isRolling 是否处于翻滚状态。若不在翻滚，则 y 轴处于 zOx 平面上方；若在翻滚，则 y 轴位于  zOx 平面下方。
         *    两种情况的 y 轴向量正好相反
         */
        function getAxisByView(view, isRolling = false) {
            let roll = isRolling ? -1 : 1;
            let x = VO.normalized(view);
            let xzLength = Math.sqrt(x.x * x.x + x.z * x.z);
            let temp = roll * (x.y / xzLength);
            return {
                x,
                y: new Vector(-x.x * temp, roll * xzLength, -x.z * temp),
                z: VO.normalized(new Vector(x.z, 0, -x.x)),
            };
        }
        Advanced.getAxisByView = getAxisByView;
        /**
         * 获取向量在给定坐标系下的坐标（向量和坐标系均以世界坐标系指定分量）
         * @param axis
         * @param vector
         */
        function transVectorByAxis(axis, vector) {
            return {
                x: VO.dot(axis.x, vector),
                y: VO.dot(axis.y, vector),
                z: VO.dot(axis.z, vector),
            };
        }
        Advanced.transVectorByAxis = transVectorByAxis;
        /**
         * 由视角向量获取面朝方向
         */
        function getDirectionByView2D(view) {
            let temp = (Math.abs(view.x) - Math.abs(view.y) > 0); // |x| > |y|
            if (view.x > 0) {
                if (view.z > 0) {
                    return temp ? Direction.East : Direction.South;
                }
                return temp ? Direction.East : Direction.North;
            }
            if (view.z > 0) {
                return temp ? Direction.West : Direction.South;
            }
            return temp ? Direction.West : Direction.North;
        }
        Advanced.getDirectionByView2D = getDirectionByView2D;
        /**
         * 提前量计算
         * @param {Vector} A 点 A 的位置
         * @param {Vector} B 点 B 的位置
         * @param {Number} Va_len A 发射的直线弹射物的速率
         * @param {Vector} Vb B 的速度
         * @returns {Vector} A 发射的直线弹射物的速度
         */
        function preJudge(A, B, Va_len, Vb) {
            let BA = VO.sub(A, B);
            let BA_normalized = VO.normalized(BA);
            // 求Va'
            let Vb_comp2_len = VO.dot(Vb, BA_normalized);
            let Vb_comp2 = VO.multiply(BA_normalized, Vb_comp2_len);
            let Va_comp1 = VO.sub(Vb, Vb_comp2); // Va_comp1 = Vb_comp1
            // 求Va''
            let Va_comp2_len_d = Va_len * Va_len - (Va_comp1.x * Va_comp1.x + Va_comp1.y * Va_comp1.y + Va_comp1.z * Va_comp1.z);
            if (Va_comp2_len_d <= 0) { // Va 与 Vb 垂直，Va = Va''，直接出结果
                return Va_comp1;
            }
            let Va_comp2_len = Math.sqrt(Va_comp2_len_d);
            let Va_comp2 = VO.multiply(VO.multiply(BA_normalized, -1), Va_comp2_len);
            return VO.add(Va_comp1, Va_comp2); // Va
        }
        Advanced.preJudge = preJudge;
    })(Advanced = VO.Advanced || (VO.Advanced = {}));
})(VO || (VO = {}));
//# sourceMappingURL=VectorMC.js.map