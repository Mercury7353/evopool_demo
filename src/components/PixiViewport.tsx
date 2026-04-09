// Adapted from ai-town (Apache 2.0) — camera pan/zoom
import { PixiComponent, useApp } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { Application } from 'pixi.js';
import { MutableRefObject, ReactNode } from 'react';

export type ViewportProps = {
  app: Application;
  viewportRef?: MutableRefObject<Viewport | undefined>;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  children?: ReactNode;
};

export default PixiComponent('Viewport', {
  create(props: ViewportProps) {
    const { app, viewportRef, ...rest } = props;
    const viewport = new Viewport({
      events: (app.renderer as any).events,
      passiveWheel: false,
      screenWidth: rest.screenWidth,
      screenHeight: rest.screenHeight,
      worldWidth: rest.worldWidth,
      worldHeight: rest.worldHeight,
    } as any);
    if (viewportRef) viewportRef.current = viewport;
    viewport
      .drag()
      .pinch({})
      .wheel()
      .decelerate()
      .clamp({ direction: 'all', underflow: 'center' })
      .setZoom(-10)
      .clampZoom({
        minScale: (1.04 * props.screenWidth) / (props.worldWidth / 2),
        maxScale: 3.0,
      });
    return viewport;
  },
  applyProps(viewport: any, _old: any, newProps: any) {
    for (const p of Object.keys(newProps)) {
      if (p !== 'app' && p !== 'viewportRef' && p !== 'children' && _old[p] !== newProps[p]) {
        viewport[p] = newProps[p];
      }
    }
  },
});
