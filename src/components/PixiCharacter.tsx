// Adapted from ai-town Character.tsx (Apache 2.0) — animated sprite character
import { BaseTexture, ISpritesheetData, Spritesheet } from 'pixi.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedSprite, Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';

export const PixiCharacter = ({
  textureUrl,
  spritesheetData,
  x, y,
  orientation,
  isMoving = false,
  isThinking = false,
  isSpeaking = false,
  emoji = '',
  isSelected = false,
  label = '',
  speed = 0.1,
  onClick,
}: {
  textureUrl: string;
  spritesheetData: ISpritesheetData;
  x: number;
  y: number;
  orientation: number;
  isMoving?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  emoji?: string;
  isSelected?: boolean;
  label?: string;
  speed?: number;
  onClick?: () => void;
}) => {
  const [spriteSheet, setSpriteSheet] = useState<Spritesheet>();
  useEffect(() => {
    const parseSheet = async () => {
      const sheet = new Spritesheet(
        BaseTexture.from(textureUrl, { scaleMode: PIXI.SCALE_MODES.NEAREST }),
        spritesheetData,
      );
      await sheet.parse();
      setSpriteSheet(sheet);
    };
    void parseSheet();
  }, [textureUrl]);

  const roundedOrientation = Math.floor(orientation / 90);
  const direction = ['right', 'down', 'left', 'up'][roundedOrientation];

  const ref = useRef<PIXI.AnimatedSprite | null>(null);
  useEffect(() => {
    if (isMoving) ref.current?.play();
  }, [direction, isMoving]);

  if (!spriteSheet) return null;

  return (
    <Container x={x} y={y} interactive={true} pointerdown={onClick} cursor="pointer">
      {/* Selection glow */}
      {isSelected && <SelectionGlow />}
      {/* Name label */}
      {label && (
        <Text
          x={0} y={-20}
          text={label}
          anchor={{ x: 0.5, y: 0.5 }}
          style={new PIXI.TextStyle({
            fontSize: 9,
            fill: '#ffffff',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 2,
          })}
        />
      )}
      {/* Status indicators */}
      {isThinking && <Text x={-20} y={-10} scale={{ x: -0.8, y: 0.8 }} text={'💭'} anchor={{ x: 0.5, y: 0.5 }} />}
      {isSpeaking && <Text x={18} y={-10} scale={0.8} text={'💬'} anchor={{ x: 0.5, y: 0.5 }} />}
      {/* Character sprite */}
      <AnimatedSprite
        ref={ref}
        isPlaying={isMoving}
        textures={spriteSheet.animations[direction]}
        animationSpeed={speed}
        anchor={{ x: 0.5, y: 0.5 }}
      />
      {/* Emoji overlay */}
      {emoji && <Text x={0} y={-28} scale={{ x: -0.8, y: 0.8 }} text={emoji} anchor={{ x: 0.5, y: 0.5 }} />}
    </Container>
  );
};

function SelectionGlow() {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.beginFill(0xffff0b, 0.5);
    g.drawRoundedRect(-12, 10, 24, 10, 100);
    g.endFill();
  }, []);
  return <Graphics draw={draw} />;
}
