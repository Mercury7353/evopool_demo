// Inner PixiJS scene — tilemap, characters, AND monsters
import { useRef, useEffect, useCallback } from 'react';
import { useApp, Container, Graphics, Text } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';
import PixiViewport from './PixiViewport';
import { PixiStaticMap, type MapData } from './PixiStaticMap';
import { PixiCharacter } from './PixiCharacter';
import { characters } from '../data/characters';

// Re-export entity type for Game.tsx
export interface WEntity {
  id: string;
  charIdx: number;
  x: number; y: number;
  tx: number; ty: number;
  homeX: number; homeY: number;
  orientation: number;
  isMoving: boolean;
  emoji: string;
  label: string;
  isThinking: boolean;
  isSpeaking: boolean;
  isSelected: boolean;
}

export interface MonsterEntity {
  x: number; y: number;
  name: string;
  domain: 'math' | 'code' | 'reasoning';
  difficulty: number;
  visible: boolean;
  dying: boolean;
  hp: number;
  maxHp: number;
}

const DOMAIN_MONSTER_CLR: Record<string, number> = {
  math: 0xdc2626,
  code: 0x16a34a,
  reasoning: 0xd97706,
};

export default function PixiScene({
  width, height, worldWidth, worldHeight,
  map, entities, monster, onWarriorClick,
}: {
  width: number; height: number;
  worldWidth: number; worldHeight: number;
  map: MapData;
  entities: WEntity[];
  monster?: MonsterEntity;
  onWarriorClick: (id: string) => void;
}) {
  const app = useApp();
  const viewportRef = useRef<Viewport | undefined>();

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
      screenWidth={width} screenHeight={height}
      worldWidth={worldWidth} worldHeight={worldHeight}
      viewportRef={viewportRef}
    >
      <PixiStaticMap map={map} />

      {/* Render warriors */}
      {entities.map(e => {
        const charDef = characters[e.charIdx];
        return (
          <PixiCharacter
            key={e.id}
            textureUrl={charDef.textureUrl}
            spritesheetData={charDef.spritesheetData as any}
            x={e.x} y={e.y}
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

      {/* Render monster */}
      {monster && monster.visible && (
        <MonsterGfx monster={monster} />
      )}
    </PixiViewport>
  );
}

// ── Monster rendered as PIXI Graphics ────────────────────────
function MonsterGfx({ monster: m }: { monster: MonsterEntity }) {
  const clr = DOMAIN_MONSTER_CLR[m.domain] ?? 0xdc2626;
  const sz = 14 + m.difficulty * 3;

  const drawBody = useCallback((g: PIXI.Graphics) => {
    g.clear();

    if (m.dying) {
      g.beginFill(clr, 0.3);
    } else {
      // Shadow
      g.beginFill(0x000000, 0.2);
      g.drawEllipse(0, sz + 4, sz * 0.8, 4);
      g.endFill();

      // Body
      g.beginFill(clr, 0.9);
    }
    g.drawCircle(0, 0, sz);
    g.endFill();

    if (!m.dying) {
      // Eyes
      g.beginFill(0xffffff);
      g.drawCircle(-sz * 0.3, -sz * 0.15, sz * 0.2);
      g.drawCircle(sz * 0.3, -sz * 0.15, sz * 0.2);
      g.endFill();
      g.beginFill(0x000000);
      g.drawCircle(-sz * 0.25, -sz * 0.15, sz * 0.1);
      g.drawCircle(sz * 0.35, -sz * 0.15, sz * 0.1);
      g.endFill();

      // Horns
      g.beginFill(clr);
      g.drawPolygon([-sz * 0.5, -sz * 0.6, -sz * 0.3, -sz * 1.2, -sz * 0.1, -sz * 0.6]);
      g.drawPolygon([sz * 0.5, -sz * 0.6, sz * 0.3, -sz * 1.2, sz * 0.1, -sz * 0.6]);
      g.endFill();

      // Mouth / fangs
      g.beginFill(0x000000, 0.6);
      g.drawEllipse(0, sz * 0.3, sz * 0.4, sz * 0.15);
      g.endFill();
      g.beginFill(0xffffff);
      g.drawPolygon([-sz * 0.2, sz * 0.2, -sz * 0.1, sz * 0.45, 0, sz * 0.2]);
      g.drawPolygon([sz * 0.2, sz * 0.2, sz * 0.1, sz * 0.45, 0, sz * 0.2]);
      g.endFill();

      // HP bar
      const bw = sz * 2;
      g.beginFill(0x000000, 0.6);
      g.drawRect(-bw / 2, -sz - 12, bw, 4);
      g.endFill();
      const pct = Math.max(0, m.hp / m.maxHp);
      g.beginFill(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xfbbf24 : 0xef4444);
      g.drawRect(-bw / 2, -sz - 12, bw * pct, 4);
      g.endFill();
    }
  }, [m.dying, m.hp, m.maxHp, m.difficulty, clr, sz]);

  return (
    <Container x={m.x} y={m.y}>
      <Graphics draw={drawBody} />
      {!m.dying && (
        <Text
          x={0} y={-sz - 20}
          text={`${m.name} ⭐${m.difficulty}`}
          anchor={{ x: 0.5, y: 0.5 }}
          style={new PIXI.TextStyle({
            fontSize: 10,
            fill: '#ff6666',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
          })}
        />
      )}
    </Container>
  );
}
