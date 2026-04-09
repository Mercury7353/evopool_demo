// Inner scene component that can use useApp() (must be inside <Stage>)
import { useRef, useEffect } from 'react';
import { useApp } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import PixiViewport from './PixiViewport';
import { PixiStaticMap, type MapData } from './PixiStaticMap';
import { PixiCharacter } from './PixiCharacter';
import { characters } from '../data/characters';
import * as PIXI from 'pixi.js';

interface WEntity {
  id: string;
  charIdx: number;
  x: number; y: number;
  orientation: number;
  isMoving: boolean;
  emoji: string;
  label: string;
  isThinking: boolean;
  isSpeaking: boolean;
  isSelected: boolean;
}

export default function PixiScene({
  width, height,
  worldWidth, worldHeight,
  map,
  entities,
  onWarriorClick,
}: {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  map: MapData;
  entities: WEntity[];
  onWarriorClick: (id: string) => void;
}) {
  const app = useApp();
  const viewportRef = useRef<Viewport | undefined>();

  // Center viewport on village area on first render
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.animate({
        position: new PIXI.Point(worldWidth * 0.4, worldHeight * 0.45),
        scale: 1.5,
        time: 0,
      });
    }
  }, []);

  return (
    <PixiViewport
      app={app}
      screenWidth={width}
      screenHeight={height}
      worldWidth={worldWidth}
      worldHeight={worldHeight}
      viewportRef={viewportRef}
    >
      <PixiStaticMap map={map} />
      {entities.map(e => {
        const charDef = characters[e.charIdx];
        return (
          <PixiCharacter
            key={e.id}
            textureUrl={charDef.textureUrl}
            spritesheetData={charDef.spritesheetData as any}
            x={e.x}
            y={e.y}
            orientation={e.orientation}
            isMoving={e.isMoving}
            isThinking={e.isThinking}
            isSpeaking={e.isSpeaking}
            emoji={e.emoji}
            isSelected={e.isSelected}
            label={e.label}
            speed={charDef.speed}
            onClick={() => onWarriorClick(e.id)}
          />
        );
      })}
    </PixiViewport>
  );
}
