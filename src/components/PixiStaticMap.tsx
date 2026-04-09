// Adapted from ai-town (Apache 2.0) — tilemap renderer
import { PixiComponent, applyDefaultProps } from '@pixi/react';
import * as PIXI from 'pixi.js';
import * as campfire from '../data/animations/campfire.json';
import * as gentlesparkle from '../data/animations/gentlesparkle.json';
import * as gentlewaterfall from '../data/animations/gentlewaterfall.json';
import * as gentlesplash from '../data/animations/gentlesplash.json';
import * as windmill from '../data/animations/windmill.json';

const animations: Record<string, { spritesheet: any; url: string }> = {
  'campfire.json': { spritesheet: campfire, url: '/assets/spritesheets/campfire.png' },
  'gentlesparkle.json': { spritesheet: gentlesparkle, url: '/assets/spritesheets/gentlesparkle32.png' },
  'gentlewaterfall.json': { spritesheet: gentlewaterfall, url: '/assets/spritesheets/gentlewaterfall32.png' },
  'windmill.json': { spritesheet: windmill, url: '/assets/spritesheets/windmill.png' },
  'gentlesplash.json': { spritesheet: gentlesplash, url: '/assets/spritesheets/gentlewaterfall32.png' },
};

export interface MapData {
  tileSetUrl: string;
  tileSetDimX: number;
  tileSetDimY: number;
  tileDim: number;
  bgTiles: number[][][];      // [layer][x][y]
  objectTiles: number[][][];
  animatedSprites: { x: number; y: number; w: number; h: number; sheet: string; animation: string }[];
}

export const PixiStaticMap = PixiComponent('StaticMap', {
  create: (props: { map: MapData; [k: string]: any }) => {
    const map = props.map;
    const numxtiles = Math.floor(map.tileSetDimX / map.tileDim);
    const numytiles = Math.floor(map.tileSetDimY / map.tileDim);
    const bt = PIXI.BaseTexture.from(map.tileSetUrl, { scaleMode: PIXI.SCALE_MODES.NEAREST });

    const tiles: PIXI.Texture[] = [];
    for (let x = 0; x < numxtiles; x++) {
      for (let y = 0; y < numytiles; y++) {
        tiles[x + y * numxtiles] = new PIXI.Texture(
          bt, new PIXI.Rectangle(x * map.tileDim, y * map.tileDim, map.tileDim, map.tileDim),
        );
      }
    }

    const screenxtiles = map.bgTiles[0].length;
    const screenytiles = map.bgTiles[0][0].length;
    const container = new PIXI.Container();
    const allLayers = [...map.bgTiles, ...map.objectTiles];

    for (let i = 0; i < screenxtiles * screenytiles; i++) {
      const x = i % screenxtiles;
      const y = Math.floor(i / screenxtiles);
      for (const layer of allLayers) {
        const tileIndex = layer[x][y];
        if (tileIndex === -1) continue;
        const ctile = new PIXI.Sprite(tiles[tileIndex]);
        ctile.x = x * map.tileDim;
        ctile.y = y * map.tileDim;
        container.addChild(ctile);
      }
    }

    // Animated sprites (campfire, waterfall, sparkle, etc.)
    const spritesBySheet = new Map<string, typeof map.animatedSprites>();
    for (const sprite of map.animatedSprites) {
      if (!spritesBySheet.has(sprite.sheet)) spritesBySheet.set(sprite.sheet, []);
      spritesBySheet.get(sprite.sheet)!.push(sprite);
    }
    for (const [sheet, sprites] of spritesBySheet.entries()) {
      const anim = animations[sheet];
      if (!anim) continue;
      const texture = PIXI.BaseTexture.from(anim.url, { scaleMode: PIXI.SCALE_MODES.NEAREST });
      const spriteSheet = new PIXI.Spritesheet(texture, anim.spritesheet);
      spriteSheet.parse().then(() => {
        for (const s of sprites) {
          const frames = spriteSheet.animations[s.animation];
          if (!frames) continue;
          const as = new PIXI.AnimatedSprite(frames);
          as.animationSpeed = 0.1;
          as.autoUpdate = true;
          as.x = s.x; as.y = s.y; as.width = s.w; as.height = s.h;
          container.addChild(as);
          as.play();
        }
      });
    }

    container.interactive = true;
    container.hitArea = new PIXI.Rectangle(0, 0, screenxtiles * map.tileDim, screenytiles * map.tileDim);
    return container;
  },
  applyProps: (instance: any, oldProps: any, newProps: any) => {
    applyDefaultProps(instance, oldProps, newProps);
  },
});
