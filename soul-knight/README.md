# 像素远征 (Pixel Dungeon)

一款受地牢冒险游戏启发的原创 HTML5 Canvas 像素风射击小游戏，纯前端，免安装、无需构建。

## 在线游玩

https://yanzhao1027.github.io/soul-knight/

## Ubuntu 运行

```bash
cd ~/Projects/soul-knight-web
python3 -m http.server 4173
```

浏览器打开 http://127.0.0.1:4173/

## 操作

- WASD / 方向键：移动
- 鼠标：瞄准，按住左键射击；空格可开火
- Shift：冲刺；Q：范围技能
- E：互动，1 / 2：切换武器
- P / Esc：暂停
- 手机 / 平板：触控摇杆、射击按钮、冲刺和技能按钮

## 玩法

完成三层地牢，每层清除两波敌人。开启宝箱获取武器和补给，找到传送门前往下一层。第三层会出现最终 Boss。

## 技术

原生 HTML/CSS/JavaScript + Canvas 2D，程序化绘制所有像素美术，无第三方游戏素材。
